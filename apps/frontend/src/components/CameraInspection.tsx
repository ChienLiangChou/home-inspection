import React, { useState, useRef, useEffect } from 'react';
import CameraRAGAnalysis from './CameraRAGAnalysis';
import BrowserCompatibilityCheck from './BrowserCompatibilityCheck';

interface CameraInspectionProps {
  onPhotoCapture?: (photoData: string) => void;
  onVideoStream?: (stream: MediaStream) => void;
}

const CameraInspection: React.FC<CameraInspectionProps> = ({ 
  onPhotoCapture, 
  onVideoStream 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera stream
  const startCamera = async () => {
    try {
      setError(null);
      
      // Check secure context first (iOS requires HTTPS or localhost)
      const isSecureContext = window.isSecureContext;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // iOS requires secure context (HTTPS or localhost)
      if (isIOS && !isSecureContext) {
        const errorMsg = '❌ iOS 安全限制：無法在非安全來源使用相機\n\n' +
          'iOS 要求相機功能只能在以下環境使用：\n' +
          '1. ✅ HTTPS 網站 (https://...)\n' +
          '2. ✅ localhost (http://localhost:3000)\n' +
          '\n' +
          '❌ 不支援：\n' +
          '• http://192.168.x.x:3000 (開發網址)\n' +
          '• http://10.x.x.x:3000\n' +
          '• 其他非 HTTPS 的 IP 位址\n' +
          '\n' +
          '💡 解決方案：\n' +
          '1. 使用 HTTPS 部署（推薦）\n' +
          '2. 使用 localhost 開發（http://localhost:3000）\n' +
          '3. 或使用「📱 iPhone」標籤進行拍照分析';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Check for modern API first, then fallback to old API
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasOldGetUserMedia = !!((navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia);
      
      if (!hasMediaDevices && !hasOldGetUserMedia) {
        throw new Error('您的瀏覽器不支援攝像頭訪問。請使用支援的瀏覽器。');
      }
      
      // For iOS, use simpler constraints (all iOS browsers use WebKit with same restrictions)
      let constraints;
      if (isIOS) {
        // iOS browsers need simpler constraints
        constraints = {
          video: {
            facingMode: facingMode
          },
          audio: false
        };
      } else {
        // Other browsers use full constraints
        constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
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
        onVideoStream?.(stream);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      // 提供更具體的錯誤訊息和解決方案
      let errorMessage = `無法訪問攝像頭: ${err.message}`;
      
      if (err.name === 'NotAllowedError') {
        errorMessage = '攝像頭權限被拒絕。請在瀏覽器設置中允許攝像頭權限。';
      } else if (err.name === 'NotFoundError') {
        errorMessage = '未找到攝像頭設備。請檢查設備是否有攝像頭。';
      } else if (err.name === 'NotSupportedError' || err.name === 'SecurityError') {
        // Check if it's a secure context issue
        if (!window.isSecureContext) {
          errorMessage = '❌ iOS 安全限制：無法在非安全來源使用相機\n\n' +
            'iOS 要求相機功能只能在以下環境使用：\n' +
            '1. ✅ HTTPS 網站 (https://...)\n' +
            '2. ✅ localhost (http://localhost:3000)\n' +
            '\n' +
            '❌ 不支援：\n' +
            '• http://192.168.x.x:3000 (開發網址)\n' +
            '• http://10.x.x.x:3000\n' +
            '• 其他非 HTTPS 的 IP 位址\n' +
            '\n' +
            '💡 解決方案：\n' +
            '1. 使用 HTTPS 部署（推薦）\n' +
            '2. 使用 localhost 開發（http://localhost:3000）\n' +
            '3. 或使用「📱 iPhone」標籤進行拍照分析';
        } else {
          errorMessage = '瀏覽器不支援攝像頭功能。請確保使用支援的瀏覽器並訪問 HTTPS 或 localhost。';
        }
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '攝像頭設置不支援。請嘗試使用前置攝像頭。';
      }
      
      setError(errorMessage);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoData);
    onPhotoCapture?.(photoData);
  };

  // Switch camera (front/back)
  const switchCamera = () => {
    if (isStreaming) {
      stopCamera();
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      setTimeout(startCamera, 100);
    } else {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // 檢查是否為 iOS 且無安全來源
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSecureContext = window.isSecureContext;
  // const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      // 如果是 iOS 且無安全來源，顯示特殊訊息
      if (isIOS && !isSecureContext) {
        return (
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>iPhone Safari 攝像頭限制</h3>
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <p style={{ color: '#856404', margin: 0 }}>
                <strong>iOS 安全限制：需要 HTTPS 或 localhost</strong><br/>
                iOS 上所有瀏覽器（Safari/Chrome/Edge）都使用 WebKit，同一套安全限制。
                <br />
                相機功能只能在 HTTPS 或 localhost 環境使用。
                <br />
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
              <p style={{ color: '#155724', margin: 0, marginBottom: '10px' }}>
                點擊 <strong>「📱 iPhone」</strong> 標籤開始使用完整的 iPhone 房屋檢查工作流程
              </p>
            </div>
            
            {/* 實時流指引 */}
            <div style={{
              backgroundColor: '#e3f2fd',
              border: '2px solid #2196F3',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#1565C0', margin: '0 0 15px 0', fontSize: '18px' }}>
                📹 想要實時流檢測？
              </h4>
              <p style={{ color: '#1565C0', marginBottom: '15px' }}>
                iPhone Safari <strong>不支援</strong>實時流媒體，但您可以使用以下方法：
              </p>
              
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '15px',
                textAlign: 'left'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>方法 1：使用 HTTPS 或 localhost（推薦）</strong>
                </div>
                <ul style={{ paddingLeft: '20px', margin: 0, color: '#333' }}>
                  <li><strong>HTTPS 部署</strong>：使用 HTTPS 網址訪問（生產環境）</li>
                  <li><strong>localhost 開發</strong>：使用 http://localhost:3000 訪問</li>
                  <li>注意：http://192.168.x.x:3000 不支援</li>
                </ul>
              </div>
              
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '15px',
                textAlign: 'left'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>方法 2：使用拍照上傳（不受 HTTPS 限制）</strong>
                </div>
                <p style={{ margin: 0, color: '#333' }}>
                  點擊 <strong>「📱 iPhone」</strong> 標籤，使用原生相機拍照後上傳分析
                </p>
              </div>
              
              <button
                onClick={() => {
                  // 觸發切換到實時檢測標籤的事件
                  const event = new CustomEvent('switchTab', { detail: 'iphone-realtime' });
                  window.dispatchEvent(event);
                }}
                style={{
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                📹 查看實時檢測功能
              </button>
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
        📷 實時檢查攝像頭
      </h3>

      {/* Camera Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={isStreaming ? stopCamera : startCamera}
          style={{
            padding: '10px 20px',
            backgroundColor: isStreaming ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isStreaming ? '⏹️ 停止攝像頭' : '▶️ 開始攝像頭'}
        </button>

        <button
          onClick={switchCamera}
          disabled={!isStreaming}
          style={{
            padding: '10px 20px',
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

        <button
          onClick={capturePhoto}
          disabled={!isStreaming}
          style={{
            padding: '10px 20px',
            backgroundColor: isStreaming ? '#ffc107' : '#6c757d',
            color: isStreaming ? '#000' : 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isStreaming ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            opacity: isStreaming ? 1 : 0.6
          }}
        >
          📸 拍照
        </button>
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
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
            <p>點擊「開始攝像頭」來開始實時檢查</p>
          </div>
        )}
      </div>

      {/* Captured Photo */}
      {capturedPhoto && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#333' }}>📸 已拍攝照片:</h4>
          <img
            src={capturedPhoto}
            alt="Captured inspection photo"
            style={{
              width: '100%',
              maxWidth: '400px',
              height: 'auto',
              borderRadius: '8px',
              border: '2px solid #dee2e6'
            }}
          />
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `inspection_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.jpg`;
                link.href = capturedPhoto;
                link.click();
              }}
              style={{
                padding: '8px 15px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px',
                marginRight: '10px'
              }}
            >
              💾 下載照片
            </button>
            <button
              onClick={() => setCapturedPhoto(null)}
              style={{
                padding: '8px 15px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🗑️ 刪除照片
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      {/* RAG Analysis Component */}
      {capturedPhoto && (
        <CameraRAGAnalysis 
          photoData={capturedPhoto}
          onAnalysisComplete={(analysis) => {
            console.log('RAG Analysis completed:', analysis);
            // You can handle the analysis result here
          }}
        />
      )}

      {/* Instructions */}
      <div style={{
        backgroundColor: '#e9ecef',
        padding: '15px',
        borderRadius: '5px',
        fontSize: '14px',
        color: '#495057',
        marginTop: '20px'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#333' }}>📋 使用說明:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>點擊「開始攝像頭」來啟動手機攝像頭</li>
          <li>使用「切換攝像頭」來選擇前置或後置攝像頭</li>
          <li>點擊「拍照」來拍攝檢查照片</li>
          <li>拍攝的照片會自動與 RAG 系統整合進行 AI 分析</li>
          <li>AI 會結合你的 home inspection reports 和感應器數據提供專業建議</li>
        </ul>
      </div>
      </div>
    </BrowserCompatibilityCheck>
  );
};

export default CameraInspection;
