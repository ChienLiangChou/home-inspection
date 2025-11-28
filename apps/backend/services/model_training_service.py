"""
Model Training Service for self-learning system
Handles prompt optimization, severity prediction model, and recommendation generation
"""
import json
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.model_version import ModelVersion
from models.training_data import TrainingData
from models.issue import Issue
from models.feedback import Feedback
from services.training_data_service import TrainingDataService


class ModelTrainingService:
    def __init__(self, db: Session):
        self.db = db
        self.training_data_service = TrainingDataService(db)
    
    def optimize_detection_prompt(self, use_latest_data: bool = True) -> Dict[str, Any]:
        """
        Optimize detection prompt based on feedback data
        Uses few-shot learning with correct examples
        """
        try:
            # Get validated issues (correct detections)
            correct_issues = self.db.query(Issue).filter(
                and_(
                    Issue.user_validated == True,
                    Issue.user_validation_result == "correct"
                )
            ).limit(10).all()
            
            # Get incorrect detections for analysis
            incorrect_issues = self.db.query(Issue).filter(
                and_(
                    Issue.user_validated == True,
                    Issue.user_validation_result == "incorrect"
                )
            ).limit(5).all()
            
            # Build few-shot examples
            few_shot_examples = []
            for issue in correct_issues[:5]:  # Use top 5 as examples
                few_shot_examples.append({
                    "issue_type": issue.issue_type,
                    "severity": issue.severity,
                    "description": issue.description[:200],  # Truncate
                    "location": issue.location,
                    "component": issue.component
                })
            
            # Analyze error patterns
            error_patterns = []
            for issue in incorrect_issues:
                feedback = self.db.query(Feedback).filter(
                    Feedback.issue_id == issue.id,
                    Feedback.feedback_type == "user_validation"
                ).first()
                
                if feedback and feedback.differences:
                    error_patterns.append(feedback.differences)
            
            # Build optimized prompt
            optimized_prompt = self._build_optimized_prompt(few_shot_examples, error_patterns)
            
            # Save as model version
            version = self._save_prompt_model("detection", optimized_prompt, {
                "correct_examples": len(correct_issues),
                "incorrect_examples": len(incorrect_issues),
                "few_shot_count": len(few_shot_examples)
            })
            
            return {
                "status": "success",
                "version": version.version,
                "prompt_template": optimized_prompt,
                "examples_used": len(few_shot_examples),
                "error_patterns_analyzed": len(error_patterns)
            }
            
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def _build_optimized_prompt(
        self,
        few_shot_examples: List[Dict[str, Any]],
        error_patterns: List[Dict[str, Any]]
    ) -> str:
        """Build optimized prompt template"""
        
        base_prompt = """請分析這張房屋檢查照片，檢測以下問題：
1. 結構問題（裂縫、損壞、變形）
2. 濕度問題（水漬、黴菌、潮濕跡象）
3. 管道問題（洩漏、腐蝕、堵塞跡象）
4. 電氣問題（電線暴露、面板問題）
5. 屋頂問題（損壞、缺失、老化）
6. 其他安全隱患

請以 JSON 格式返回，包含：
- detected_issues: 檢測到的問題列表，每個問題包含 type, severity (high/medium/low), description, recommendation
- overall_assessment: 整體評估
- confidence: 分析信心度 (0-1)

如果沒有檢測到問題，返回空列表。"""
        
        # Add few-shot examples if available
        if few_shot_examples:
            examples_text = "\n\n範例（正確檢測案例）：\n"
            for i, example in enumerate(few_shot_examples, 1):
                examples_text += f"\n範例 {i}:\n"
                examples_text += f"- 問題類型: {example.get('issue_type')}\n"
                examples_text += f"- 嚴重程度: {example.get('severity')}\n"
                examples_text += f"- 描述: {example.get('description')}\n"
                if example.get('location'):
                    examples_text += f"- 位置: {example.get('location')}\n"
            
            base_prompt = examples_text + "\n\n" + base_prompt
        
        return base_prompt
    
    def train_severity_model(
        self,
        use_latest_data: bool = True,
        model_type: str = "random_forest"
    ) -> Dict[str, Any]:
        """
        Train severity prediction model using traditional ML
        """
        try:
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.model_selection import cross_val_score
            import numpy as np
            
            # Prepare training data
            dataset = self.training_data_service.prepare_training_dataset(
                min_quality_score=0.4
            )
            
            if dataset["status"] != "success":
                return {
                    "status": "failed",
                    "error": dataset.get("message", "Failed to prepare dataset")
                }
            
            train_data = dataset["train"]
            val_data = dataset["val"]
            
            if len(train_data) < 10:
                return {
                    "status": "insufficient_data",
                    "message": f"Not enough training data (need at least 10, got {len(train_data)})"
                }
            
            # Extract features and labels
            X_train, y_train = self._prepare_ml_features(train_data)
            X_val, y_val = self._prepare_ml_features(val_data)
            
            if not X_train or not y_train:
                return {
                    "status": "failed",
                    "error": "Failed to extract features"
                }
            
            # Train model
            if model_type == "random_forest":
                model = RandomForestClassifier(n_estimators=100, random_state=42)
            else:
                model = RandomForestClassifier(n_estimators=100, random_state=42)
            
            model.fit(X_train, y_train)
            
            # Evaluate
            train_score = model.score(X_train, y_train)
            val_score = model.score(X_val, y_val) if X_val else 0.0
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train, y_train, cv=min(5, len(X_train) // 2))
            cv_mean = np.mean(cv_scores)
            
            # Save model (for now, just save metadata - actual model saving would require joblib)
            version = self._save_ml_model(
                "severity",
                model_type,
                {
                    "train_score": float(train_score),
                    "val_score": float(val_score),
                    "cv_mean": float(cv_mean),
                    "cv_std": float(np.std(cv_scores)),
                    "train_samples": len(X_train),
                    "val_samples": len(X_val)
                }
            )
            
            return {
                "status": "success",
                "version": version.version,
                "model_type": model_type,
                "train_accuracy": float(train_score),
                "val_accuracy": float(val_score),
                "cv_mean": float(cv_mean),
                "train_samples": len(X_train),
                "val_samples": len(X_val)
            }
            
        except ImportError:
            return {
                "status": "failed",
                "error": "scikit-learn not installed"
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def _prepare_ml_features(self, data: List[Dict[str, Any]]) -> Tuple[List[List[float]], List[str]]:
        """Prepare features for ML model"""
        X = []
        y = []
        
        severity_map = {"low": 0, "medium": 1, "high": 2}
        
        for item in data:
            features = item.get("features", {})
            labels = item.get("labels", {})
            
            # Extract feature vector
            feature_vector = [
                features.get("description_length", 0),
                features.get("description_word_count", 0),
                features.get("recommendation_length", 0),
                1.0 if features.get("has_image") else 0.0,
                1.0 if features.get("has_location") else 0.0,
                1.0 if features.get("has_component") else 0.0,
                1.0 if features.get("has_recommendation") else 0.0,
                1.0 if features.get("user_validated") else 0.0,
                1.0 if features.get("expert_reviewed") else 0.0,
                features.get("days_since_detection", 0),
                features.get("learning_score", 0.0),
                features.get("quality_score", 0.0)
            ]
            
            # Issue type encoding (simple hash)
            issue_type = features.get("issue_type", "")
            issue_type_hash = hash(issue_type) % 100  # Simple encoding
            feature_vector.append(float(issue_type_hash))
            
            X.append(feature_vector)
            
            # Label (severity)
            severity = labels.get("severity", "medium")
            y.append(severity)
        
        return X, y
    
    def optimize_recommendation_prompt(self, use_latest_data: bool = True) -> Dict[str, Any]:
        """
        Optimize recommendation generation prompt
        """
        try:
            # Get issues with good recommendations (from expert feedback)
            good_recommendations = self.db.query(Issue).filter(
                and_(
                    Issue.expert_reviewed == True,
                    Issue.expert_feedback.isnot(None)
                )
            ).limit(10).all()
            
            # Build prompt with examples
            examples = []
            for issue in good_recommendations[:5]:
                expert_feedback = issue.expert_feedback or {}
                corrected_rec = expert_feedback.get("corrected_recommendation")
                if corrected_rec:
                    examples.append({
                        "issue_type": issue.issue_type,
                        "severity": issue.actual_severity or issue.severity,
                        "recommendation": corrected_rec
                    })
            
            optimized_prompt = self._build_recommendation_prompt(examples)
            
            version = self._save_prompt_model("recommendation", optimized_prompt, {
                "examples_used": len(examples)
            })
            
            return {
                "status": "success",
                "version": version.version,
                "prompt_template": optimized_prompt,
                "examples_used": len(examples)
            }
            
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def _build_recommendation_prompt(self, examples: List[Dict[str, Any]]) -> str:
        """Build recommendation prompt"""
        base_prompt = """基於以下問題信息，生成專業的修復建議：

問題類型: {issue_type}
嚴重程度: {severity}
描述: {description}
位置: {location}
組件: {component}

請提供：
1. 問題分析
2. 修復建議（具體、可操作）
3. 優先級說明
4. 注意事項"""
        
        if examples:
            examples_text = "\n\n範例建議：\n"
            for i, example in enumerate(examples, 1):
                examples_text += f"\n範例 {i}:\n"
                examples_text += f"問題: {example.get('issue_type')} ({example.get('severity')})\n"
                examples_text += f"建議: {example.get('recommendation')}\n"
            
            base_prompt = examples_text + "\n\n" + base_prompt
        
        return base_prompt
    
    def _save_prompt_model(
        self,
        model_type: str,
        prompt_template: str,
        performance_metrics: Dict[str, Any]
    ) -> ModelVersion:
        """Save prompt-based model version"""
        # Get latest version number
        latest = self.db.query(ModelVersion).filter(
            ModelVersion.model_type == model_type
        ).order_by(ModelVersion.id.desc()).first()
        
        if latest:
            version_num = int(latest.version.replace("v", "").split(".")[0]) + 1
            new_version = f"v{version_num}.0"
        else:
            new_version = "v1.0"
        
        model_version = ModelVersion(
            model_type=model_type,
            version=new_version,
            training_data_range={
                "date": datetime.utcnow().isoformat(),
                "count": self.training_data_service.get_training_data_count()
            },
            performance_metrics=performance_metrics,
            prompt_template=prompt_template,
            deployed=False
        )
        
        self.db.add(model_version)
        self.db.commit()
        self.db.refresh(model_version)
        
        return model_version
    
    def _save_ml_model(
        self,
        model_type: str,
        model_algorithm: str,
        performance_metrics: Dict[str, Any]
    ) -> ModelVersion:
        """Save ML model version"""
        # Get latest version number
        latest = self.db.query(ModelVersion).filter(
            ModelVersion.model_type == model_type
        ).order_by(ModelVersion.id.desc()).first()
        
        if latest:
            version_num = int(latest.version.replace("v", "").split(".")[0]) + 1
            new_version = f"v{version_num}.0"
        else:
            new_version = "v1.0"
        
        model_version = ModelVersion(
            model_type=model_type,
            version=new_version,
            training_data_range={
                "date": datetime.utcnow().isoformat(),
                "count": self.training_data_service.get_training_data_count()
            },
            performance_metrics=performance_metrics,
            model_file_path=f"models/{model_type}_{new_version}.pkl",  # Placeholder
            deployed=False
        )
        
        self.db.add(model_version)
        self.db.commit()
        self.db.refresh(model_version)
        
        return model_version
    
    def get_latest_model(self, model_type: str) -> Optional[ModelVersion]:
        """Get latest model version"""
        return self.db.query(ModelVersion).filter(
            ModelVersion.model_type == model_type
        ).order_by(ModelVersion.id.desc()).first()
    
    def deploy_model(self, version_id: int) -> Dict[str, Any]:
        """Deploy a model version"""
        model_version = self.db.query(ModelVersion).filter(
            ModelVersion.id == version_id
        ).first()
        
        if not model_version:
            return {
                "status": "failed",
                "error": "Model version not found"
            }
        
        # Un-deploy current version
        current_deployed = self.db.query(ModelVersion).filter(
            and_(
                ModelVersion.model_type == model_version.model_type,
                ModelVersion.deployed == True
            )
        ).all()
        
        for deployed in current_deployed:
            deployed.deployed = False
            deployed.deployed_at = None
        
        # Deploy new version
        model_version.deployed = True
        model_version.deployed_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "status": "success",
            "version": model_version.version,
            "model_type": model_version.model_type
        }

