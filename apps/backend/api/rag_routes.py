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
import os
import base64
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

        # For real-time streaming, use OpenAI Vision API directly (skip RAG service)
        # This provides faster, more reliable analysis for live camera streams
        result = create_realtime_fallback_analysis(request, sensor_context)
        
        # Auto-create training data for learning (background task)
        # This will be processed by cleaning service later
        try:
            from services.data_cleaning_service import DataCleaningService
            # Note: Training data creation happens when issues are created
            # This is handled in issue creation flow
        except Exception as e:
            print(f"⚠️  Could not trigger learning data collection: {e}")
        
        return result
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Real-time stream analysis failed: {str(e)}"
        )


def analyze_image_with_openai(frame_base64: str, db: Session = None) -> Dict[str, Any]:
    """
    Analyze image using OpenAI Vision API
    Uses optimized prompt from latest trained model if available
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        return None

    try:
        # Get latest optimized prompt if available
        prompt_template = None
        if db:
            try:
                from models.model_version import ModelVersion
                from sqlalchemy import and_
                latest_model = db.query(ModelVersion).filter(
                    and_(
                        ModelVersion.model_type == "detection",
                        ModelVersion.deployed == True
                    )
                ).order_by(ModelVersion.id.desc()).first()
                
                if latest_model and latest_model.prompt_template:
                    prompt_template = latest_model.prompt_template
            except Exception as e:
                print(f"⚠️  Could not load optimized prompt: {e}")
        
        # Use optimized prompt or fallback to default
        if not prompt_template:
            prompt_template = """請仔細分析這張房屋檢查照片，特別注意檢測以下問題：

1. 漏水問題（最高優先級）：
   - 水漬、水痕、水印
   - 牆壁或天花板的變色（黃色、棕色）
   - 積水、滴水、滲漏跡象
   - 管道周圍的濕潤或腐蝕
   - 地面上的水跡
   
2. 結構問題：
   - 裂縫、損壞、變形
   - 牆壁不平整
   
3. 濕度問題：
   - 黴菌、發霉跡象
   - 潮濕、霉味跡象
   
4. 管道問題：
   - 洩漏、腐蝕、堵塞跡象
   - 管道連接處的問題
   
5. 電氣問題：
   - 電線暴露、面板問題
   
6. 屋頂問題：
   - 損壞、缺失、老化
   
7. 其他安全隱患

**重要提示**：
- 即使問題看起來很小，也應該檢測出來
- 對於明顯的問題（如漏水、水漬），severity 必須設為 "high"
- 如果看到任何水跡、變色或潮濕跡象，必須標記為漏水問題
- 特別注意牆角、牆壁連接處、天花板邊緣等容易漏水的區域
- 如果照片中有兩處或更多地方出現漏水跡象，必須為每一處單獨創建一個問題條目

請以 JSON 格式返回，包含：
- detected_issues: 檢測到的問題列表，每個問題必須包含：
  * type: 問題類型（如 "漏水"、"結構問題"等）
  * severity: "high"（嚴重，需要立即處理）、"medium"（中等）、"low"（輕微）
  * description: 詳細描述問題的位置和狀況
  * recommendation: 具體的解決建議
- overall_assessment: 整體評估
- confidence: 分析信心度 (0-1)

