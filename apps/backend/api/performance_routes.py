"""
API routes for performance evaluation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from database.connection import get_db
from services.performance_evaluation_service import PerformanceEvaluationService
from services.ab_testing_service import ABTestingService
from services.continuous_learning_service import ContinuousLearningService
from datetime import datetime

router = APIRouter(prefix="/api/performance", tags=["performance"])


@router.get("/detection")
async def get_detection_performance(
    model_version: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get detection model performance metrics
    """
    try:
        service = PerformanceEvaluationService(db)
        result = service.evaluate_detection_performance(model_version)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating detection performance: {str(e)}"
        )


@router.get("/severity")
async def get_severity_performance(
    model_version: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get severity prediction performance metrics
    """
    try:
        service = PerformanceEvaluationService(db)
        result = service.evaluate_severity_prediction(model_version)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating severity performance: {str(e)}"
        )


@router.get("/recommendation")
async def get_recommendation_performance(
    model_version: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get recommendation quality metrics
    """
    try:
        service = PerformanceEvaluationService(db)
        result = service.evaluate_recommendation_quality(model_version)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating recommendation performance: {str(e)}"
        )


@router.get("/overall")
async def get_overall_performance(
    db: Session = Depends(get_db)
):
    """
    Get overall performance metrics for all models
    """
    try:
        service = PerformanceEvaluationService(db)
        result = service.get_overall_performance()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting overall performance: {str(e)}"
        )


@router.post("/ab-test/start")
async def start_ab_test(
    model_type: str,
    version_a_id: int,
    version_b_id: int,
    traffic_split: float = 0.5,
    db: Session = Depends(get_db)
):
    """
    Start A/B test between two model versions
    """
    try:
        service = ABTestingService(db)
        result = service.start_ab_test(model_type, version_a_id, version_b_id, traffic_split)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting A/B test: {str(e)}"
        )


@router.post("/ab-test/auto-switch")
async def auto_switch_best_model(
    model_type: str,
    improvement_threshold: float = 0.05,
    db: Session = Depends(get_db)
):
    """
    Automatically switch to best performing model
    """
    try:
        service = ABTestingService(db)
        result = service.auto_switch_best_model(model_type, improvement_threshold)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error auto-switching model: {str(e)}"
        )


@router.post("/learning-cycle")
async def run_learning_cycle(
    db: Session = Depends(get_db)
):
    """
    Run complete continuous learning cycle
    """
    try:
        service = ContinuousLearningService(db)
        result = service.run_learning_cycle()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running learning cycle: {str(e)}"
        )


@router.get("/learning-cycle/status")
async def get_learning_cycle_status(
    db: Session = Depends(get_db)
):
    """
    Get status of learning cycle (feedback collection, cleaning, etc.)
    """
    try:
        service = ContinuousLearningService(db)
        
        feedback_status = service.collect_new_feedback()
        evaluation = service.evaluate_retraining_need()
        
        return {
            "feedback_status": feedback_status,
            "retraining_evaluation": evaluation,
            "timestamp": str(datetime.now())
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting learning cycle status: {str(e)}"
        )

