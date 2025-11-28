"""
Continuous Learning Service for automated learning cycle
"""
from typing import Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from services.data_cleaning_service import DataCleaningService
from services.model_training_service import ModelTrainingService
from services.performance_evaluation_service import PerformanceEvaluationService
from services.ab_testing_service import ABTestingService
from models.issue import Issue
from models.feedback import Feedback
from models.training_data import TrainingData


class ContinuousLearningService:
    def __init__(self, db: Session):
        self.db = db
        self.cleaning_service = DataCleaningService(db)
        self.training_service = ModelTrainingService(db)
        self.performance_service = PerformanceEvaluationService(db)
        self.ab_testing_service = ABTestingService(db)
    
    def collect_new_feedback(self) -> Dict[str, Any]:
        """
        Collect new feedback data (run daily)
        """
        # Count new feedback in last 24 hours
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        new_feedbacks = self.db.query(Feedback).filter(
            Feedback.created_at >= yesterday
        ).count()
        
        new_validations = self.db.query(Issue).filter(
            and_(
                Issue.user_validated == True,
                Issue.detected_at >= yesterday
            )
        ).count()
        
        new_expert_reviews = self.db.query(Issue).filter(
            and_(
                Issue.expert_reviewed == True,
                Issue.detected_at >= yesterday
            )
        ).count()
        
        return {
            "status": "success",
            "new_feedbacks": new_feedbacks,
            "new_validations": new_validations,
            "new_expert_reviews": new_expert_reviews,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def trigger_data_cleaning(self, batch_size: int = 500) -> Dict[str, Any]:
        """
        Trigger data cleaning (run weekly)
        """
        result = self.cleaning_service.clean_issues(
            batch_size=batch_size,
            force_reclean=False
        )
        
        return {
            "status": result["status"],
            "processed": result.get("processed", 0),
            "cleaned": result.get("cleaned", 0),
            "failed": result.get("failed", 0),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def evaluate_retraining_need(
        self,
        performance_drop_threshold: float = 0.05,  # 5% drop
        min_new_feedback: int = 100
    ) -> Dict[str, Any]:
        """
        Evaluate if model retraining is needed
        """
        # Check performance drop
        current_performance = self.performance_service.get_overall_performance()
        
        # Get latest model versions
        detection_model = self.training_service.get_latest_model("detection")
        severity_model = self.training_service.get_latest_model("severity")
        recommendation_model = self.training_service.get_latest_model("recommendation")
        
        performance_drops = {}
        needs_retraining = {}
        
        # Check detection model
        if detection_model:
            detection_metrics = current_performance.get("detection", {})
            if detection_metrics.get("status") == "success":
                f1 = detection_metrics.get("f1_score", 0)
                # Compare with model's stored metrics
                stored_metrics = detection_model.performance_metrics or {}
                stored_f1 = stored_metrics.get("f1_score", 1.0)  # Assume 1.0 if not stored
                
                drop = (stored_f1 - f1) / stored_f1 if stored_f1 > 0 else 0
                performance_drops["detection"] = drop
                needs_retraining["detection"] = drop > performance_drop_threshold
        
        # Check severity model
        if severity_model:
            severity_metrics = current_performance.get("severity", {})
            if severity_metrics.get("status") == "success":
                accuracy = severity_metrics.get("accuracy", 0)
                stored_metrics = severity_model.performance_metrics or {}
                stored_accuracy = stored_metrics.get("val_accuracy", 1.0)
                
                drop = (stored_accuracy - accuracy) / stored_accuracy if stored_accuracy > 0 else 0
                performance_drops["severity"] = drop
                needs_retraining["severity"] = drop > performance_drop_threshold
        
        # Check recommendation model
        if recommendation_model:
            rec_metrics = current_performance.get("recommendation", {})
            if rec_metrics.get("status") == "success":
                quality = rec_metrics.get("quality_score", 0)
                stored_metrics = recommendation_model.performance_metrics or {}
                stored_quality = stored_metrics.get("quality_score", 1.0)
                
                drop = (stored_quality - quality) / stored_quality if stored_quality > 0 else 0
                performance_drops["recommendation"] = drop
                needs_retraining["recommendation"] = drop > performance_drop_threshold
        
        # Check new feedback count
        yesterday = datetime.utcnow() - timedelta(days=7)  # Last week
        new_feedback_count = self.db.query(Feedback).filter(
            Feedback.created_at >= yesterday
        ).count()
        
        has_enough_data = new_feedback_count >= min_new_feedback
        
        return {
            "status": "success",
            "performance_drops": performance_drops,
            "needs_retraining": needs_retraining,
            "new_feedback_count": new_feedback_count,
            "has_enough_data": has_enough_data,
            "should_retrain": any(needs_retraining.values()) and has_enough_data
        }
    
    def run_learning_cycle(self) -> Dict[str, Any]:
        """
        Run complete learning cycle:
        1. Collect new feedback
        2. Clean data
        3. Evaluate retraining need
        4. Train if needed
        5. A/B test
        6. Deploy best model
        """
        results = {
            "cycle_started_at": datetime.utcnow().isoformat(),
            "steps": {}
        }
        
        try:
            # Step 1: Collect feedback
            feedback_result = self.collect_new_feedback()
            results["steps"]["collect_feedback"] = feedback_result
            
            # Step 2: Clean data (if new feedback exists)
            if feedback_result.get("new_feedbacks", 0) > 0:
                cleaning_result = self.trigger_data_cleaning()
                results["steps"]["data_cleaning"] = cleaning_result
            else:
                results["steps"]["data_cleaning"] = {"status": "skipped", "reason": "No new feedback"}
            
            # Step 3: Evaluate retraining need
            evaluation = self.evaluate_retraining_need()
            results["steps"]["evaluate_retraining"] = evaluation
            
            # Step 4: Train models if needed
            if evaluation.get("should_retrain"):
                training_results = {}
                
                for model_type, needs_training in evaluation.get("needs_retraining", {}).items():
                    if needs_training:
                        if model_type == "detection":
                            train_result = self.training_service.optimize_detection_prompt()
                        elif model_type == "severity":
                            train_result = self.training_service.train_severity_model()
                        elif model_type == "recommendation":
                            train_result = self.training_service.optimize_recommendation_prompt()
                        else:
                            train_result = {"status": "skipped", "reason": "Unknown model type"}
                        
                        training_results[model_type] = train_result
                
                results["steps"]["training"] = training_results
                
                # Step 5: Auto-switch to best models
                switch_results = {}
                for model_type in ["detection", "severity", "recommendation"]:
                    switch_result = self.ab_testing_service.auto_switch_best_model(model_type)
                    switch_results[model_type] = switch_result
                
                results["steps"]["model_deployment"] = switch_results
            else:
                results["steps"]["training"] = {"status": "skipped", "reason": "No retraining needed"}
            
            results["status"] = "completed"
            results["cycle_completed_at"] = datetime.utcnow().isoformat()
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            results["cycle_completed_at"] = datetime.utcnow().isoformat()
        
        return results