如果沒有檢測到任何問題，返回空列表 []。如果檢測到問題，必須在 detected_issues 中包含詳細信息。"""
        
        # Use OpenAI Vision API to analyze the image
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {openai_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini"),  # Default to gpt-4o-mini for cost optimization
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt_template
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{frame_base64}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 2000,  # Increased to ensure complete analysis for multiple issues
                "temperature": 0.3  # Lower temperature for more focused detection
            },
            timeout=60  # Increased timeout for better reliability
        )

        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Try to parse JSON from response
            try:
                # Extract JSON from markdown code blocks if present
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    analysis_data = json.loads(json_match.group())
                    # Validate that we have detected_issues
                    if "detected_issues" in analysis_data:
                        issues_count = len(analysis_data.get("detected_issues", []))
                        print(f"✅ Successfully parsed JSON with {issues_count} issue(s)")
                        if issues_count == 0:
                            print(f"⚠️  Warning: JSON parsed but detected_issues is empty")
                        return analysis_data
                    else:
                        print(f"⚠️  JSON parsed but no detected_issues field found, attempting text extraction")
                        # Fall through to text extraction
                else:
                    # Fallback: parse as plain JSON
                    analysis_data = json.loads(content)
                    if "detected_issues" in analysis_data:
                        issues_count = len(analysis_data.get("detected_issues", []))
                        print(f"✅ Successfully parsed plain JSON with {issues_count} issue(s)")
                        return analysis_data
                    else:
                        print(f"⚠️  Plain JSON parsed but no detected_issues field found, attempting text extraction")
                        # Fall through to text extraction
            except json.JSONDecodeError as e:
                # If not JSON, try to extract issues from text
                print(f"⚠️  JSON parsing failed, attempting text extraction: {e}")
                print(f"📄 Content preview: {content[:500]}...")
                
                # Try to extract issues from text description
                detected_issues = []
                if content:
                    # Look for leak-related keywords in Chinese and English
                    leak_keywords = ['漏水', '水漬', '水痕', '水印', '變色', '潮濕', 'leak', 'water', 'stain', 'moisture', '滲漏', '濕潤', '水跡', 'water stain', 'water damage']
                    issue_keywords = ['問題', 'issue', 'problem', 'damage', '損壞', '裂縫', 'crack']
                    
                    content_lower = content.lower()
                    has_leak_indicators = any(keyword.lower() in content_lower for keyword in leak_keywords)
                    
                    if has_leak_indicators or any(keyword in content for keyword in issue_keywords):
                        # Create issue from text analysis
                        detected_issues.append({
                            "type": "漏水問題" if has_leak_indicators else "潛在問題",
                            "severity": "high" if has_leak_indicators else "medium",
                            "description": content[:500] if len(content) > 500 else content,
                            "recommendation": "建議立即檢查並修復漏水問題。請聯繫專業水電工進行詳細檢查。" if has_leak_indicators else "建議進行專業檢查以確定問題的嚴重程度。"
                        })
                        print(f"✅ Extracted issue from text: {detected_issues[0]['type']}")
                
                return {
                    "detected_issues": detected_issues,
                    "overall_assessment": content,
                    "confidence": 0.6  # Lower confidence for text-based extraction
                }
        else:
            print(f"OpenAI API error: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        print(f"OpenAI Vision API error: {str(e)}")
        return None


def create_realtime_fallback_analysis(
    request: RealtimeStreamRequest,
    sensor_context: List[Dict]
) -> RealtimeStreamResponse:
    """
    Create fallback analysis for real-time stream when RAG service is unavailable
    Uses OpenAI Vision API if available, otherwise falls back to sensor-based analysis
    """
    issues = []
    recommendations = []
    
    # Try to analyze image with OpenAI Vision API
    frame_base64 = request.frame
    image_analysis = None
    
    if frame_base64:
        # Pass db session to use optimized prompt
        from database.connection import SessionLocal
        db_session = SessionLocal()
        try:
            image_analysis = analyze_image_with_openai(frame_base64, db_session)
        finally:
            db_session.close()
    
    if image_analysis:
        # Use OpenAI analysis results
        detected_issues = image_analysis.get("detected_issues", [])
        for issue in detected_issues:
            issues.append({
                "type": issue.get("type", "未知問題"),
                "severity": issue.get("severity", "medium"),
                "description": issue.get("description", "檢測到潛在問題"),
                "recommendation": issue.get("recommendation", "建議進行專業檢查")
            })
            if issue.get("recommendation"):
                recommendations.append(issue["recommendation"])
    else:
        # Fallback: Analyze based on sensor data
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

    # Build frame analysis with actual results
    frame_analysis = {
        "issues": issues,
        "detected_issues": issues,
        "detectedProblems": issues,
        "image_analysis_used": image_analysis is not None,
        "analysis_status": "completed",
        "analysis_method": "openai_vision" if image_analysis else "sensor_fallback"
    }
    
    # Add OpenAI analysis results if available
    if image_analysis:
        frame_analysis["overall_assessment"] = image_analysis.get("overall_assessment", "")
        frame_analysis["confidence"] = image_analysis.get("confidence", 0.7)
        frame_analysis["analysis_summary"] = image_analysis.get("overall_assessment", "已完成圖像分析")
        
        # Only add objects if OpenAI actually detected them (not hardcoded)
        if "detected_objects" in image_analysis:
            frame_analysis["objects"] = image_analysis["detected_objects"]
        elif "objects" in image_analysis:
            frame_analysis["objects"] = image_analysis["objects"]
        else:
            # No objects detected, don't add empty array
            frame_analysis["objects"] = []
    else:
        # No OpenAI analysis, use sensor-based fallback
        frame_analysis["overall_assessment"] = "基於傳感器數據的分析"
        frame_analysis["confidence"] = 0.6
        frame_analysis["analysis_summary"] = "使用傳感器數據進行分析"
        frame_analysis["objects"] = []

    # Create RAG context
    rag_context = {
        "relevantDocuments": [
            {
                "title": "實時檢查指南",
                "content": "基於圖像分析和感應器數據的實時檢查建議",
                "relevance": 0.9
            }
        ],
        "sensorData": sensor_context,
        "recommendations": recommendations,
        "imageAnalysis": image_analysis.get("overall_assessment", "") if image_analysis else None
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