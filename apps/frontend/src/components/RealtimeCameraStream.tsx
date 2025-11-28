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
  const [frameCount, setFrameCount] = useState(0);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [streamingStatus, setStreamingStatus] = useState<string>('未啟動');
  const [detectedIssues, setDetectedIssues] = useState<any[]>([]);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStreamingRef = useRef(false);

  // Start real-time camera stream
  const startRealtimeStream = async () => {
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
        isStreamingRef.current = true;
        setIsStreaming(true);
        setStreamingStatus('🟢 實時流運行中');
        setFrameCount(0);
        setAnalysisCount(0);
        onStreamStart?.(stream);
        
        // Wait for video to be ready and playing before starting analysis
        const video = videoRef.current;
        
        const startWhenReady = () => {
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('Video ready, dimensions:', video.videoWidth, 'x', video.videoHeight);
            setStreamingStatus('🟢 實時流運行中 - 準備分析');
            // Start analysis after a short delay to ensure video is fully ready
            setTimeout(() => {
              startFrameAnalysis();
            }, 500);
          } else {
            // Check again in 100ms
            setTimeout(startWhenReady, 100);
          }
        };
        
        video.addEventListener('loadedmetadata', startWhenReady, { once: true });
        video.addEventListener('playing', () => {
          console.log('Video is playing');
          startWhenReady();
        }, { once: true });
        
        // Also try to start immediately if video is already ready
        if (video.readyState >= 2) {
          startWhenReady();
        }
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

  // Stop real-time stream
  const stopRealtimeStream = async () => {
    console.log('Stopping real-time stream...');
    
    // Perform final analysis before stopping
    if (isStreamingRef.current && videoRef.current && canvasRef.current) {
      console.log('Performing final analysis...');
      setStreamingStatus('🔍 正在進行最後分析...');
      await performRealtimeAnalysis();
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
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    isStreamingRef.current = false;
    setIsStreaming(false);
    setIsAnalyzing(false);
    setStreamingStatus('⚪ 已停止');
    
    // Show summary
    if (detectedIssues.length > 0) {
      alert(`檢查完成！\n\n檢測到 ${detectedIssues.length} 個問題\n已捕獲 ${frameCount} 幀\n已分析 ${analysisCount} 次\n\n所有問題已記錄到報告中。`);
    } else {
      alert(`檢查完成！\n\n未檢測到問題\n已捕獲 ${frameCount} 幀\n已分析 ${analysisCount} 次`);
    }
    
    onStreamStop?.();
  };

  // Start frame analysis
  const startFrameAnalysis = () => {
    console.log('Starting frame analysis...');
    
    // Clear any existing intervals first
    if (frameCaptureIntervalRef.current) {
      clearInterval(frameCaptureIntervalRef.current);
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }
    
    setStreamingStatus('🟢 實時流運行中 - 正在捕獲畫面');
    
    // Capture frame every 2 seconds for analysis
    frameCaptureIntervalRef.current = setInterval(() => {
      if (!isStreamingRef.current) {
        console.log('Streaming stopped, clearing frame capture interval');
        if (frameCaptureIntervalRef.current) {
          clearInterval(frameCaptureIntervalRef.current);
          frameCaptureIntervalRef.current = null;
        }
        return;
      }
      
      if (videoRef.current && canvasRef.current) {
        // Check if video has valid dimensions
        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          const frameData = captureFrameForAnalysis();
          if (frameData) {
            setFrameCount(prev => {
              const newCount = prev + 1;
              console.log(`✅ Frame captured #${newCount}`);
              setStreamingStatus(`🟢 實時流運行中 - 已捕獲 ${newCount} 幀`);
              return newCount;
            });
          } else {
            console.warn('Failed to capture frame');
          }
        } else {
          console.warn('Video dimensions not ready:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        }
      } else {
        console.warn('Video or canvas ref not available');
      }
    }, 2000);

    // Perform analysis every 5 seconds
    analysisIntervalRef.current = setInterval(() => {
      if (!isStreamingRef.current) {
        console.log('Streaming stopped, clearing analysis interval');
        if (analysisIntervalRef.current) {
          clearInterval(analysisIntervalRef.current);
          analysisIntervalRef.current = null;
        }
        return;
      }
      
      if (videoRef.current && canvasRef.current) {
        // Check if video has valid dimensions
        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          if (!isAnalyzing) {
            console.log('🔍 Starting analysis...');
            setStreamingStatus('🔍 正在分析畫面...');
            performRealtimeAnalysis();
          } else {
            console.log('Analysis already in progress, skipping...');
          }
        } else {
          console.warn('Video dimensions not ready for analysis');
        }
      } else {
        console.warn('Video or canvas ref not available for analysis');
      }
    }, 5000);
    
    console.log('✅ Frame analysis intervals started');
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

  // Download image to device
  const downloadImageToDevice = (imageData: string, filename: string) => {
    try {
      const link = document.createElement('a');
      link.download = filename;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  // Play alarm sound
  const playAlarmSound = (severity: 'low' | 'medium' | 'high') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (severity === 'high') {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
      } else if (severity === 'medium') {
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Failed to play alarm:', e);
    }
  };

  // Perform real-time analysis
  const performRealtimeAnalysis = async () => {
    if (!isStreamingRef.current) {
      console.log('Streaming stopped, aborting analysis');
      return;
    }

    setIsAnalyzing(true);
    console.log('🔍 Starting real-time analysis...');
    
    try {
      const frameData = captureFrameForAnalysis();
      if (!frameData) {
        console.warn('No frame data captured');
        setIsAnalyzing(false);
        return;
      }

      // Store captured frame
      setCapturedFrames(prev => [frameData, ...prev].slice(0, 50)); // Keep last 50 frames

      // Extract base64 data
      const base64Data = frameData.includes(',') 
        ? frameData.split(',')[1] 
        : frameData;

      // Send frame to analysis endpoint
      const response = await fetch('/api/rag/analyze-realtime-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: base64Data,
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
        
        const issues = result.frameAnalysis.issues || [];
        
        // Update analysis count
        setAnalysisCount(prev => {
          const newCount = prev + 1;
          console.log(`✅ Analysis #${newCount} completed, issues: ${issues.length}`);
          
          // Update status based on issues
          if (issues.length > 0) {
            setStreamingStatus(`⚠️ 檢測到 ${issues.length} 個問題 - 已分析 ${newCount} 次`);
          } else {
            setStreamingStatus(`✅ 畫面正常 - 已分析 ${newCount} 次`);
          }
          
          return newCount;
        });
        setLastAnalysisTime(new Date());
        
        // Process detected issues
        if (issues.length > 0) {
          console.log(`⚠️ Detected ${issues.length} issues:`, issues);
          
          // Save issues to backend
          for (const issue of issues) {
            const issueData = {
              issue_type: issue.type || '未知問題',
              severity: issue.severity || 'medium',
              description: issue.description || '檢測到潛在問題',
              recommendation: issue.recommendation || '建議進行專業檢查',
              location: 'current_inspection_site',
              component: 'realtime_inspection',
              image_data: base64Data,
              metadata_json: {
                detection_method: 'realtime_stream',
                stream_quality: streamQuality,
                frame_number: frameCount
              }
            };

            // Save to backend
            fetch('/api/issues', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(issueData)
            }).catch(err => {
              console.error('Failed to save issue:', err);
            });

            // Play alarm
            playAlarmSound(issue.severity || 'medium');

            // Save photo to iPhone gallery (if on iOS)
            if (navigator.share && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
              try {
                // Convert base64 to blob
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/jpeg' });
                const file = new File([blob], `inspection_issue_${Date.now()}.jpg`, { type: 'image/jpeg' });
                
                // Use Web Share API to save to Photos
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  navigator.share({
                    files: [file],
                    title: `房屋檢查 - ${issue.type}`,
                    text: `${issue.description}\n建議: ${issue.recommendation}`
                  }).catch(err => {
                    console.log('Share cancelled or failed:', err);
                    // Fallback to download
                    downloadImageToDevice(frameData, `inspection_issue_${Date.now()}.jpg`);
                  });
                } else {
                  // Fallback: download image
                  downloadImageToDevice(frameData, `inspection_issue_${Date.now()}.jpg`);
                }
              } catch (err) {
                console.log('Failed to save to gallery, using download:', err);
                downloadImageToDevice(frameData, `inspection_issue_${Date.now()}.jpg`);
              }
            } else {
              // Non-iOS: just download
              downloadImageToDevice(frameData, `inspection_issue_${Date.now()}.jpg`);
            }

            // Show notification
            const severityEmoji = issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : 'ℹ️';
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('房屋檢查 - 問題檢測', {
                body: `${severityEmoji} ${issue.type}: ${issue.description}`,
                icon: '/vite.svg'
              });
            }

            // Alert for high severity issues
            if (issue.severity === 'high') {
              alert(`🚨 高優先級問題檢測到！\n\n類型: ${issue.type}\n描述: ${issue.description}\n\n建議: ${issue.recommendation}\n\n照片已保存到您的設備！`);
            }
          }

          // Add to detected issues list
          setDetectedIssues(prev => [...issues.map((i: any) => ({
            ...i,
            timestamp: new Date().toISOString(),
            image: frameData
          })), ...prev].slice(0, 20));
        }
        
        setAnalysisResults(prev => [result, ...prev].slice(0, 10));
        onStreamAnalysis?.(result);
      } else {
        const errorText = await response.text();
        console.error('Analysis failed:', response.status, errorText);
        setStreamingStatus('⚠️ 分析服務暫時不可用');
      }
    } catch (err: any) {
      console.error('Realtime analysis error:', err);
      setStreamingStatus('❌ 分析錯誤: ' + (err.message || '網路錯誤'));
    } finally {
      setIsAnalyzing(false);
      if (isStreamingRef.current) {
        setStreamingStatus('🟢 實時流運行中 - 等待下次分析');
      }
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

  // Fetch storage info on mount
  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        const response = await fetch('/api/storage/info');
        if (response.ok) {
          const info = await response.json();
          setStorageInfo(info);
        }
      } catch (err) {
        console.error('Failed to fetch storage info:', err);
      }
    };
    fetchStorageInfo();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealtimeStream();
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

      {/* Streaming Status Indicator */}
      <div style={{
        background: isStreaming ? '#d4edda' : '#f8f9fa',
        border: `2px solid ${isStreaming ? '#28a745' : '#dee2e6'}`,
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: isStreaming ? '#155724' : '#6c757d',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          {isStreaming ? (
            <>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#28a745',
                animation: 'pulse 2s infinite'
              }}></span>
              {streamingStatus}
            </>
          ) : (
            <>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#6c757d'
              }}></span>
              {streamingStatus}
            </>
          )}
        </div>
        
        {isStreaming && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: '15px',
            fontSize: '14px',
            color: '#155724'
          }}>
            <div>
              <strong>已捕獲幀數：</strong> {frameCount}
            </div>
            <div>
              <strong>已分析次數：</strong> {analysisCount}
            </div>
            {lastAnalysisTime && (
              <div>
                <strong>上次分析：</strong> {new Date(lastAnalysisTime).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
        
        {isAnalyzing && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            background: '#fff3cd',
            borderRadius: '6px',
            color: '#856404',
            fontWeight: 'bold'
          }}>
            🔍 AI 正在分析畫面中...
          </div>
        )}
      </div>

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
        marginBottom: '20px',
        border: `3px solid ${isStreaming ? '#28a745' : '#dee2e6'}`,
        boxShadow: isStreaming ? '0 0 20px rgba(40, 167, 69, 0.3)' : 'none'
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
        
        {/* Streaming LIVE indicator */}
        {isStreaming && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(220, 53, 69, 0.95)',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'white',
              animation: 'pulse 1s infinite'
            }}></span>
            LIVE 實時流
          </div>
        )}

        {/* Analysis Overlay */}
        {isAnalyzing && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 123, 255, 0.95)',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            🔍 AI 正在分析畫面...
          </div>
        )}

        {/* Frame and Analysis Counter */}
        {isStreaming && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            zIndex: 10,
            display: 'flex',
            gap: '15px'
          }}>
            <span>📸 幀數: {frameCount}</span>
            <span>🔍 分析: {analysisCount}</span>
            {lastAnalysisTime && (
              <span>⏰ {new Date(lastAnalysisTime).toLocaleTimeString()}</span>
            )}
          </div>
        )}
        
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
      </div>

      {/* Real-time Analysis Results */}
      {/* Detected Issues Summary */}
      {detectedIssues.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#856404', marginTop: 0, marginBottom: '15px' }}>
            ⚠️ 檢測到的問題 ({detectedIssues.length})
          </h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {detectedIssues.map((issue, index) => {
              const severityColor = 
                issue.severity === 'high' ? '#dc3545' :
                issue.severity === 'medium' ? '#ffc107' : '#17a2b8';
              
              return (
                <div key={index} style={{
                  background: 'white',
                  border: `2px solid ${severityColor}`,
                  borderRadius: '6px',
                  padding: '15px',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: severityColor, fontSize: '16px' }}>
                      {issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : 'ℹ️'} {issue.type}
                    </strong>
                    <span style={{
                      background: severityColor,
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}>
                      {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                  <div style={{ marginBottom: '8px', color: '#495057' }}>
                    {issue.description}
                  </div>
                  <div style={{
                    background: '#e3f2fd',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}>
                    <strong>💡 解決方案：</strong> {issue.recommendation}
                  </div>
                  {issue.image && (
                    <div style={{ marginTop: '10px' }}>
                      <img
                        src={issue.image}
                        alt="問題截圖"
                        style={{
                          width: '100%',
                          maxWidth: '200px',
                          borderRadius: '4px',
                          border: '1px solid #dee2e6'
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Captured Frames Info */}
      {capturedFrames.length > 0 && (
        <div style={{
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          marginTop: '20px'
        }}>
          <h4 style={{ color: '#0c5460', marginTop: 0, marginBottom: '10px' }}>
            📸 已捕獲的照片 ({capturedFrames.length})
          </h4>
          <p style={{ color: '#0c5460', fontSize: '13px', marginBottom: '10px' }}>
            <strong>存儲位置：</strong>
            <br />• 所有捕獲的畫面保存在瀏覽器內存中（最多50張）
            <br />• 檢測到問題的照片會自動保存到後端數據庫
            <br />• 所有問題和照片會包含在最終的檢查報告中
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {capturedFrames.slice(0, 5).map((frame, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img
                  src={frame}
                  alt={`Frame ${index + 1}`}
                  style={{
                    width: '80px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                  }}
                />
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `inspection_frame_${Date.now()}_${index}.jpg`;
                    link.href = frame;
                    link.click();
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  💾
                </button>
              </div>
            ))}
            {capturedFrames.length > 5 && (
              <div style={{
                width: '80px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#e9ecef',
                borderRadius: '4px',
                color: '#6c757d',
                fontSize: '12px',
                textAlign: 'center',
                padding: '5px'
              }}>
                +{capturedFrames.length - 5}<br />更多
              </div>
            )}
          </div>
          <button
            onClick={() => {
              // Download all frames individually
              capturedFrames.forEach((frame, index) => {
                setTimeout(() => {
                  const link = document.createElement('a');
                  link.download = `inspection_frame_${Date.now()}_${index}.jpg`;
                  link.href = frame;
                  link.click();
                }, index * 100);
              });
            }}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            📥 下載所有照片 ({capturedFrames.length} 張)
          </button>
        </div>
      )}

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

      {/* Storage Information */}
      {storageInfo && (
        <div style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #90caf9',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          marginTop: '20px'
        }}>
          <h4 style={{ color: '#1565c0', marginTop: 0, marginBottom: '15px' }}>
            💾 存儲位置信息
          </h4>
          
          <div style={{ marginBottom: '15px' }}>
            <strong style={{ color: '#1565c0' }}>📸 照片存儲：</strong>
            <div style={{ marginLeft: '20px', marginTop: '5px', fontSize: '13px', color: '#424242' }}>
              <div>• <strong>文件系統：</strong>{storageInfo.storage_locations?.images?.path || 'N/A'}</div>
              <div>• <strong>已保存照片：</strong>{storageInfo.storage_locations?.images?.count || 0} 張</div>
              <div>• <strong>存儲大小：</strong>{storageInfo.storage_locations?.images?.size_mb || 0} MB</div>
              <div style={{ marginTop: '8px', padding: '8px', background: '#fff', borderRadius: '4px' }}>
                <strong>說明：</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  <li>檢測到問題的照片會自動保存到文件系統</li>
                  <li>所有照片也保存在數據庫中（Base64格式）</li>
                  <li>照片會包含在檢查報告中</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong style={{ color: '#1565c0' }}>📄 報告存儲：</strong>
            <div style={{ marginLeft: '20px', marginTop: '5px', fontSize: '13px', color: '#424242' }}>
              <div>• <strong>文件系統：</strong>{storageInfo.storage_locations?.reports?.path || 'N/A'}</div>
              <div>• <strong>已生成報告：</strong>{storageInfo.storage_locations?.reports?.count || 0} 份</div>
              <div>• <strong>存儲大小：</strong>{storageInfo.storage_locations?.reports?.size_mb || 0} MB</div>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong style={{ color: '#1565c0' }}>🗄️ 數據庫：</strong>
            <div style={{ marginLeft: '20px', marginTop: '5px', fontSize: '13px', color: '#424242' }}>
              <div>• <strong>位置：</strong>{storageInfo.storage_locations?.database?.path || 'N/A'}</div>
              <div>• <strong>內容：</strong>所有檢測到的問題、照片（Base64）、感應器數據</div>
            </div>
          </div>

          <div style={{ marginTop: '15px', padding: '10px', background: '#fff3cd', borderRadius: '4px', fontSize: '12px', color: '#856404' }}>
            <strong>⚠️ 注意：</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>實時流（Streaming）不存儲視頻文件，只存儲捕獲的靜態畫面</li>
              <li>瀏覽器內存中的照片（最多50張）在刷新頁面後會清除</li>
              <li><strong>檢測到問題的照片會同時保存到：</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  <li>✅ <strong>您的 iPhone 相冊</strong>（自動保存，可在「照片」應用中查看）</li>
                  <li>✅ <strong>電腦後端服務器</strong>（文件系統 + 數據庫）</li>
                  <li>✅ <strong>檢查報告</strong>（包含在最終報告中）</li>
                </ul>
              </li>
              <li style={{ marginTop: '8px', fontWeight: 'bold', color: '#1976d2' }}>
                💡 提示：在 iPhone 上，檢測到問題時會自動彈出分享選項，選擇「儲存影像」即可保存到相冊
              </li>
            </ul>
          </div>

          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/storage/images');
                if (response.ok) {
                  const data = await response.json();
                  alert(`已保存的照片列表：\n\n共 ${data.total} 張照片\n\n存儲位置：\n${data.storage_path}\n\n您可以在後端服務器的該目錄中找到所有照片。`);
                }
              } catch (err) {
                alert('無法獲取照片列表');
              }
            }}
            style={{
              marginTop: '10px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            📋 查看所有已保存的照片
          </button>
        </div>
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
