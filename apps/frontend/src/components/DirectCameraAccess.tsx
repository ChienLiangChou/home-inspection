import React, { useState, useRef, useEffect } from 'react';

interface DirectCameraAccessProps {
  onPhotoCapture?: (photoData: string) => void;
  onVideoStream?: (stream: MediaStream) => void;
}

const DirectCameraAccess: React.FC<DirectCameraAccessProps> = ({ 
  onPhotoCapture, 
  onVideoStream 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 獲取調試信息
  const getDebugInfo = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasWebRTC = !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection);
    
    return {
      userAgent,
      isIOS,
      isChrome,
      isSafari,
      hasGetUserMedia,
      hasWebRTC,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled
    };
  };

  // 開始攝像頭
  const startCamera = async () => {
    try {
      setError(null);
      setDebugInfo('正在檢查瀏覽器支援...');
      
      const debug = getDebugInfo();
      setDebugInfo(`瀏覽器: ${debug.isChrome ? 'Chrome' : debug.isSafari ? 'Safari' : '其他'} | iOS: ${debug.isIOS} | getUserMedia: ${debug.hasGetUserMedia}`);
      
      if (!debug.hasGetUserMedia && !((navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia)) {
        throw new Error('瀏覽器不支援任何攝像頭 API');
      }
      
      setDebugInfo('正在請求攝像頭權限...');
      
      // 嘗試多種約束條件
      const constraints = [
        // 最簡單的約束
        { video: true, audio: false },
        // 基本約束
        { video: { facingMode: facingMode }, audio: false },
        // 完整約束
        { 
          video: { 
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: false 
        }
      ];
      
      let stream: MediaStream | null = null;
      let lastError: Error | null = null;
      
      // 檢查是否有現代 API
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      for (let i = 0; i < constraints.length; i++) {
        try {
          setDebugInfo(`嘗試約束條件 ${i + 1}/${constraints.length}...`);
          
          if (hasMediaDevices) {
            // 使用現代 API
            stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          } else {
            // 使用舊版 API (iPhone Safari)
            stream = await new Promise<MediaStream>((resolve, reject) => {
              const getUserMedia = (navigator as any).getUserMedia || 
                                 (navigator as any).webkitGetUserMedia || 
                                 (navigator as any).mozGetUserMedia;
              
              getUserMedia.call(navigator, constraints[i], resolve, reject);
            });
          }
          
          setDebugInfo(`成功使用約束條件 ${i + 1}`);
          break;
        } catch (err: any) {
          lastError = err;
          setDebugInfo(`約束條件 ${i + 1} 失敗: ${err.message}`);
        }
      }
      
      if (!stream) {
        throw lastError || new Error('所有約束條件都失敗了');
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setDebugInfo('攝像頭已啟動');
        onVideoStream?.(stream);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      let errorMessage = `攝像頭訪問失敗: ${err.message}`;
      
      if (err.name === 'NotAllowedError') {
        errorMessage = '攝像頭權限被拒絕。請在瀏覽器設置中允許攝像頭權限。';
      } else if (err.name === 'NotFoundError') {
        errorMessage = '未找到攝像頭設備。';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = '瀏覽器不支援攝像頭功能。';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '攝像頭設置不支援。';
      }
      
      setError(errorMessage);
      setDebugInfo(`錯誤: ${errorMessage}`);
    }
  };

  // 停止攝像頭
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setDebugInfo('攝像頭已停止');
  };

  // 切換攝像頭
  const switchCamera = () => {
    if (isStreaming) {
      stopCamera();
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      setTimeout(startCamera, 100);
    } else {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  };

  // 拍照
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoData);
    onPhotoCapture?.(photoData);
    setDebugInfo('照片已拍攝');
  };

  // 清理
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
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
        📹 直接攝像頭訪問
      </h3>

      {/* 調試信息 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '20px',
        fontSize: '12px',
        color: '#666',
        fontFamily: 'monospace'
      }}>
        <strong>調試信息:</strong> {debugInfo}
      </div>

      {/* 錯誤顯示 */}
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

      {/* 控制按鈕 */}
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

      {/* 視頻流 */}
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
            <p>點擊「開始攝像頭」來開始測試</p>
          </div>
        )}
      </div>

      {/* 拍攝的照片 */}
      {capturedPhoto && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#333' }}>📸 已拍攝照片:</h4>
          <img
            src={capturedPhoto}
            alt="Captured photo"
            style={{
              width: '100%',
              maxWidth: '400px',
              height: 'auto',
              borderRadius: '8px',
              border: '2px solid #dee2e6'
            }}
          />
        </div>
      )}

      {/* 隱藏的畫布 */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default DirectCameraAccess;
