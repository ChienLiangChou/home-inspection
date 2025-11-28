"""
API routes for accessing stored images and files
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from pathlib import Path
from typing import List
import os

router = APIRouter(prefix="/api/storage", tags=["storage"])

# Storage directories
IMAGES_DIR = Path("data/images")
REPORTS_DIR = Path("data/reports")
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/images")
async def list_images():
    """
    List all stored inspection images
    """
    try:
        images = []
        for image_file in sorted(IMAGES_DIR.glob("*.jpg"), reverse=True):
            stat = image_file.stat()
            images.append({
                "filename": image_file.name,
                "path": str(image_file),
                "size": stat.st_size,
                "created": stat.st_ctime,
                "url": f"/api/storage/images/{image_file.name}"
            })
        
        return {
            "images": images,
            "total": len(images),
            "storage_path": str(IMAGES_DIR.absolute())
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing images: {str(e)}"
        )


@router.get("/images/{filename}")
async def get_image(filename: str):
    """
    Download a specific inspection image
    """
    try:
        image_path = IMAGES_DIR / filename
        
        # Security check - prevent directory traversal
        if not str(image_path.resolve()).startswith(str(IMAGES_DIR.resolve())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid file path"
            )
        
        if not image_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image {filename} not found"
            )
        
        return FileResponse(
            path=str(image_path),
            filename=filename,
            media_type="image/jpeg"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving image: {str(e)}"
        )


@router.get("/info")
async def get_storage_info():
    """
    Get storage information and locations
    """
    try:
        # Calculate storage sizes
        images_size = sum(f.stat().st_size for f in IMAGES_DIR.glob("*") if f.is_file())
        reports_size = sum(f.stat().st_size for f in REPORTS_DIR.glob("*") if f.is_file())
        
        images_count = len(list(IMAGES_DIR.glob("*.jpg")))
        reports_count = len(list(REPORTS_DIR.glob("*.json")))
        
        return {
            "storage_locations": {
                "images": {
                    "path": str(IMAGES_DIR.absolute()),
                    "count": images_count,
                    "size_bytes": images_size,
                    "size_mb": round(images_size / (1024 * 1024), 2)
                },
                "reports": {
                    "path": str(REPORTS_DIR.absolute()),
                    "count": reports_count,
                    "size_bytes": reports_size,
                    "size_mb": round(reports_size / (1024 * 1024), 2)
                },
                "database": {
                    "path": str(Path("data/home_inspection.db").absolute()),
                    "description": "SQLite database containing issues and sensor data"
                }
            },
            "frontend_storage": {
                "description": "Browser memory (temporary)",
                "location": "capturedFrames state in React component",
                "max_frames": 50,
                "note": "Frames are cleared when page is refreshed"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting storage info: {str(e)}"
        )





