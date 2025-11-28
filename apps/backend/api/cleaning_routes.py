"""
API routes for data cleaning operations
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field

from database.connection import get_db
from services.data_cleaning_service import DataCleaningService
from models.training_data import TrainingData
from sqlalchemy import func

router = APIRouter(prefix="/api/cleaning", tags=["cleaning"])


class CleanRequest(BaseModel):
    issue_ids: Optional[List[int]] = Field(None, description="Specific issue IDs to clean (optional)")
    batch_size: int = Field(100, ge=1, le=1000, description="Batch size for cleaning")
    force_reclean: bool = Field(False, description="Force re-cleaning of already cleaned issues")


class CleanResponse(BaseModel):
    status: str
    message: Optional[str] = None
    processed: int
    cleaned: int
    failed: int
    duplicates_found: int = 0
    outliers_found: int = 0
    errors: Optional[List[dict]] = None


# Global cleaning status (simple in-memory storage)
cleaning_status = {
    "status": "idle",
    "progress": 0,
    "total": 0,
    "started_at": None,
    "completed_at": None
}


@router.post("/clean", response_model=CleanResponse)
async def clean_data(
    request: CleanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Trigger data cleaning process
    Can run in background or synchronously
    """
    try:
        cleaning_service = DataCleaningService(db)
        
        # Run cleaning
        result = cleaning_service.clean_issues(
            issue_ids=request.issue_ids,
            batch_size=request.batch_size,
            force_reclean=request.force_reclean
        )
        
        # Update global status
        cleaning_status["status"] = result["status"]
        cleaning_status["processed"] = result.get("processed", 0)
        cleaning_status["total"] = result.get("processed", 0)
        
        return CleanResponse(
            status=result["status"],
            message=result.get("message"),
            processed=result.get("processed", 0),
            cleaned=result.get("cleaned", 0),
            failed=result.get("failed", 0),
            duplicates_found=result.get("duplicates_found", 0),
            outliers_found=result.get("outliers_found", 0),
            errors=result.get("errors")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cleaning failed: {str(e)}"
        )


@router.get("/status")
async def get_cleaning_status():
    """
    Get current cleaning status
    """
    return cleaning_status


@router.get("/stats")
async def get_cleaning_stats(db: Session = Depends(get_db)):
    """
    Get cleaning statistics
    """
    try:
        total_cleaned = db.query(TrainingData).filter(
            TrainingData.cleaned_status == "cleaned"
        ).count()
        
        total_failed = db.query(TrainingData).filter(
            TrainingData.cleaned_status == "failed"
        ).count()
        
        total_pending = db.query(TrainingData).filter(
            TrainingData.cleaned_status == "pending"
        ).count()
        
        # Quality score statistics
        quality_stats = db.query(
            func.avg(TrainingData.quality_score).label("avg_quality"),
            func.min(TrainingData.quality_score).label("min_quality"),
            func.max(TrainingData.quality_score).label("max_quality"),
            func.count(TrainingData.quality_score).label("count")
        ).filter(
            TrainingData.cleaned_status == "cleaned",
            TrainingData.quality_score.isnot(None)
        ).first()
        
        # Quality distribution
        high_quality = db.query(TrainingData).filter(
            TrainingData.cleaned_status == "cleaned",
            TrainingData.quality_score >= 0.7
        ).count()
        
        medium_quality = db.query(TrainingData).filter(
            TrainingData.cleaned_status == "cleaned",
            TrainingData.quality_score >= 0.4,
            TrainingData.quality_score < 0.7
        ).count()
        
        low_quality = db.query(TrainingData).filter(
            TrainingData.cleaned_status == "cleaned",
            TrainingData.quality_score < 0.4
        ).count()
        
        return {
            "total_cleaned": total_cleaned,
            "total_failed": total_failed,
            "total_pending": total_pending,
            "quality_statistics": {
                "average": float(quality_stats.avg_quality) if quality_stats.avg_quality else 0.0,
                "min": float(quality_stats.min_quality) if quality_stats.min_quality else 0.0,
                "max": float(quality_stats.max_quality) if quality_stats.max_quality else 0.0,
                "count": quality_stats.count or 0
            },
            "quality_distribution": {
                "high": high_quality,
                "medium": medium_quality,
                "low": low_quality
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving cleaning stats: {str(e)}"
        )


@router.post("/validate")
async def validate_cleaning_results(
    sample_size: int = 10,
    db: Session = Depends(get_db)
):
    """
    Validate cleaning results by returning sample data
    """
    try:
        # Get sample of cleaned data
        samples = db.query(TrainingData).filter(
            TrainingData.cleaned_status == "cleaned"
        ).limit(sample_size).all()
        
        if not samples:
            return {
                "message": "No cleaned data available",
                "samples": []
            }
        
        result_samples = []
        for sample in samples:
            from models.issue import Issue
            issue = db.query(Issue).filter(Issue.id == sample.issue_id).first()
            
            result_samples.append({
                "issue_id": sample.issue_id,
                "original": {
                    "issue_type": issue.issue_type if issue else None,
                    "severity": issue.severity if issue else None,
                    "description": issue.description[:100] + "..." if issue and issue.description else None
                },
                "standardized": sample.standardized_data,
                "quality_score": sample.quality_score,
                "labels": sample.labels
            })
        
        return {
            "message": f"Retrieved {len(result_samples)} samples",
            "samples": result_samples
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validating cleaning results: {str(e)}"
        )

