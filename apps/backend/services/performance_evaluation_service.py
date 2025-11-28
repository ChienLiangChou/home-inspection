"""
Performance Evaluation Service for self-learning system
Evaluates model performance metrics: precision, recall, F1, accuracy
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from collections import defaultdict
from datetime import datetime

from models.issue import Issue
from models.feedback import Feedback
from models.model_version import ModelVersion


class PerformanceEvaluationService:
    def __init__(self, db: Session):
        self.db = db
    
    def evaluate_detection_performance(
        self,
        model_version: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate issue detection performance
        Returns: precision, recall, F1, confusion matrix
        """
        # Get validated issues (ground truth)
        validated_issues = self.db.query(Issue).filter(
            Issue.user_validated == True
        ).all()
        
        if not validated_issues:
            return {
                "status": "insufficient_data",
                "message": "No validated issues found"
            }
        
        # Calculate metrics
        tp = 0  # True Positives: detected and validated as correct
        fp = 0  # False Positives: detected but validated as incorrect
        fn = 0  # False Negatives: not detected but should have been (hard to measure)
        tn = 0  # True Negatives: not detected and correctly not detected (hard to measure)
        
        confusion_matrix = {
            "correct": 0,
            "incorrect": 0,
            "partial": 0
        }
        
        for issue in validated_issues:
            validation_result = issue.user_validation_result
            
            if validation_result == "correct":
                tp += 1
                confusion_matrix["correct"] += 1
            elif validation_result == "incorrect":
                fp += 1
                confusion_matrix["incorrect"] += 1
            elif validation_result == "partial":
                tp += 0.5  # Partial credit
                fp += 0.5
                confusion_matrix["partial"] += 1
        
        # Calculate metrics
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = tp / len(validated_issues) if validated_issues else 0.0
        
        return {
            "status": "success",
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "accuracy": float(accuracy),
            "confusion_matrix": confusion_matrix,
            "total_validated": len(validated_issues),
            "true_positives": int(tp),
            "false_positives": int(fp)
        }
    
    def evaluate_severity_prediction(
        self,
        model_version: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate severity prediction accuracy
        """
        # Get issues with actual severity (from feedback)
        issues_with_actual = self.db.query(Issue).filter(
            and_(
                Issue.actual_severity.isnot(None),
                Issue.severity.isnot(None)
            )
        ).all()
        
        if not issues_with_actual:
            return {
                "status": "insufficient_data",
                "message": "No issues with actual severity found"
            }
        
        # Calculate accuracy
        correct = 0
        total = len(issues_with_actual)
        
        severity_confusion = defaultdict(lambda: defaultdict(int))
        
        for issue in issues_with_actual:
            predicted = issue.severity
            actual = issue.actual_severity
            
            severity_confusion[predicted][actual] += 1
            
            if predicted == actual:
                correct += 1
        
        accuracy = correct / total if total > 0 else 0.0
        
        # Per-class metrics
        per_class_metrics = {}
        for severity in ["low", "medium", "high"]:
            predicted_count = sum(severity_confusion[severity].values())
            actual_count = sum(severity_confusion[s][severity] for s in ["low", "medium", "high"])
            correct_count = severity_confusion[severity][severity]
            
            precision = correct_count / predicted_count if predicted_count > 0 else 0.0
            recall = correct_count / actual_count if actual_count > 0 else 0.0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
            
            per_class_metrics[severity] = {
                "precision": float(precision),
                "recall": float(recall),
                "f1_score": float(f1),
                "support": actual_count
            }
        
        return {
            "status": "success",
            "accuracy": float(accuracy),
            "total": total,
            "correct": correct,
            "confusion_matrix": dict(severity_confusion),
            "per_class_metrics": per_class_metrics
        }
    
    def evaluate_recommendation_quality(
        self,
        model_version: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate recommendation quality
        """
        # Get issues with expert feedback
        expert_reviewed = self.db.query(Issue).filter(
            Issue.expert_reviewed == True
        ).all()
        
        if not expert_reviewed:
            return {
                "status": "insufficient_data",
                "message": "No expert-reviewed issues found"
            }
        
        # Count recommendations that were corrected
        corrected_count = 0
        total = len(expert_reviewed)
        
        for issue in expert_reviewed:
            expert_feedback = issue.expert_feedback or {}
            if expert_feedback.get("corrected_recommendation"):
                corrected_count += 1
        
        # Calculate quality score
        quality_score = 1.0 - (corrected_count / total) if total > 0 else 0.0
        
        # Resolution adoption rate
        resolved_with_recommendation = self.db.query(Issue).filter(
            and_(
                Issue.resolution_status == "resolved",
                Issue.recommendation.isnot(None)
            )
        ).count()
        
        total_resolved = self.db.query(Issue).filter(
            Issue.resolution_status == "resolved"
        ).count()
        
        adoption_rate = resolved_with_recommendation / total_resolved if total_resolved > 0 else 0.0
        
        return {
            "status": "success",
            "quality_score": float(quality_score),
            "expert_reviewed_count": total,
            "corrected_count": corrected_count,
            "adoption_rate": float(adoption_rate),
            "resolved_with_recommendation": resolved_with_recommendation,
            "total_resolved": total_resolved
        }
    
    def get_overall_performance(self) -> Dict[str, Any]:
        """
        Get overall performance metrics for all models
        """
        detection = self.evaluate_detection_performance()
        severity = self.evaluate_severity_prediction()
        recommendation = self.evaluate_recommendation_quality()
        
        return {
            "detection": detection,
            "severity": severity,
            "recommendation": recommendation,
            "timestamp": str(datetime.now())
        }
    
    def compare_model_versions(
        self,
        model_type: str,
        version1: str,
        version2: str
    ) -> Dict[str, Any]:
        """
        Compare performance of two model versions
        """
        # Get model versions
        model1 = self.db.query(ModelVersion).filter(
            and_(
                ModelVersion.model_type == model_type,
                ModelVersion.version == version1
            )
        ).first()
        
        model2 = self.db.query(ModelVersion).filter(
            and_(
                ModelVersion.model_type == model_type,
                ModelVersion.version == version2
            )
        ).first()
        
        if not model1 or not model2:
            return {
                "status": "failed",
                "error": "One or both model versions not found"
            }
        
        metrics1 = model1.performance_metrics or {}
        metrics2 = model2.performance_metrics or {}
        
        comparison = {
            "version1": {
                "version": version1,
                "metrics": metrics1
            },
            "version2": {
                "version": version2,
                "metrics": metrics2
            },
            "improvement": {}
        }
        
        # Calculate improvements
        for key in set(list(metrics1.keys()) + list(metrics2.keys())):
            val1 = metrics1.get(key, 0)
            val2 = metrics2.get(key, 0)
            
            if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                improvement = val2 - val1
                improvement_pct = (improvement / val1 * 100) if val1 != 0 else 0
                comparison["improvement"][key] = {
                    "absolute": float(improvement),
                    "percentage": float(improvement_pct)
                }
        
        return comparison

