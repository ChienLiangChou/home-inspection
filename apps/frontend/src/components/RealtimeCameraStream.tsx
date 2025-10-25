import React, { useState, useRef, useEffect } from 'react';
import BrowserCompatibilityCheck from './BrowserCompatibilityCheck';

interface RealtimeCameraStreamProps {
  onStreamAnalysis?: (analysis: any) => void;
  onStreamStart?: (stream: MediaStream) => void;
  onStreamStop?: () => void;
}

interface StreamAnalysisResult {
  timestamp: string;
  frameAnalysis: {
    objects: Array<{
      type: string;
      confidence: number;
      location: { x: number; y: number; width: number; height: number };
    }>;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }>;
  };
  ragContext: {
    relevantDocuments: Array<{
      title: string;
      content: string;
      relevance: number;
    }>;
    sensorData: any;
    recommendations: string[];
  };
}

const RealtimeCameraStream: React.FC<RealtimeCameraStreamProps> = ({
  onStreamAnalysis,
  onStreamStart,
  onStreamStop
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [analysisResults, setAnalysisResults] = useState<StreamAnalysisResult[]>([]);
  const [streamQuality, setStreamQuality] = useState<'low' | 'medium' | 'high'>('medium');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start real-time camera stream
  const startRealtimeStream = async () => {
    try {
      setError(null);
      
      // Check for modern API first, then fallback to old API
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasOldGetUserMedia = !!((navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia);
      
      if (!hasMediaDevices && !hasOldGetUserMedia) {
        throw new Error('您的瀏覽器不支援攝像頭訪問。請使用支援的瀏覽器。');
      }
      
      // 修復：在 iPhone Chrome 上使用更寬鬆的約束條件
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
      
      let constraints;
      if (isIOS && isChrome) {
        // iPhone Chrome 使用更簡單的約束條件
        constraints = {
          video: {
            facingMode: facingMode
          },
          audio: false
        };
      } else {
        // 其他瀏覽器使用完整約束條件
        constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: streamQuality === 'high' ? 1920 : streamQuality === 'medium' ? 1280 : 640 },
            height: { ideal: streamQuality === 'high' ? 1080 : streamQuality === 'medium' ? 720 : 480 },
            frameRate: { ideal: 30 }
          },
          audio: false
        };
      }

      let stream;
      
      if (hasMediaDevices) {
        // Use modern API
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        // Use old API for iPhone Safari
        stream = await new Promise<MediaStream>((resolve, reject) => {
          const getUserMedia = (navigator as any).getUserMedia || 
                             (navigator as any).webkitGetUserMedia || 
                             (navigator as any).mozGetUserMedia;
          
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        onStreamStart?.(stream);
        
        // Start frame capture for analysis
        startFrameAnalysis();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      // 提供更具體的錯誤訊息和解決方案
      let errorMessage = `無法訪問攝像頭: ${err.message}`;
      
      if (err.name === 'NotAllowedError') {
        errorMessage = '攝像頭權限被拒絕。請在瀏覽器設置中允許攝像頭權限，或嘗試使用 Safari 瀏覽器。';
      } else if (err.name === 'NotFoundError') {
        errorMessage = '未找到攝像頭設備。請檢查設備是否有攝像頭。';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = '瀏覽器不支援攝像頭功能。請使用 Safari 瀏覽器。';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '攝像頭設置不支援。請嘗試使用前置攝像頭或使用 Safari 瀏覽器。';
      }
      
      setError(errorMessage);
    }
  };

  // Stop real-time stream
  const stopRealtimeStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Stop analysis intervals
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (frameCaptureIntervalRef.current) {
      clearInterval(frameCaptureIntervalRef.current);
      frameCaptureIntervalRef.current = null;
    }
    
    setIsStreaming(false);
    setIsAnalyzing(false);
    onStreamStop?.();
  };

  // Start frame analysis
  const startFrameAnalysis = () => {
    // Capture frame every 2 seconds for analysis
    frameCaptureIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        captureFrameForAnalysis();
      }
    }, 2000);

    // Perform analysis every 5 seconds
    analysisIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        performRealtimeAnalysis();
      }
    }, 5000);
  };

  // Capture frame for analysis
  const captureFrameForAnalysis = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 for analysis
    const frameData = canvas.toDataURL('image/jpeg', 0.8);
    return frameData;
  };

  // Perform real-time analysis
  const performRealtimeAnalysis = async () => {
    if (!isStreaming) return;

    setIsAnalyzing(true);
    
    try {
      const frameData = captureFrameForAnalysis();
      if (!frameData) return;

      // Send frame to RAG analysis endpoint
      const response = await fetch('/api/rag/analyze-realtime-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: frameData,
          streamType: 'realtime_inspection',
          location: 'current_inspection_site',
          timestamp: new Date().toISOString(),
          quality: streamQuality
        })
      });

      if (response.ok) {
        const analysis = await response.json();
        const result: StreamAnalysisResult = {
          timestamp: new Date().toISOString(),
          frameAnalysis: analysis.frameAnalysis || { objects: [], issues: [] },
          ragContext: analysis.ragContext || { relevantDocuments: [], sensorData: null, recommendations: [] }
        };
        
        setAnalysisResults(prev => [result, ...prev].slice(0, 10)); // Keep last 10 results
        onStreamAnalysis?.(result);
      }
    } catch (err: any) {
      console.error('Realtime analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Switch camera
  const switchCamera = () => {
    if (isStreaming) {
      stopRealtimeStream();
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      setTimeout(startRealtimeStream, 100);
    } else {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealtimeStream();
    };
  }, []);

  // 檢查是否為 iPhone Safari
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      // 如果是 iPhone Safari 且不支援攝像頭，顯示特殊訊息
      if (isIOSSafari && !hasGetUserMedia) {
        return (
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>iPhone Safari 實時攝像頭限制</h3>
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <p style={{ color: '#856404', margin: 0 }}>
                <strong>iPhone Safari 不支援實時攝像頭 API</strong><br/>
                但我們提供了完整的替代解決方案！
              </p>
            </div>
            <div style={{
              backgroundColor: '#d1ecf1',
              border: '1px solid #bee5eb',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: '#0c5460', margin: '0 0 10px 0' }}>✅ iPhone 解決方案優勢：</h4>
              <ul style={{ color: '#0c5460', textAlign: 'left', paddingLeft: '20px' }}>
                <li>使用 iPhone 原生相機，畫質更佳</li>
                <li>支援多張照片同時上傳</li>
                <li>AI 智能分析，專業準確</li>
                <li>生成詳細檢查報告</li>
                <li>無需額外硬體設備</li>
              </ul>
            </div>
            <div style={{
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: '#155724', margin: '0 0 10px 0' }}>🚀 立即開始：</h4>
              <p style={{ color: '#155724', margin: 0 }}>
                點擊 "📱 iPhone" 標籤開始使用完整的 iPhone 房屋檢查工作流程
              </p>
            </div>
          </div>
        );
      }

  return (
    <BrowserCompatibilityCheck>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
      <h3 style={{ 
        marginBottom: '20px', 
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        📹 實時檢查攝像頭流
      </h3>

      {/* Stream Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={isStreaming ? stopRealtimeStream : startRealtimeStream}
          style={{
            padding: '12px 20px',
            backgroundColor: isStreaming ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isStreaming ? '⏹️ 停止實時流' : '▶️ 開始實時流'}
        </button>

        <button
          onClick={switchCamera}
          disabled={!isStreaming}
          style={{
            padding: '12px 20px',
            backgroundColor: isStreaming ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isStreaming ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            opacity: isStreaming ? 1 : 0.6
          }}
        >
          🔄 切換攝像頭 ({facingMode === 'user' ? '前置' : '後置'})
        </button>

        <select
          value={streamQuality}
          onChange={(e) => setStreamQuality(e.target.value as any)}
          disabled={isStreaming}
          style={{
            padding: '12px 15px',
            border: '1px solid #ced4da',
            borderRadius: '5px',
            fontSize: '14px',
            backgroundColor: isStreaming ? '#f8f9fa' : 'white',
            cursor: isStreaming ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="low">低品質 (640x480)</option>
          <option value="medium">中品質 (1280x720)</option>
          <option value="high">高品質 (1920x1080)</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Video Stream */}
      <div style={{ 
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '20px'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: 'auto',
            display: isStreaming ? 'block' : 'none'
          }}
        />
        
        {!isStreaming && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📹</div>
            <p>點擊「開始實時流」來開始實時檢查</p>
          </div>
        )}

        {/* Analysis Overlay */}
        {isAnalyzing && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 123, 255, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            🔍 AI 分析中...
          </div>
        )}
      </div>

      {/* Real-time Analysis Results */}
      {analysisResults.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '15px', color: '#333' }}>📊 實時分析結果:</h4>
          
          {analysisResults.slice(0, 3).map((result, index) => (
            <div key={index} style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '10px',
              border: '1px solid #dee2e6'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <div style={{ fontWeight: 'bold', color: '#495057' }}>
                  分析 #{index + 1}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {/* Detected Objects */}
              {result.frameAnalysis.objects.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                    檢測到的物件:
                  </div>
                  {result.frameAnalysis.objects.map((obj, objIndex) => (
                    <div key={objIndex} style={{
                      display: 'inline-block',
                      backgroundColor: '#e9ecef',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      margin: '2px',
                      color: '#495057'
                    }}>
                      {obj.type} ({Math.round(obj.confidence * 100)}%)
                    </div>
                  ))}
                </div>
              )}

              {/* Issues */}
              {result.frameAnalysis.issues.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                    發現問題:
                  </div>
                  {result.frameAnalysis.issues.map((issue, issueIndex) => (
                    <div key={issueIndex} style={{
                      backgroundColor: issue.severity === 'high' ? '#f8d7da' : 
                                     issue.severity === 'medium' ? '#fff3cd' : '#d1ecf1',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '5px',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: 'bold' }}>
                        {issue.type} ({issue.severity})
                      </div>
                      <div>{issue.description}</div>
                      <div style={{ fontStyle: 'italic', color: '#6c757d' }}>
                        建議: {issue.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RAG Recommendations */}
              {result.ragContext.recommendations.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                    AI 建議:
                  </div>
                  {result.ragContext.recommendations.map((rec, recIndex) => (
                    <div key={recIndex} style={{
                      backgroundColor: '#d4edda',
                      padding: '6px 10px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      marginBottom: '3px',
                      color: '#155724'
                    }}>
                      💡 {rec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      {/* Instructions */}
      <div style={{
        backgroundColor: '#e9ecef',
        padding: '15px',
        borderRadius: '5px',
        fontSize: '14px',
        color: '#495057',
        marginTop: '20px'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#333' }}>📋 實時檢查說明:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>點擊「開始實時流」來啟動攝像頭實時流</li>
          <li>系統會每 2 秒捕獲一幀進行 AI 分析</li>
          <li>每 5 秒進行一次完整的 RAG 分析</li>
          <li>AI 會結合你的 home inspection reports 提供實時建議</li>
          <li>檢測到的問題會即時顯示在畫面上</li>
          <li>可以切換前置/後置攝像頭進行不同角度的檢查</li>
        </ul>
      </div>
      </div>
    </BrowserCompatibilityCheck>
  );
};

export default RealtimeCameraStream;
