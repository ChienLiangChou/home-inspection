"""
Training Data Service for preparing cleaned data for model training
"""
import random
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.training_data import TrainingData
from models.issue import Issue
from models.feedback import Feedback


class TrainingDataService:
    def __init__(self, db: Session):
        self.db = db
    
    def prepare_training_dataset(
        self,
        min_quality_score: float = 0.4,
        train_ratio: float = 0.7,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        random_seed: int = 42
    ) -> Dict[str, Any]:
        """
        Prepare training dataset from cleaned data
        Returns train/val/test splits
        """
        # Validate ratios
        if abs(train_ratio + val_ratio + test_ratio - 1.0) > 0.01:
            raise ValueError("Ratios must sum to 1.0")
        
        # Get cleaned training data
        cleaned_data = self.db.query(TrainingData).filter(
            and_(
                TrainingData.cleaned_status == "cleaned",
                TrainingData.quality_score >= min_quality_score
            )
        ).all()
        
        if len(cleaned_data) < 10:
            return {
                "status": "insufficient_data",
                "message": f"Not enough cleaned data (need at least 10, got {len(cleaned_data)})",
                "train": [],
                "val": [],
                "test": []
            }
        
        # Shuffle with seed
        random.seed(random_seed)
        shuffled = list(cleaned_data)
        random.shuffle(shuffled)
        
        # Split
        total = len(shuffled)
        train_end = int(total * train_ratio)
        val_end = train_end + int(total * val_ratio)
        
        train_data = shuffled[:train_end]
        val_data = shuffled[train_end:val_end]
        test_data = shuffled[val_end:]
        
        return {
            "status": "success",
            "total": total,
            "train": self._format_dataset(train_data),
            "val": self._format_dataset(val_data),
            "test": self._format_dataset(test_data),
            "statistics": self._calculate_statistics(train_data, val_data, test_data)
        }
    
    def _format_dataset(self, training_data_list: List[TrainingData]) -> List[Dict[str, Any]]:
        """Format training data for model training"""
        formatted = []
        
        for td in training_data_list:
            issue = self.db.query(Issue).filter(Issue.id == td.issue_id).first()
            if not issue:
                continue
            
            # Extract features
            features = self._extract_features(issue, td)
            
            # Extract labels
            labels = td.labels or {}
            
            formatted.append({
                "id": td.id,
                "issue_id": td.issue_id,
                "features": features,
                "labels": labels,
                "quality_score": td.quality_score,
                "standardized_data": td.standardized_data
            })
        
        return formatted
    
    def _extract_features(
        self,
        issue: Issue,
        training_data: TrainingData
    ) -> Dict[str, Any]:
        """Extract features for model training"""
        features = {
            # Issue features
            "issue_type": training_data.standardized_data.get("issue_type", ""),
            "severity": training_data.standardized_data.get("severity", "medium"),
            "location": training_data.standardized_data.get("location", ""),
            "component": training_data.standardized_data.get("component", ""),
            
            # Text features (length, word count)
            "description_length": len(issue.description) if issue.description else 0,
            "description_word_count": len(issue.description.split()) if issue.description else 0,
            "recommendation_length": len(issue.recommendation) if issue.recommendation else 0,
            
            # Metadata features
            "has_image": issue.image_data is not None,
            "has_location": issue.location is not None,
            "has_component": issue.component is not None,
            "has_recommendation": issue.recommendation is not None,
            
            # Feedback features
            "user_validated": issue.user_validated,
            "expert_reviewed": issue.expert_reviewed,
            "has_actual_severity": issue.actual_severity is not None,
            
            # Time features
            "days_since_detection": (datetime.utcnow() - issue.detected_at).days if issue.detected_at else 0,
            
            # Quality features
            "learning_score": issue.learning_score or 0.0,
            "quality_score": training_data.quality_score or 0.0
        }
        
        return features
    
    def _calculate_statistics(
        self,
        train: List[TrainingData],
        val: List[TrainingData],
        test: List[TrainingData]
    ) -> Dict[str, Any]:
        """Calculate dataset statistics"""
        def get_label_distribution(data_list: List[TrainingData]) -> Dict[str, Dict[str, int]]:
            distributions = {
                "issue_type": {},
                "severity": {},
                "recommendation_category": {}
            }
            
            for td in data_list:
                labels = td.labels or {}
                if "issue_type" in labels:
                    issue_type = labels["issue_type"]
                    distributions["issue_type"][issue_type] = distributions["issue_type"].get(issue_type, 0) + 1
                
                if "severity" in labels:
                    severity = labels["severity"]
                    distributions["severity"][severity] = distributions["severity"].get(severity, 0) + 1
                
                if "recommendation_category" in labels:
                    category = labels["recommendation_category"]
                    distributions["recommendation_category"][category] = distributions["recommendation_category"].get(category, 0) + 1
            
            return distributions
        
        return {
            "train": {
                "count": len(train),
                "label_distribution": get_label_distribution(train),
                "avg_quality": sum(td.quality_score or 0 for td in train) / len(train) if train else 0
            },
            "val": {
                "count": len(val),
                "label_distribution": get_label_distribution(val),
                "avg_quality": sum(td.quality_score or 0 for td in val) / len(val) if val else 0
            },
            "test": {
                "count": len(test),
                "label_distribution": get_label_distribution(test),
                "avg_quality": sum(td.quality_score or 0 for td in test) / len(test) if test else 0
            }
        }
    
    def get_training_data_count(self, min_quality: float = 0.4) -> int:
        """Get count of available training data"""
        return self.db.query(TrainingData).filter(
            and_(
                TrainingData.cleaned_status == "cleaned",
                TrainingData.quality_score >= min_quality
            )
        ).count()



