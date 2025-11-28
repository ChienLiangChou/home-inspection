"""
API routes for managing detected issues
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database.connection import get_db
from services.issue_service import IssueService
from schemas.issue import IssueCreate, IssueOut, IssueUpdate

router = APIRouter(prefix="/api/issues", tags=["issues"])


@router.post("", response_model=IssueOut, status_code=status.HTTP_201_CREATED)
async def create_issue(
    issue_data: IssueCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new issue record from detected problem
    """
    try:
        issue_service = IssueService(db)
        issue = issue_service.create_issue(issue_data)
        return issue
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating issue: {str(e)}"
        )


@router.get("", response_model=List[IssueOut])
async def get_issues(
    resolved: Optional[str] = None,
    severity: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all issues with optional filters
    """
    try:
        issue_service = IssueService(db)
        severity_enum = severity if severity in ["low", "medium", "high"] else None
        issues = issue_service.get_all_issues(
            limit=limit,
            resolved=resolved,
            severity=severity_enum,
            location=location
        )
        return issues
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid severity value. Must be one of: {[e.value for e in IssueSeverity]}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving issues: {str(e)}"
        )


@router.get("/{issue_id}", response_model=IssueOut)
async def get_issue(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific issue by ID
    """
    try:
        issue_service = IssueService(db)
        issue = issue_service.get_issue(issue_id)
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Issue {issue_id} not found"
            )
        return issue
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving issue: {str(e)}"
        )


@router.patch("/{issue_id}", response_model=IssueOut)
async def update_issue(
    issue_id: int,
    update_data: IssueUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an issue (e.g., mark as resolved)
    """
    try:
        issue_service = IssueService(db)
        issue = issue_service.update_issue(issue_id, update_data)
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Issue {issue_id} not found"
            )
        return issue
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating issue: {str(e)}"
        )


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete an issue
    """
    try:
        issue_service = IssueService(db)
        success = issue_service.delete_issue(issue_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Issue {issue_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting issue: {str(e)}"
        )


@router.get("/component/{component}", response_model=List[IssueOut])
async def get_issues_by_component(
    component: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get issues for a specific component
    """
    try:
        issue_service = IssueService(db)
        issues = issue_service.get_issues_by_component(component, limit)
        return issues
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving component issues: {str(e)}"
        )

