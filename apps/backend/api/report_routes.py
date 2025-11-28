"""
API routes for generating home inspection reports
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import os
import uuid
from pathlib import Path

from database.connection import get_db
from services.issue_service import IssueService
from schemas.issue import IssueOut

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Create reports directory if it doesn't exist
REPORTS_DIR = Path("data/reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/generate")
async def generate_report(
    report_data: dict,
    db: Session = Depends(get_db)
):
    """
    Generate a home inspection report from detected issues
    """
    try:
        issues = report_data.get("issues", [])
        start_time = report_data.get("startTime")
        end_time = report_data.get("endTime")
        stream_quality = report_data.get("streamQuality", "medium")
        
        # Generate report ID
        report_id = str(uuid.uuid4())
        report_filename = f"inspection_report_{report_id}.json"
        report_path = REPORTS_DIR / report_filename
        
        # Calculate inspection duration
        duration = None
        if start_time and end_time:
            start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            duration_seconds = (end - start).total_seconds()
            duration = {
                "seconds": int(duration_seconds),
                "minutes": int(duration_seconds / 60),
                "formatted": f"{int(duration_seconds / 60)}分{int(duration_seconds % 60)}秒"
            }
        
        # Organize issues by severity
        high_severity = [i for i in issues if i.get("severity") == "high"]
        medium_severity = [i for i in issues if i.get("severity") == "medium"]
        low_severity = [i for i in issues if i.get("severity") == "low"]
        
        # Create report structure
        report = {
            "reportId": report_id,
            "generatedAt": datetime.now().isoformat(),
            "inspection": {
                "startTime": start_time,
                "endTime": end_time,
                "duration": duration,
                "streamQuality": stream_quality,
                "totalIssues": len(issues),
                "issuesBySeverity": {
                    "high": len(high_severity),
                    "medium": len(medium_severity),
                    "low": len(low_severity)
                }
            },
            "issues": issues,
            "summary": {
                "totalIssues": len(issues),
                "highPriorityIssues": len(high_severity),
                "mediumPriorityIssues": len(medium_severity),
                "lowPriorityIssues": len(low_severity),
                "recommendations": list(set([
                    issue.get("recommendation", "")
                    for issue in issues
                    if issue.get("recommendation")
                ]))
            }
        }
        
        # Save report as JSON
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # Generate download link
        download_link = f"/api/reports/download/{report_id}"
        
        return {
            "success": True,
            "reportId": report_id,
            "downloadLink": download_link,
            "reportPath": str(report_path),
            "message": "Report generated successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating report: {str(e)}"
        )


@router.get("/{report_id}")
async def get_report(report_id: str):
    """
    Get report content as JSON (for viewing in browser)
    """
    try:
        report_filename = f"inspection_report_{report_id}.json"
        report_path = REPORTS_DIR / report_filename
        
        if not report_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report {report_id} not found"
            )
        
        with open(report_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)
        
        return report_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading report: {str(e)}"
        )


@router.get("/download/{report_id}")
async def download_report(report_id: str):
    """
    Download a generated inspection report
    """
    try:
        report_filename = f"inspection_report_{report_id}.json"
        report_path = REPORTS_DIR / report_filename
        
        if not report_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report {report_id} not found"
            )
        
        return FileResponse(
            path=str(report_path),
            filename=f"home_inspection_report_{report_id}.json",
            media_type="application/json"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading report: {str(e)}"
        )


@router.get("/list")
async def list_reports(limit: int = 20):
    """
    List all available reports
    """
    try:
        reports = []
        for report_file in sorted(REPORTS_DIR.glob("inspection_report_*.json"), reverse=True):
            if len(reports) >= limit:
                break
            
            try:
                with open(report_file, 'r', encoding='utf-8') as f:
                    report_data = json.load(f)
                    reports.append({
                        "reportId": report_data.get("reportId"),
                        "generatedAt": report_data.get("generatedAt"),
                        "totalIssues": report_data.get("inspection", {}).get("totalIssues", 0),
                        "downloadLink": f"/api/reports/download/{report_data.get('reportId')}"
                    })
            except Exception as e:
                print(f"Error reading report {report_file}: {e}")
                continue
        
        return {
            "reports": reports,
            "total": len(reports)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing reports: {str(e)}"
        )

