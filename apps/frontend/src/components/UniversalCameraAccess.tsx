import React, { useState, useRef, useEffect } from 'react';

interface UniversalCameraAccessProps {
  onPhotoCapture?: (photoData: string) => void;
  onVideoStream?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
}

const UniversalCameraAccess: React.FC<UniversalCameraAccessProps> = ({ 
  onPhotoCapture, 
  onVideoStream,
  onError 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [apiSupport, setApiSupport] = useState<{
    mediaDevices: boolean;
    getUserMedia: boolean;
    webkitGetUserMedia: boolean;
    mozGetUserMedia: boolean;
  }>({
    mediaDevices: false,
    getUserMedia: false,
    webkitGetUserMedia: false,
    mozGetUserMedia: false
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 檢測 API 支援
  useEffect(() => {
    const checkApiSupport = () => {
      const support = {
        mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        getUserMedia: !!(navigator as any).getUserMedia,
        webkitGetUserMedia: !!(navigator as any).webkitGetUserMedia,
        mozGetUserMedia: !!(navigator as any).mozGetUserMedia
      };
      
      setApiSupport(support);
      
      const debug = `API 支援檢測:
- navigator.mediaDevices: ${support.mediaDevices}
- navigator.getUserMedia: ${support.getUserMedia}
- navigator.webkitGetUserMedia: ${support.webkitGetUserMedia}
- navigator.mozGetUserMedia: ${support.mozGetUserMedia}`;
      
      setDebugInfo(debug);
      
      if (!support.mediaDevices && !support.getUserMedia && !support.webkitGetUserMedia && !support.mozGetUserMedia) {
        const errorMsg = '瀏覽器不支援任何攝像頭 API。請使用支援的瀏覽器或考慮使用原生應用程式。';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };
    
    checkApiSupport();
  }, [onError]);

  // 獲取調試信息
  const getDebugInfo = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    
    return {
      userAgent,
      isIOS,
      isChrome,
      isSafari,
      ...apiSupport
    };
  };

  // 開始攝像頭
  const startCamera = async () => {
    try {
      setError(null);
      setDebugInfo('正在檢查瀏覽器支援...');
      
      const debug = getDebugInfo();
      setDebugInfo(`瀏覽器: ${debug.isChrome ? 'Chrome' : debug.isSafari ? 'Safari' : '其他'} | iOS: ${debug.isIOS} | 現代API: ${debug.mediaDevices}`);
      
      if (!debug.mediaDevices && !debug.getUserMedia && !debug.webkitGetUserMedia && !debug.mozGetUserMedia) {
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
      
      for (let i = 0; i < constraints.length; i++) {
        try {
          setDebugInfo(`嘗試約束條件 ${i + 1}/${constraints.length}...`);
          
          if (debug.mediaDevices) {
            // 使用現代 API
            setDebugInfo('使用現代 API: navigator.mediaDevices.getUserMedia');
            stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          } else if (debug.webkitGetUserMedia) {
            // 使用 WebKit API
            setDebugInfo('使用 WebKit API: navigator.webkitGetUserMedia');
            stream = await new Promise<MediaStream>((resolve, reject) => {
              (navigator as any).webkitGetUserMedia(constraints[i], resolve, reject);
            });
          } else if (debug.mozGetUserMedia) {
            // 使用 Mozilla API
            setDebugInfo('使用 Mozilla API: navigator.mozGetUserMedia');
            stream = await new Promise<MediaStream>((resolve, reject) => {
              (navigator as any).mozGetUserMedia(constraints[i], resolve, reject);
            });
          } else if (debug.getUserMedia) {
            // 使用舊版 API
            setDebugInfo('使用舊版 API: navigator.getUserMedia');
            stream = await new Promise<MediaStream>((resolve, reject) => {
              (navigator as any).getUserMedia(constraints[i], resolve, reject);
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
      
      let errorMessage = `無法訪問攝像頭: ${err.message}`;
      
      if (err.name === 'NotAllowedError') {
        errorMessage = '攝像頭權限被拒絕。請在瀏覽器設置中允許攝像頭權限。';
      } else if (err.name === 'NotFoundError') {
        errorMessage = '未找到攝像頭設備。請檢查設備是否有攝像頭。';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = '瀏覽器不支援攝像頭功能。請使用支援的瀏覽器。';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '攝像頭設置不支援。請嘗試使用前置攝像頭。';
      } else if (err.message.includes('不支援任何攝像頭 API')) {
        errorMessage = '瀏覽器不支援任何攝像頭 API。請使用桌面瀏覽器或考慮使用原生應用程式。';
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
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

  // 拍照
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // 設置畫布尺寸
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 繪製視頻幀到畫布
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 轉換為數據 URL
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoData);
    onPhotoCapture?.(photoData);
    setDebugInfo('照片已拍攝');
  };

  // 切換攝像頭
  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isStreaming) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>📹 通用攝像頭訪問</h3>
      
      {/* API 支援狀態 */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>API 支援狀態:</h4>
        <div>現代 API (mediaDevices): {apiSupport.mediaDevices ? '✅' : '❌'}</div>
        <div>舊版 API (getUserMedia): {apiSupport.getUserMedia ? '✅' : '❌'}</div>
        <div>WebKit API: {apiSupport.webkitGetUserMedia ? '✅' : '❌'}</div>
        <div>Mozilla API: {apiSupport.mozGetUserMedia ? '✅' : '❌'}</div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>❌ 錯誤:</strong> {error}
        </div>
      )}

      {/* 控制按鈕 */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={startCamera}
          disabled={isStreaming}
          style={{
            background: isStreaming ? '#8E8E93' : '#007AFF',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            margin: '5px',
            cursor: isStreaming ? 'not-allowed' : 'pointer'
          }}
        >
          {isStreaming ? '⏹️ 攝像頭運行中' : '📹 開始攝像頭'}
        </button>
        
        <button
          onClick={stopCamera}
          disabled={!isStreaming}
          style={{
            background: !isStreaming ? '#8E8E93' : '#FF6B6B',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            margin: '5px',
            cursor: !isStreaming ? 'not-allowed' : 'pointer'
          }}
        >
          ⏹️ 停止攝像頭
        </button>
        
        <button
          onClick={capturePhoto}
          disabled={!isStreaming}
          style={{
            background: !isStreaming ? '#8E8E93' : '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            margin: '5px',
            cursor: !isStreaming ? 'not-allowed' : 'pointer'
          }}
        >
          📸 拍照
        </button>
        
        <button
          onClick={switchCamera}
          disabled={!isStreaming}
          style={{
            background: !isStreaming ? '#8E8E93' : '#FF9800',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            margin: '5px',
            cursor: !isStreaming ? 'not-allowed' : 'pointer'
          }}
        >
          🔄 切換攝像頭
        </button>
      </div>

      {/* 視頻元素 */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            maxWidth: '400px',
            height: 'auto',
            borderRadius: '8px',
            border: '2px solid #007AFF',
            background: '#000',
            display: isStreaming ? 'block' : 'none'
          }}
        />
      </div>

      {/* 拍攝的照片 */}
      {capturedPhoto && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h4>📸 拍攝的照片:</h4>
          <img
            src={capturedPhoto}
            alt="Captured"
            style={{
              width: '100%',
              maxWidth: '400px',
              height: 'auto',
              borderRadius: '8px',
              border: '2px solid #4CAF50'
            }}
          />
        </div>
      )}

      {/* 調試信息 */}
      <div style={{ 
        background: '#2d3748', 
        color: '#e2e8f0', 
        padding: '15px', 
        borderRadius: '8px', 
        fontFamily: 'monospace',
        fontSize: '12px',
        whiteSpace: 'pre-wrap'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#e2e8f0' }}>🔍 調試信息:</h4>
        {debugInfo || '等待操作...'}
      </div>

      {/* 隱藏的畫布用於拍照 */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default UniversalCameraAccess;
