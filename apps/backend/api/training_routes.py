"""
API routes for model training operations
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field

from database.connection import get_db
from services.model_training_service import ModelTrainingService
from models.model_version import ModelVersion
from sqlalchemy import desc
from datetime import datetime

router = APIRouter(prefix="/api/training", tags=["training"])


class TrainRequest(BaseModel):
    model_type: str = Field(..., description="Model type: 'detection', 'severity', or 'recommendation'")
    use_latest_data: bool = Field(True, description="Use latest training data")
    model_algorithm: Optional[str] = Field(None, description="ML algorithm (for severity model): 'random_forest'")


class DeployRequest(BaseModel):
    version_id: int = Field(..., description="Model version ID to deploy")


# Global training status
training_status = {
    "status": "idle",
    "model_type": None,
    "progress": 0,
    "started_at": None,
    "completed_at": None,
    "error": None
}


@router.post("/train")
async def train_model(
    request: TrainRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Train a model (detection, severity, or recommendation)
    """
    try:
        training_service = ModelTrainingService(db)
        
        # Update status
        training_status["status"] = "training"
        training_status["model_type"] = request.model_type
        training_status["started_at"] = str(datetime.now())
        training_status["error"] = None
        
        if request.model_type == "detection":
            result = training_service.optimize_detection_prompt(
                use_latest_data=request.use_latest_data
            )
        elif request.model_type == "severity":
            result = training_service.train_severity_model(
                use_latest_data=request.use_latest_data,
                model_type=request.model_algorithm or "random_forest"
            )
        elif request.model_type == "recommendation":
            result = training_service.optimize_recommendation_prompt(
                use_latest_data=request.use_latest_data
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid model_type: {request.model_type}. Must be 'detection', 'severity', or 'recommendation'"
            )
        
        # Update status
        if result.get("status") == "success":
            training_status["status"] = "completed"
            training_status["completed_at"] = str(datetime.now())
        else:
            training_status["status"] = "failed"
            training_status["error"] = result.get("error", "Unknown error")
            training_status["completed_at"] = str(datetime.now())
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        training_status["status"] = "failed"
        training_status["error"] = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )


@router.get("/status")
async def get_training_status():
    """
    Get current training status
    """
    return training_status


@router.get("/models")
async def get_models(
    model_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of all model versions
    """
    try:
        query = db.query(ModelVersion)
        
        if model_type:
            query = query.filter(ModelVersion.model_type == model_type)
        
        models = query.order_by(desc(ModelVersion.created_at)).all()
        
        return {
            "models": [
                {
                    "id": m.id,
                    "model_type": m.model_type,
                    "version": m.version,
                    "deployed": m.deployed,
                    "deployed_at": m.deployed_at.isoformat() if m.deployed_at else None,
                    "created_at": m.created_at.isoformat(),
                    "performance_metrics": m.performance_metrics,
                    "training_data_count": m.training_data_range.get("count", 0) if m.training_data_range else 0
                }
                for m in models
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving models: {str(e)}"
        )


@router.post("/deploy")
async def deploy_model(
    request: DeployRequest,
    db: Session = Depends(get_db)
):
    """
    Deploy a model version
    """
    try:
        training_service = ModelTrainingService(db)
        result = training_service.deploy_model(request.version_id)
        
        if result.get("status") == "success":
            return result
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Deployment failed")
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deployment failed: {str(e)}"
        )


@router.get("/performance")
async def get_performance(
    model_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get performance metrics for models
    """
    try:
        query = db.query(ModelVersion)
        
        if model_type:
            query = query.filter(ModelVersion.model_type == model_type)
        
        models = query.order_by(desc(ModelVersion.created_at)).all()
        
        performance_data = []
        for model in models:
            metrics = model.performance_metrics or {}
            performance_data.append({
                "version": model.version,
                "model_type": model.model_type,
                "deployed": model.deployed,
                "metrics": metrics,
                "created_at": model.created_at.isoformat()
            })
        
        return {
            "performance": performance_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving performance: {str(e)}"
        )


@router.get("/latest/{model_type}")
async def get_latest_model(
    model_type: str,
    db: Session = Depends(get_db)
):
    """
    Get latest model version for a specific type
    """
    try:
        training_service = ModelTrainingService(db)
        model = training_service.get_latest_model(model_type)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No model found for type: {model_type}"
            )
        
        return {
            "id": model.id,
            "model_type": model.model_type,
            "version": model.version,
            "deployed": model.deployed,
            "performance_metrics": model.performance_metrics,
            "prompt_template": model.prompt_template,
            "created_at": model.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving latest model: {str(e)}"
        )

