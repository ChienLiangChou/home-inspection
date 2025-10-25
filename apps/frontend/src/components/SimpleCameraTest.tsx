import React, { useState, useRef } from 'react';

interface SimpleCameraTestProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const SimpleCameraTest: React.FC<SimpleCameraTestProps> = ({ onSuccess, onError }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('準備測試攝像頭');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const testCamera = async () => {
    try {
      setError(null);
      setStatus('正在請求攝像頭權限...');
      
      // 檢查支援 - 現代 API 或舊版 API
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasOldGetUserMedia = !!((navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia);
      
      if (!hasMediaDevices && !hasOldGetUserMedia) {
        throw new Error('瀏覽器不支援任何攝像頭 API');
      }
      
      let stream;
      
      if (hasMediaDevices) {
        // 使用現代 API
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
      } else {
        // 使用舊版 API (iPhone Safari)
        stream = await new Promise<MediaStream>((resolve, reject) => {
          const getUserMedia = (navigator as any).getUserMedia || 
                             (navigator as any).webkitGetUserMedia || 
                             (navigator as any).mozGetUserMedia;
          
          getUserMedia.call(navigator, { 
            video: true, 
            audio: false 
          }, resolve, reject);
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setStatus('攝像頭測試成功！');
        onSuccess?.();
      }
    } catch (err: any) {
      console.error('Camera test error:', err);
      const errorMsg = `攝像頭測試失敗: ${err.message}`;
      setError(errorMsg);
      setStatus('攝像頭測試失敗');
      onError?.(errorMsg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setStatus('攝像頭已停止');
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginBottom: '20px', color: '#333' }}>
        📹 簡化攝像頭測試
      </h3>

      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#666', marginBottom: '10px' }}>狀態: {status}</p>
        
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '10px',
            border: '1px solid #f5c6cb'
          }}>
            ❌ {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={isStreaming ? stopCamera : testCamera}
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
          {isStreaming ? '⏹️ 停止測試' : '▶️ 開始測試'}
        </button>
      </div>

      <div style={{
        width: '100%',
        height: '200px',
        backgroundColor: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {isStreaming ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{ color: '#666', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
            <p>點擊「開始測試」來測試攝像頭</p>
          </div>
        )}
      </div>

      <div style={{
        backgroundColor: '#e9ecef',
        padding: '15px',
        borderRadius: '5px',
        fontSize: '14px',
        color: '#495057'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#333' }}>📋 測試說明:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>這個測試使用最簡單的攝像頭請求</li>
          <li>不包含任何複雜的約束條件</li>
          <li>如果這個測試失敗，說明瀏覽器確實不支援攝像頭</li>
          <li>如果成功，說明攝像頭功能正常</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleCameraTest;
