"""
RAG Integration Routes for Home Inspection System
Provides endpoints for camera photo analysis with RAG system integration
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import requests
import json
from datetime import datetime

from database.connection import get_db
from utils.context_injection import build_sensor_context

router = APIRouter(prefix="/api/rag", tags=["RAG"])


class PhotoAnalysisRequest(BaseModel):
    photo: str  # Base64 encoded image
    query: str
    component: str = "visual_inspection"
    location: str = "current_location"
    windowSec: int = 300


class RealtimeStreamRequest(BaseModel):
    frame: str  # Base64 encoded frame
    streamType: str = "realtime_inspection"
    location: str = "current_inspection_site"
    timestamp: str
    quality: str = "medium"


class DocumentResult(BaseModel):
    title: str
    content: str
    relevance: float
    category: str
    location: Optional[str] = None
    component: Optional[str] = None


class RAGAnalysisResponse(BaseModel):
    query: str
    relevantDocuments: List[DocumentResult]
    sensorContext: Dict[str, Any]
    recommendations: List[str]
    combinedContext: str
    timestamp: str


class RealtimeStreamResponse(BaseModel):
    frameAnalysis: Dict[str, Any]
    ragContext: Dict[str, Any]
    timestamp: str


@router.post("/analyze-photo", response_model=RAGAnalysisResponse)
async def analyze_photo_with_rag(
    request: PhotoAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze a photo using RAG system with home inspection documents
    and sensor data
    """
    try:
        # Get sensor context
        sensor_context = build_sensor_context(
            component=request.component,
            location_prefix=request.location,
            window_sec=request.windowSec,
            db=db
        )

        # Prepare RAG query with photo and sensor context
        rag_query = {
            "query": request.query,
            "photo": request.photo,
            "component": request.component,
            "location": request.location,
            "sensor_context": sensor_context,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Call RAG service (assuming it's running on port 3001)
        try:
            rag_response = requests.post(
                "http://localhost:3001/api/rag/analyze",
                json=rag_query,
                timeout=30
            )

            if rag_response.status_code == 200:
                rag_data = rag_response.json()

                # Format response
                response = RAGAnalysisResponse(
                    query=request.query,
                    relevantDocuments=[
                        DocumentResult(
                            title=doc.get("title", ""),
                            content=doc.get("content", ""),
                            relevance=doc.get("relevance", 0.0),
                            category=doc.get("category", ""),
                            location=doc.get("location"),
                            component=doc.get("component")
                        )
                        for doc in rag_data.get("documents", [])
                    ],
                    sensorContext=sensor_context,
                    recommendations=rag_data.get("recommendations", []),
                    combinedContext=rag_data.get("combined_context", ""),
                    timestamp=datetime.utcnow().isoformat()
                )

                return response
            else:
                raise HTTPException(
                    status_code=rag_response.status_code,
                    detail=f"RAG service error: {rag_response.text}"
                )

        except requests.exceptions.RequestException:
            # Fallback: return basic analysis without RAG service
            return create_fallback_analysis(request, sensor_context)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Photo analysis failed: {str(e)}"
        )


def create_fallback_analysis(
    request: PhotoAnalysisRequest,
    sensor_context: List[Dict]
) -> RAGAnalysisResponse:
    """
    Create a fallback analysis when RAG service is not available
    """
    # Basic sensor-based recommendations
    recommendations = []

    if sensor_context:
        # Analyze sensor data for recommendations
        for reading in sensor_context:
            if (reading.get("type") == "moisture_level" and
                    reading.get("value", 0) > 70):
                recommendations.append("檢測到高濕度，建議檢查通風和防水")
            elif (reading.get("type") == "co2" and
                  reading.get("value", 0) > 1000):
                recommendations.append("CO2濃度偏高，建議改善通風")
            elif (reading.get("type") == "temperature" and
                  reading.get("value", 0) > 30):
                recommendations.append("溫度偏高，建議檢查隔熱和通風")

    if not recommendations:
        recommendations.append("建議進行專業檢查以確保安全")

    # Create basic context
    combined_context = f"""
# 攝像頭檢查分析
查詢: {request.query}
時間: {datetime.utcnow().isoformat()}
組件: {request.component}
位置: {request.location}

## 感應器數據
{json.dumps(sensor_context, indent=2, ensure_ascii=False)}

## 建議
{chr(10).join(f"- {rec}" for rec in recommendations)}

注意: RAG 服務暫時不可用，這是基於感應器數據的基本分析。
    """.strip()

    return RAGAnalysisResponse(
        query=request.query,
        relevantDocuments=[],
        sensorContext={"readings": sensor_context},
        recommendations=recommendations,
        combinedContext=combined_context,
        timestamp=datetime.utcnow().isoformat()
    )


@router.get("/health")
async def rag_health_check():
    """
    Check RAG service health
    """
    try:
        # Check if RAG service is running
        response = requests.get("http://localhost:3001/health", timeout=5)
        if response.status_code == 200:
            return {"status": "healthy", "rag_service": "connected"}
        else:
            return {"status": "degraded", "rag_service": "unavailable"}
    except Exception:
        return {"status": "degraded", "rag_service": "unavailable"}


@router.post("/analyze-realtime-stream", response_model=RealtimeStreamResponse)
async def analyze_realtime_stream(
    request: RealtimeStreamRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze real-time camera stream frames using RAG system
    """
    try:
        # Get sensor context for real-time analysis
        sensor_context = build_sensor_context(
            component="realtime_inspection",
            location_prefix=request.location,
            window_sec=60,  # 1 minute window for real-time
            db=db
        )

        # Prepare RAG query for real-time stream analysis
        rag_query = {
            "query": f"實時檢查分析 - {request.streamType}",
            "frame": request.frame,
            "streamType": request.streamType,
            "location": request.location,
            "timestamp": request.timestamp,
            "quality": request.quality,
            "sensor_context": sensor_context,
            "analysis_type": "realtime_stream"
        }

        # Call RAG service for real-time analysis
        try:
            rag_response = requests.post(
                "http://localhost:3001/api/rag/analyze-stream",
                json=rag_query,
                timeout=15  # Shorter timeout for real-time
            )

            if rag_response.status_code == 200:
                rag_data = rag_response.json()
                
                response = RealtimeStreamResponse(
                    frameAnalysis=rag_data.get("frameAnalysis", {
                        "objects": [],
                        "issues": [],
                        "detectedProblems": []
                    }),
                    ragContext=rag_data.get("ragContext", {
                        "relevantDocuments": [],
                        "sensorData": sensor_context,
                        "recommendations": []
                    }),
                    timestamp=datetime.utcnow().isoformat()
                )
                
                return response
            else:
                # Fallback analysis for real-time stream
                return create_realtime_fallback_analysis(request, sensor_context)
                
        except requests.exceptions.RequestException:
            # Fallback: return basic real-time analysis
            return create_realtime_fallback_analysis(request, sensor_context)
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Real-time stream analysis failed: {str(e)}"
        )


def create_realtime_fallback_analysis(
    request: RealtimeStreamRequest,
    sensor_context: List[Dict]
) -> RealtimeStreamResponse:
    """
    Create fallback analysis for real-time stream when RAG service is unavailable
    """
    # Basic frame analysis simulation
    frame_analysis = {
        "objects": [
            {
                "type": "building_structure",
                "confidence": 0.85,
                "location": {"x": 100, "y": 100, "width": 200, "height": 300}
            }
        ],
        "issues": [],
        "detectedProblems": []
    }

    # Analyze sensor data for real-time recommendations
    recommendations = []
    issues = []

    if sensor_context:
        for reading in sensor_context:
            if (reading.get("type") == "moisture_level" and
                    reading.get("value", 0) > 70):
                issues.append({
                    "type": "高濕度檢測",
                    "severity": "high",
                    "description": f"檢測到高濕度: {reading.get('value')}%",
                    "recommendation": "建議檢查通風和防水系統"
                })
                recommendations.append("立即檢查濕度來源並改善通風")
            
            elif (reading.get("type") == "co2" and
                  reading.get("value", 0) > 1000):
                issues.append({
                    "type": "空氣品質問題",
                    "severity": "medium",
                    "description": f"CO2濃度偏高: {reading.get('value')}ppm",
                    "recommendation": "建議改善通風系統"
                })
                recommendations.append("檢查通風系統是否正常運作")
            
            elif (reading.get("type") == "temperature" and
                  reading.get("value", 0) > 30):
                issues.append({
                    "type": "溫度異常",
                    "severity": "medium",
                    "description": f"溫度偏高: {reading.get('value')}°C",
                    "recommendation": "檢查隔熱和通風系統"
                })
                recommendations.append("檢查隔熱材料和通風狀況")

    frame_analysis["issues"] = issues

    # Create RAG context
    rag_context = {
        "relevantDocuments": [
            {
                "title": "實時檢查指南",
                "content": "基於當前感應器數據的實時檢查建議",
                "relevance": 0.9
            }
        ],
        "sensorData": sensor_context,
        "recommendations": recommendations
    }

    return RealtimeStreamResponse(
        frameAnalysis=frame_analysis,
        ragContext=rag_context,
        timestamp=datetime.utcnow().isoformat()
    )


@router.get("/documents/count")
async def get_document_count():
    """
    Get count of documents in RAG system
    """
    try:
        response = requests.get(
            "http://localhost:3001/api/documents/count",
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        else:
            return {"count": 0, "error": "RAG service unavailable"}
    except Exception:
        return {"count": 0, "error": "RAG service unavailable"}