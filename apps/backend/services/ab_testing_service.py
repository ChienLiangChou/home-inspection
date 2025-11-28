"""
A/B Testing Service for comparing model versions
"""
import random
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime

from models.model_version import ModelVersion
from models.issue import Issue
from services.performance_evaluation_service import PerformanceEvaluationService


class ABTestingService:
    def __init__(self, db: Session):
        self.db = db
        self.performance_service = PerformanceEvaluationService(db)
    
    def start_ab_test(
        self,
        model_type: str,
        version_a_id: int,
        version_b_id: int,
        traffic_split: float = 0.5  # 50/50 split
    ) -> Dict[str, Any]:
        """
        Start A/B test between two model versions
        """
        version_a = self.db.query(ModelVersion).filter(ModelVersion.id == version_a_id).first()
        version_b = self.db.query(ModelVersion).filter(ModelVersion.id == version_b_id).first()
        
        if not version_a or not version_b:
            return {
                "status": "failed",
                "error": "One or both model versions not found"
            }
        
        if version_a.model_type != model_type or version_b.model_type != model_type:
            return {
                "status": "failed",
                "error": "Model types don't match"
            }
        
        # Create test record (stored in metadata for now)
        test_config = {
            "model_type": model_type,
            "version_a": version_a.version,
            "version_b": version_b.version,
            "traffic_split": traffic_split,
            "started_at": datetime.utcnow().isoformat(),
            "status": "active"
        }
        
        return {
            "status": "success",
            "test_id": f"ab_test_{model_type}_{datetime.utcnow().timestamp()}",
            "config": test_config
        }
    
    def assign_to_variant(
        self,
        test_id: str,
        issue_id: int
    ) -> str:
        """
        Assign an issue to A or B variant based on traffic split
        Returns: "A" or "B"
        """
        # Simple hash-based assignment for consistency
        hash_value = hash(f"{test_id}_{issue_id}") % 100
        traffic_split = 50  # Default 50/50, can be configured
        
        if hash_value < traffic_split:
            return "A"
        else:
            return "B"
    
    def get_ab_test_results(
        self,
        test_id: str,
        model_type: str
    ) -> Dict[str, Any]:
        """
        Get A/B test results
        """
        # For now, compare current deployed models
        # In production, would track which variant was used for each prediction
        
        deployed_models = self.db.query(ModelVersion).filter(
            ModelVersion.model_type == model_type,
            ModelVersion.deployed == True
        ).all()
        
        if len(deployed_models) < 2:
            return {
                "status": "insufficient_data",
                "message": "Need at least 2 deployed models for comparison"
            }
        
        # Get performance for each
        results = []
        for model in deployed_models:
            perf = self._get_model_performance(model)
            results.append({
                "version": model.version,
                "performance": perf,
                "deployed_at": model.deployed_at.isoformat() if model.deployed_at else None
            })
        
        return {
            "status": "success",
            "test_id": test_id,
            "results": results,
            "recommendation": self._recommend_best_model(results)
        }
    
    def _get_model_performance(self, model: ModelVersion) -> Dict[str, Any]:
        """Get performance metrics for a model"""
        metrics = model.performance_metrics or {}
        
        # Extract key metrics
        return {
            "accuracy": metrics.get("accuracy", metrics.get("val_accuracy", 0.0)),
            "precision": metrics.get("precision", 0.0),
            "recall": metrics.get("recall", 0.0),
            "f1_score": metrics.get("f1_score", metrics.get("cv_mean", 0.0)),
            "train_samples": metrics.get("train_samples", 0)
        }
    
    def _recommend_best_model(self, results: List[Dict[str, Any]]) -> Optional[str]:
        """Recommend which model performs best"""
        if not results:
            return None
        
        # Score each model (weighted average)
        scored = []
        for result in results:
            perf = result["performance"]
            score = (
                perf.get("accuracy", 0) * 0.4 +
                perf.get("f1_score", 0) * 0.4 +
                perf.get("precision", 0) * 0.1 +
                perf.get("recall", 0) * 0.1
            )
            scored.append({
                "version": result["version"],
                "score": score
            })
        
        # Return best version
        best = max(scored, key=lambda x: x["score"])
        return best["version"]
    
    def auto_switch_best_model(
        self,
        model_type: str,
        improvement_threshold: float = 0.05  # 5% improvement required
    ) -> Dict[str, Any]:
        """
        Automatically switch to best performing model if improvement > threshold
        """
        # Get all deployed models
        deployed_models = self.db.query(ModelVersion).filter(
            ModelVersion.model_type == model_type,
            ModelVersion.deployed == True
        ).all()
        
        if len(deployed_models) < 2:
            return {
                "status": "insufficient_models",
                "message": "Need at least 2 deployed models"
            }
        
        # Get all models (including non-deployed)
        all_models = self.db.query(ModelVersion).filter(
            ModelVersion.model_type == model_type
        ).order_by(ModelVersion.id.desc()).limit(5).all()
        
        if not all_models:
            return {
                "status": "failed",
                "error": "No models found"
            }
        
        # Find best model
        best_model = None
        best_score = -1
        
        for model in all_models:
            perf = self._get_model_performance(model)
            score = perf.get("f1_score", perf.get("accuracy", 0))
            
            if score > best_score:
                best_score = score
                best_model = model
        
        # Check if best model is already deployed
        if best_model and best_model.deployed:
            return {
                "status": "no_change",
                "message": "Best model already deployed",
                "version": best_model.version
            }
        
        # Check improvement threshold
        current_deployed = deployed_models[0] if deployed_models else None
        if current_deployed:
            current_perf = self._get_model_performance(current_deployed)
            current_score = current_perf.get("f1_score", current_perf.get("accuracy", 0))
            
            improvement = (best_score - current_score) / current_score if current_score > 0 else 0
            
            if improvement < improvement_threshold:
                return {
                    "status": "below_threshold",
                    "message": f"Improvement ({improvement:.2%}) below threshold ({improvement_threshold:.2%})",
                    "current_version": current_deployed.version,
                    "best_version": best_model.version if best_model else None
                }
        
        # Deploy best model
        if best_model:
            from services.model_training_service import ModelTrainingService
            training_service = ModelTrainingService(self.db)
            result = training_service.deploy_model(best_model.id)
            
            return {
                "status": "switched",
                "message": f"Switched to {best_model.version}",
                "previous_version": current_deployed.version if current_deployed else None,
                "new_version": best_model.version,
                "improvement": improvement if current_deployed else None
            }
        
        return {
            "status": "failed",
            "error": "Could not determine best model"
        }



