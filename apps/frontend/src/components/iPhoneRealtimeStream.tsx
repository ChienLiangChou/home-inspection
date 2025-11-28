import React, { useState, useRef, useEffect } from 'react';

interface DetectedIssue {
  id: string;
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  location?: string;
  image?: string; // Base64 snapshot
}

interface iPhoneRealtimeStreamProps {
  onIssueDetected?: (issue: DetectedIssue) => void;
}

const iPhoneRealtimeStream: React.FC<iPhoneRealtimeStreamProps> = ({
  onIssueDetected
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedIssues, setDetectedIssues] = useState<DetectedIssue[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<string>('');
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [streamQuality, setStreamQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [inspectionStartTime, setInspectionStartTime] = useState<Date | null>(null);
  const [reportLink, setReportLink] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [pendingIssue, setPendingIssue] = useState<DetectedIssue | null>(null);
  const [showSolutionPrompt, setShowSolutionPrompt] = useState(false);
  const [showIssuePrompt, setShowIssuePrompt] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<any>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [continuousPhotoMode, setContinuousPhotoMode] = useState(false);
  const [analysisIndicator, setAnalysisIndicator] = useState<string>('');
  const [photoCountdown, setPhotoCountdown] = useState<number | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const continuousPhotoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const issueIdCounter = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Start real-time stream using iPhone camera
  const startRealtimeStream = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Check secure context first (iOS requires HTTPS or localhost)
      const isSecureContext = window.isSecureContext;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHTTPS = window.location.protocol === 'https:';
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      console.log('Security check:', { 
        isSecureContext, 
        isLocalhost, 
        isHTTPS, 
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        isIOS,
        userAgent: navigator.userAgent 
      });
      
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
        alert(errorMsg);
        setIsLoading(false);
        return;
      }
      
      // Check for getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = '您的瀏覽器不支援攝像頭訪問 API。\n\n請確保：\n1. 使用最新版本的瀏覽器\n2. 訪問的是 HTTPS 或 localhost\n3. 或使用「📱 iPhone」標籤進行拍照分析';
        setError(errorMsg);
        alert(errorMsg);
        setIsLoading(false);
        return;
      }

      // For iOS, use simpler constraints
      let constraints: MediaStreamConstraints;
      
      if (isIOS) {
        // iPhone Chrome needs simpler constraints
        constraints = {
          video: {
            facingMode: 'environment'
            // Don't specify width/height/frameRate on iOS - let browser decide
          },
          audio: false
        };
        console.log('Using iOS-optimized constraints');
      } else {
        constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: streamQuality === 'high' ? 1920 : streamQuality === 'medium' ? 1280 : 640 },
            height: { ideal: streamQuality === 'high' ? 1080 : streamQuality === 'medium' ? 720 : 480 },
            frameRate: { ideal: 30 }
          },
          audio: false
        };
      }

      console.log('Requesting camera access with constraints:', constraints);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', stream);
      
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        
        // Wait for video metadata to load
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }
          
          const video = videoRef.current;
          
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            resolve();
          };
          
          const onError = () => {
            video.removeEventListener('error', onError);
            reject(new Error('Video metadata load failed'));
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
          
          // Start playing
          video.play().catch((playError: any) => {
            console.error('Video play error:', playError);
            if (playError.name === 'NotAllowedError') {
              reject(new Error('無法自動播放視頻。請點擊視頻區域手動播放。'));
            } else {
              reject(playError);
            }
          });
        });
        
        console.log('Video playback started, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
      }

      setIsStreaming(true);
      setIsLoading(false);
      setInspectionStartTime(new Date());
      setReportLink(null); // Reset report link when starting new inspection
      
      // Start frame capture after a short delay to ensure video is ready
      setTimeout(() => {
        startFrameCapture();
      }, 500);
      
      // Initialize audio context for alarms
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('AudioContext not supported:', e);
      }
      
      console.log('Real-time stream started successfully');

    } catch (err: any) {
      console.error('Failed to start stream:', err);
      setIsLoading(false);
      setIsStreaming(false);
      
      let errorMessage = '無法啟動攝像頭';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '攝像頭權限被拒絕。\n\n請：\n1. 在瀏覽器設置中允許攝像頭權限\n2. 刷新頁面後重試\n3. 或使用「📱 iPhone」標籤進行拍照分析';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = '未找到攝像頭設備。\n\n請確保：\n1. iPhone 有可用的攝像頭\n2. 沒有其他應用正在使用攝像頭\n3. 或使用「📱 iPhone」標籤進行拍照分析';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = '攝像頭無法訪問。\n\n可能原因：\n1. 攝像頭正被其他應用使用\n2. 系統權限問題\n3. 請關閉其他使用攝像頭的應用後重試';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage = '攝像頭不支持請求的設置。\n\n請嘗試：\n1. 使用更簡單的設置\n2. 或使用「📱 iPhone」標籤進行拍照分析';
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
          errorMessage = `無法啟動攝像頭: ${err.message || err.name || '未知錯誤'}\n\n請確保：\n1. 已授予攝像頭權限\n2. 使用支援的瀏覽器\n3. 訪問的是 HTTPS 或 localhost\n4. 或使用「📱 iPhone」標籤進行拍照分析`;
        }
      } else {
        errorMessage = `無法啟動攝像頭: ${err.message || err.name || '未知錯誤'}\n\n請確保：\n1. 已授予攝像頭權限\n2. 使用支援的瀏覽器\n3. 訪問的是 HTTPS 或 localhost\n4. 或使用「📱 iPhone」標籤進行拍照分析`;
      }
      
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  // Generate inspection report
  const generateReport = async () => {
    if (detectedIssues.length === 0 && !inspectionStartTime) {
      alert('沒有檢測到問題，無法生成報告。');
      return;
    }

    setIsGeneratingReport(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issues: detectedIssues,
          startTime: inspectionStartTime?.toISOString(),
          endTime: new Date().toISOString(),
          streamQuality: streamQuality
        })
      });

      if (!response.ok) {
        throw new Error(`報告生成失敗: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setReportLink(result.downloadLink);
      setReportId(result.reportId);
      
      // Fetch report content for display
      try {
        const reportResponse = await fetch(`/api/reports/${result.reportId}`);
        if (reportResponse.ok) {
          const reportData = await reportResponse.json();
          setReportContent(reportData);
          setShowReport(true);
        }
      } catch (err) {
        console.error('Failed to fetch report content:', err);
      }
      
      // Show success message
      alert(`✅ 檢查報告已生成！\n\n您可以在下方查看報告內容或獲取分享連結。`);
    } catch (err: any) {
      console.error('Report generation error:', err);
      alert(`❌ 報告生成失敗: ${err.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Stop stream
  const stopRealtimeStream = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

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
    
    // Auto-generate report when stopping inspection
    if (inspectionStartTime && detectedIssues.length > 0) {
      await generateReport();
    }
  };

  // Capture frame from video stream
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Start capturing frames periodically
  const startFrameCapture = () => {
    // Wait for video to be ready before starting capture
    const checkVideoReady = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        // Video is ready, start capturing
        frameCaptureIntervalRef.current = setInterval(() => {
          if (isStreaming && !isAnalyzing && videoRef.current) {
            // Check if video has valid dimensions
            if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              const frameData = captureFrame();
              if (frameData) {
                console.log('Frame captured, starting analysis...');
                performRealtimeAnalysis(frameData);
              } else {
                console.warn('Failed to capture frame');
              }
            } else {
              console.warn('Video dimensions not ready yet');
            }
          }
        }, 2000); // Analyze every 2 seconds
      } else {
        // Video not ready yet, check again in 100ms
        setTimeout(checkVideoReady, 100);
      }
    };
    
    checkVideoReady();
  };

  // Perform real-time analysis on captured frame
  const performRealtimeAnalysis = async (frameData: string) => {
    if (isAnalyzing) {
      console.log('Already analyzing, skipping...');
      return; // Skip if already analyzing
    }

    setIsAnalyzing(true);
    setCurrentAnalysis('🔍 正在分析畫面...');
    console.log('Starting real-time analysis...');

    try {
      // Extract base64 data (remove data URL prefix if present)
      const base64Data = frameData.includes(',') 
        ? frameData.split(',')[1] 
        : frameData;

      // Send frame to backend for analysis
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
        console.log('Analysis result:', analysis);
        
        // Store analysis result for display
        setAnalysisResults(prev => [{
          ...analysis,
          timestamp: new Date().toISOString(),
          frameData: frameData
        }, ...prev].slice(0, 10)); // Keep last 10 results
        
        processAnalysisResults(analysis, frameData);
      } else {
        const errorText = await response.text();
        console.error('Analysis failed:', response.status, errorText);
        setCurrentAnalysis(`⚠️ 分析暫時失敗，將繼續嘗試...`);
        setAnalysisIndicator('');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setCurrentAnalysis('❌ 分析失敗: ' + (err.message || '網路錯誤'));
      setAnalysisIndicator('');
    } finally {
      setIsAnalyzing(false);
      // Clear indicator after a delay
      setTimeout(() => setAnalysisIndicator(''), 2000);
    }
  };

  // Process analysis results and detect issues
  const processAnalysisResults = async (analysis: any, frameData: string) => {
    const frameAnalysis = analysis.frameAnalysis || {};
    const issues = frameAnalysis.issues || frameAnalysis.detected_issues || [];
    const recommendations = analysis.ragContext?.recommendations || analysis.frameAnalysis?.recommendations || [];

    if (issues.length > 0) {
      // New issues detected
      for (const issue of issues) {
        const newIssue: DetectedIssue = {
          id: `issue-${Date.now()}-${issueIdCounter.current++}`,
          timestamp: new Date().toISOString(),
          type: issue.type || '未知問題',
          severity: issue.severity || 'medium',
          description: issue.description || '檢測到潛在問題',
          recommendation: issue.recommendation || recommendations[0] || '建議進行專業檢查',
          location: 'current_inspection_site',
          image: frameData
        };

        // Check if similar issue already exists (avoid duplicates)
        // Use setState callback to access current state
        setDetectedIssues(prev => {
          const exists = prev.some(existing => 
            existing.type === newIssue.type && 
            existing.description === newIssue.description &&
            Date.now() - new Date(existing.timestamp).getTime() < 10000 // Within 10 seconds
          );
          
          if (!exists) {
            // Show prompt to user asking if they want solution now or later
            setPendingIssue(newIssue);
            setShowIssuePrompt(true);
            
            // Save to backend (async, don't wait)
            fetch('/api/issues', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                issue_type: newIssue.type,
                severity: newIssue.severity,
                description: newIssue.description,
                recommendation: newIssue.recommendation,
                location: newIssue.location,
                component: 'realtime_inspection',
                image_data: newIssue.image?.split(',')[1], // Remove data URL prefix
                metadata_json: {
                  detection_method: 'realtime_stream',
                  stream_quality: streamQuality
                }
              })
            }).catch(err => {
              console.error('Failed to save issue to backend:', err);
            });

            // Notify user immediately (for real-time streaming, will ask if user wants solution now)
            notifyIssueDetected(newIssue, true);
            onIssueDetected?.(newIssue);
            
            return [newIssue, ...prev];
          }
          return prev;
        });
      }

      // Update current analysis status
      const highSeverityIssues = issues.filter((i: any) => i.severity === 'high');
      if (highSeverityIssues.length > 0) {
        setCurrentAnalysis(`🚨 檢測到 ${highSeverityIssues.length} 個高優先級問題！`);
      } else {
        setCurrentAnalysis(`⚠️ 檢測到 ${issues.length} 個問題`);
      }
    } else {
      setCurrentAnalysis('✅ 目前畫面正常，未檢測到問題');
    }
  };

  // Play alarm sound based on severity
  const playAlarmSound = (severity: 'low' | 'medium' | 'high') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Different frequencies for different severities
      if (severity === 'high') {
        oscillator.frequency.value = 800; // High-pitched alarm
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        
        // Play multiple beeps for high severity
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 800;
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.3, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.5);
        }, 300);
      } else if (severity === 'medium') {
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      } else {
        oscillator.frequency.value = 400;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn('Failed to play alarm sound:', e);
    }
  };

  // Notify user when issue is detected (for real-time streaming)
  const notifyIssueDetected = (issue: DetectedIssue, isRealtime: boolean = true) => {
    // Play alarm sound
    playAlarmSound(issue.severity);
    
    // Visual notification
    const severityEmoji = issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : 'ℹ️';
    const message = `${severityEmoji} 檢測到問題: ${issue.type}\n${issue.description}`;
    
    // Show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('房屋檢查 - 問題檢測', {
        body: message,
        icon: '/vite.svg'
      });
    }

    // For real-time streaming: ask user if they want to see solution now or later
    if (isRealtime) {
      setPendingIssue(issue);
      setShowSolutionPrompt(true);
    } else {
      // For photo analysis: show solution immediately
      alert(`🚨 檢測到問題！\n\n類型: ${issue.type}\n描述: ${issue.description}\n\n解決方案: ${issue.recommendation}`);
    }
  };

  // Handle user's choice for real-time detected issues
  const handleSolutionChoice = (showNow: boolean) => {
    if (!pendingIssue) return;
    
    if (showNow) {
      alert(`🔧 解決方案：\n\n${pendingIssue.recommendation}`);
    }
    // Issue is already saved, just close the prompt
    setPendingIssue(null);
    setShowSolutionPrompt(false);
  };

  // Capture photo during real-time streaming
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      alert('請先啟動實時檢測');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      alert('無法捕獲照片');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    analyzePhoto(photoData);
  };

  // Analyze captured photo immediately
  const analyzePhoto = async (photoData: string) => {
    setIsAnalyzingPhoto(true);
    setPhotoAnalysisResult(null);

    try {
      const base64Data = photoData.includes(',') 
        ? photoData.split(',')[1] 
        : photoData;

      // Use the same endpoint but mark it as photo analysis
      const response = await fetch('/api/rag/analyze-realtime-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: base64Data,
          streamType: 'photo_inspection',
          location: 'current_inspection_site',
          timestamp: new Date().toISOString(),
          quality: streamQuality
        })
      });

      if (response.ok) {
        const analysis = await response.json();
        const frameAnalysis = analysis.frameAnalysis || {};
        const issues = frameAnalysis.issues || [];

        // Process photo analysis results
        if (issues.length > 0) {
          for (const issue of issues) {
            const newIssue: DetectedIssue = {
              id: `photo-${Date.now()}-${issueIdCounter.current++}`,
              timestamp: new Date().toISOString(),
              type: issue.type || '未知問題',
              severity: issue.severity || 'medium',
              description: issue.description || '檢測到潛在問題',
              recommendation: issue.recommendation || '建議進行專業檢查',
              location: 'current_inspection_site',
              image: photoData
            };

            // Save to backend
            fetch('/api/issues', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                issue_type: newIssue.type,
                severity: newIssue.severity,
                description: newIssue.description,
                recommendation: newIssue.recommendation,
                location: newIssue.location,
                component: 'photo_inspection',
                image_data: newIssue.image?.split(',')[1],
                metadata_json: {
                  detection_method: 'photo_analysis',
                  stream_quality: streamQuality
                }
              })
            }).catch(err => {
              console.error('Failed to save photo issue to backend:', err);
            });

            // Add to detected issues list
            setDetectedIssues(prev => [newIssue, ...prev]);
            
            // Notify immediately (not real-time, so show solution right away)
            notifyIssueDetected(newIssue, false);
          }
        } else {
          alert('✅ 照片分析完成：未檢測到問題');
        }

        setPhotoAnalysisResult(analysis);
      } else {
        alert('照片分析失敗，請重試');
      }
    } catch (err: any) {
      console.error('Photo analysis error:', err);
      alert('照片分析錯誤: ' + err.message);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Continuous photo mode for HTTP environment
  const startContinuousPhotoMode = () => {
    setContinuousPhotoMode(true);
    setPhotoCountdown(2);
    setCapturedPhotos([]);
    
    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setPhotoCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Trigger photo capture
          if (photoInputRef.current) {
            photoInputRef.current.click();
          }
          return 2; // Reset to 2 seconds
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopContinuousPhotoMode = () => {
    setContinuousPhotoMode(false);
    setPhotoCountdown(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (continuousPhotoIntervalRef.current) {
      clearInterval(continuousPhotoIntervalRef.current);
      continuousPhotoIntervalRef.current = null;
    }
  };

  const handleContinuousPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newPhoto = files[0];
    setCapturedPhotos(prev => [...prev, newPhoto]);
    
    // Immediately analyze the photo
    await analyzeContinuousPhoto(newPhoto);
    
    // Reset input for next capture
    if (event.target) {
      event.target.value = '';
    }
  };

  const analyzeContinuousPhoto = async (photo: File) => {
    setIsAnalyzingPhoto(true);
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(photo);
      });

      // Analyze using real-time stream API
      const response = await fetch('/api/rag/analyze-realtime-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: base64
        })
      });

      if (response.ok) {
        const analysis = await response.json();
        console.log('Continuous photo analysis:', analysis);
        
        // Process detected issues
        if (analysis.frameAnalysis && analysis.frameAnalysis.detected_issues) {
          analysis.frameAnalysis.detected_issues.forEach((issue: any) => {
            const newIssue: DetectedIssue = {
              id: `continuous_${Date.now()}_${Math.random()}`,
              timestamp: new Date().toISOString(),
              type: issue.type || 'unknown',
              severity: issue.severity || 'medium',
              description: issue.description || '',
              recommendation: issue.recommendation || '',
              location: 'continuous_photo',
              image: `data:image/jpeg;base64,${base64}`
            };
            setDetectedIssues(prev => [newIssue, ...prev]);
            onIssueDetected?.(newIssue);
          });
        }
      }
    } catch (err: any) {
      console.error('Continuous photo analysis error:', err);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealtimeStream();
      stopContinuousPhotoMode();
    };
  }, []);

  // Clear all issues
  const clearIssues = () => {
    setDetectedIssues([]);
  };

  // Check browser compatibility on mount
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSecureContext = window.isSecureContext;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isHTTPS = window.location.protocol === 'https:';
  
  // iOS requires secure context - all iOS browsers (Safari/Chrome/Edge) use WebKit with same restrictions
  const isIOSWithoutSecureContext = isIOS && !isSecureContext;

  return (
    <div style={{ padding: '20px', maxWidth: '100%' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
        📹 iPhone 實時流檢測
      </h2>

      {/* iOS Secure Context Warning */}
      {isIOSWithoutSecureContext && (
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>⚠️</div>
          <h3 style={{ color: '#856404', marginBottom: '15px' }}>
            iOS 安全限制：需要 HTTPS 或 localhost
          </h3>
          <p style={{ color: '#856404', marginBottom: '20px' }}>
            iOS 上所有瀏覽器（Safari、Chrome、Edge）都使用 WebKit，<strong>同一套安全限制</strong>。
            <br />
            相機功能只能在 <strong>HTTPS</strong> 或 <strong>localhost</strong> 環境使用。
          </p>
          
          <div style={{
            background: 'white',
            padding: '15px',
            borderRadius: '6px',
            marginBottom: '15px',
            textAlign: 'left'
          }}>
            <strong>✅ 支援的環境：</strong>
            <ul style={{ paddingLeft: '20px', marginTop: '10px', color: '#333' }}>
              <li>HTTPS 網站 (https://your-domain.com)</li>
              <li>localhost (http://localhost:3000)</li>
            </ul>
            
            <strong style={{ marginTop: '15px', display: 'block' }}>❌ 不支援的環境：</strong>
            <ul style={{ paddingLeft: '20px', marginTop: '10px', color: '#333' }}>
              <li>http://192.168.x.x:3000 (開發網址)</li>
              <li>http://10.x.x.x:3000</li>
              <li>其他非 HTTPS 的 IP 位址</li>
            </ul>
          </div>
          
          <div style={{
            background: '#e3f2fd',
            padding: '15px',
            borderRadius: '6px',
            marginBottom: '15px',
            textAlign: 'left'
          }}>
            <strong>💡 解決方案：</strong>
            <ol style={{ paddingLeft: '20px', marginTop: '10px', color: '#333' }}>
              <li><strong>使用 HTTPS 部署</strong>（推薦，生產環境）</li>
              <li><strong>使用 localhost 開發</strong>（http://localhost:3000）</li>
              <li><strong>使用拍照上傳功能</strong>（不受此限制）</li>
            </ol>
          </div>
          
          <div style={{
            background: '#d4edda',
            padding: '20px',
            borderRadius: '8px',
            marginTop: '20px',
            border: '2px solid #28a745'
          }}>
            <h4 style={{ color: '#155724', marginTop: 0, marginBottom: '15px' }}>
              💡 替代方案：連續拍照模式（每 2 秒）
            </h4>
            <p style={{ color: '#155724', marginBottom: '15px' }}>
              模擬實時流功能：每 2 秒自動提示您拍照，立即分析！
            </p>
            {!continuousPhotoMode ? (
              <button
                onClick={startContinuousPhotoMode}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                📷 啟動連續拍照模式
              </button>
            ) : (
              <div>
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  textAlign: 'center'
                }}>
                  {photoCountdown !== null && (
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                      {photoCountdown}
                    </div>
                  )}
                  <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                    {photoCountdown === 1 ? '📷 請拍照！' : `⏱️ ${photoCountdown} 秒後提示拍照`}
                  </p>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    已拍攝 {capturedPhotos.length} 張照片
                  </p>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleContinuousPhotoUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={stopContinuousPhotoMode}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ⏹️ 停止連續拍照
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              const event = new CustomEvent('switchTab', { detail: 'iphone-workflow' });
              window.dispatchEvent(event);
            }}
            style={{
              background: '#007bff',
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
            📂 使用拍照上傳（不受限制）
          </button>
        </div>
      )}

      {/* Success message for iOS users with secure context */}
      {isIOS && isSecureContext && !isStreaming && (
        <div style={{
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#155724', margin: 0 }}>
            ✅ 您正在使用安全來源（HTTPS 或 localhost），可以進行實時流檢測！
          </p>
        </div>
      )}

      {/* Status and Controls */}
      <div style={{
        background: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
            狀態: {isLoading ? '⏳ 啟動中...' : isStreaming ? '🟢 實時檢測中' : '⚪ 未啟動'}
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
            {error ? `❌ ${error}` : currentAnalysis || '等待啟動...'}
          </div>
          {/* AI Analysis Indicator */}
          {isAnalyzing && (
            <div style={{
              background: '#e3f2fd',
              border: '2px solid #2196F3',
              borderRadius: '6px',
              padding: '8px 12px',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#2196F3',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
              <span style={{ color: '#1976D2', fontWeight: 'bold', fontSize: '13px' }}>
                {analysisIndicator || '🤖 AI 正在分析中...'}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isStreaming && !isLoading ? (
            <button
              onClick={startRealtimeStream}
              disabled={isLoading}
              style={{
                background: isLoading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              ▶️ 開始實時檢測
            </button>
          ) : (
            <button
              onClick={stopRealtimeStream}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ⏹️ 停止檢測
            </button>
          )}
          {detectedIssues.length > 0 && (
            <button
              onClick={clearIssues}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              🗑️ 清除記錄
            </button>
          )}
          {isStreaming && (
            <>
              <button
                onClick={capturePhoto}
                disabled={isAnalyzingPhoto}
                style={{
                  background: isAnalyzingPhoto ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isAnalyzingPhoto ? 'not-allowed' : 'pointer',
                  opacity: isAnalyzingPhoto ? 0.6 : 1,
                  fontWeight: 'bold'
                }}
              >
                {isAnalyzingPhoto ? '⏳ 分析照片中...' : '📸 拍照分析'}
              </button>
              <button
                onClick={() => {
                  const frameData = captureFrame();
                  if (frameData) {
                    console.log('Manual test analysis triggered');
                    performRealtimeAnalysis(frameData);
                  } else {
                    alert('無法捕獲畫面，請確保攝像頭正在運行');
                  }
                }}
                disabled={isAnalyzing}
                style={{
                  background: isAnalyzing ? '#6c757d' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  opacity: isAnalyzing ? 0.6 : 1
                }}
              >
                {isAnalyzing ? '⏳ 分析中...' : '🔍 立即分析'}
              </button>
            </>
          )}
          {!isStreaming && (detectedIssues.length > 0 || inspectionStartTime) && (
            <button
              onClick={generateReport}
              disabled={isGeneratingReport}
              style={{
                background: isGeneratingReport ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: isGeneratingReport ? 'not-allowed' : 'pointer',
                opacity: isGeneratingReport ? 0.6 : 1
              }}
            >
              {isGeneratingReport ? '⏳ 生成中...' : '📄 生成報告'}
            </button>
          )}
        </div>
      </div>

      {/* Report Display Section */}
      {reportLink && (
        <div style={{
          background: '#d4edda',
          border: '2px solid #28a745',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>✅</div>
            <h3 style={{ color: '#155724', marginBottom: '10px' }}>
              檢查報告已生成！
            </h3>
            <p style={{ color: '#155724', marginBottom: '20px' }}>
              您的房屋檢查報告已準備就緒
            </p>
          </div>

          {/* Report Content Display */}
          {reportContent && (
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>
                📄 報告內容
              </h4>
              
              {/* Report Summary */}
              {reportContent.summary && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#495057' }}>
                    檢查摘要:
                  </div>
                  <div style={{ fontSize: '13px', color: '#6c757d', lineHeight: '1.6' }}>
                    <div>• 總問題數: {reportContent.summary.totalIssues || 0}</div>
                    {reportContent.summary.highPriorityIssues > 0 && (
                      <div style={{ color: '#dc3545' }}>• 高優先級: {reportContent.summary.highPriorityIssues}</div>
                    )}
                    {reportContent.summary.mediumPriorityIssues > 0 && (
                      <div style={{ color: '#ffc107' }}>• 中優先級: {reportContent.summary.mediumPriorityIssues}</div>
                    )}
                    {reportContent.summary.lowPriorityIssues > 0 && (
                      <div style={{ color: '#17a2b8' }}>• 低優先級: {reportContent.summary.lowPriorityIssues}</div>
                    )}
                    {reportContent.inspection?.duration && (
                      <div>• 檢查時長: {reportContent.inspection.duration.formatted}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Issues List */}
              {reportContent.issues && reportContent.issues.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#495057' }}>
                    檢測到的問題:
                  </div>
                  {reportContent.issues.slice(0, 5).map((issue: any, index: number) => (
                    <div key={index} style={{
                      background: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#495057' }}>
                        {index + 1}. {issue.type || '未知問題'}
                      </div>
                      <div style={{ color: '#6c757d', marginTop: '4px' }}>
                        {issue.description || '無描述'}
                      </div>
                      {issue.recommendation && (
                        <div style={{ color: '#17a2b8', marginTop: '4px', fontStyle: 'italic' }}>
                          建議: {issue.recommendation}
                        </div>
                      )}
                    </div>
                  ))}
                  {reportContent.issues.length > 5 && (
                    <div style={{ fontSize: '11px', color: '#6c757d', textAlign: 'center', marginTop: '8px' }}>
                      ... 還有 {reportContent.issues.length - 5} 個問題，請下載完整報告查看
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {reportContent.summary?.recommendations && reportContent.summary.recommendations.length > 0 && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#495057' }}>
                    建議:
                  </div>
                  <ul style={{ paddingLeft: '20px', fontSize: '12px', color: '#6c757d', lineHeight: '1.6' }}>
                    {reportContent.summary.recommendations.slice(0, 3).map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => setShowReport(!showReport)}
              style={{
                background: showReport ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {showReport ? '📄 隱藏報告' : '📄 查看完整報告'}
            </button>
            
            <a
              href={reportLink}
              download
              style={{
                display: 'inline-block',
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textDecoration: 'none'
              }}
            >
              📥 下載報告
            </a>
            
            <button
              onClick={async () => {
                const fullUrl = `${window.location.origin}${reportLink}`;
                try {
                  await navigator.clipboard.writeText(fullUrl);
                  alert('✅ 報告連結已複製到剪貼板！\n\n您可以分享給其他人：\n' + fullUrl);
                } catch (err) {
                  // Fallback for older browsers
                  const textArea = document.createElement('textarea');
                  textArea.value = fullUrl;
                  document.body.appendChild(textArea);
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                  alert('✅ 報告連結已複製到剪貼板！\n\n您可以分享給其他人：\n' + fullUrl);
                }
              }}
              style={{
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔗 複製分享連結
            </button>
          </div>

          {/* Share Link Display */}
          <div style={{ marginTop: '15px', fontSize: '12px', color: '#155724' }}>
            <strong>報告連結：</strong>
            <div style={{
              background: 'white',
              padding: '10px',
              borderRadius: '4px',
              marginTop: '5px',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '11px',
              border: '1px solid #c3e6cb'
            }}>
              {window.location.origin}{reportLink}
            </div>
            <div style={{ fontSize: '11px', color: '#856404', marginTop: '8px', fontStyle: 'italic' }}>
              💡 提示：複製此連結可以分享給其他人查看報告
            </div>
          </div>
        </div>
      )}

      {/* Full Report Display (Expandable) */}
      {showReport && reportContent && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>📋 完整檢查報告</h3>
            <button
              onClick={() => setShowReport(false)}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ✕ 關閉
            </button>
          </div>

          {/* Full Report Content */}
          <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#495057' }}>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#333', marginBottom: '10px' }}>檢查信息</h4>
              <div style={{ background: 'white', padding: '12px', borderRadius: '6px' }}>
                <div>報告 ID: {reportContent.reportId}</div>
                <div>生成時間: {new Date(reportContent.generatedAt).toLocaleString('zh-TW')}</div>
                {reportContent.inspection?.startTime && (
                  <div>開始時間: {new Date(reportContent.inspection.startTime).toLocaleString('zh-TW')}</div>
                )}
                {reportContent.inspection?.endTime && (
                  <div>結束時間: {new Date(reportContent.inspection.endTime).toLocaleString('zh-TW')}</div>
                )}
                {reportContent.inspection?.duration && (
                  <div>檢查時長: {reportContent.inspection.duration.formatted}</div>
                )}
              </div>
            </div>

            {reportContent.issues && reportContent.issues.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#333', marginBottom: '10px' }}>所有檢測到的問題 ({reportContent.issues.length})</h4>
                {reportContent.issues.map((issue: any, index: number) => {
                  const severityColor = 
                    issue.severity === 'high' ? '#dc3545' :
                    issue.severity === 'medium' ? '#ffc107' : '#17a2b8';
                  
                  return (
                    <div key={index} style={{
                      background: 'white',
                      border: `2px solid ${severityColor}`,
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: severityColor, marginBottom: '5px' }}>
                        {index + 1}. {issue.type || '未知問題'} ({issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}優先級)
                      </div>
                      <div style={{ color: '#495057', marginBottom: '5px' }}>
                        {issue.description || '無描述'}
                      </div>
                      {issue.recommendation && (
                        <div style={{ color: '#17a2b8', fontSize: '12px', fontStyle: 'italic', marginTop: '5px' }}>
                          💡 建議: {issue.recommendation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {reportContent.summary?.recommendations && reportContent.summary.recommendations.length > 0 && (
              <div>
                <h4 style={{ color: '#333', marginBottom: '10px' }}>整體建議</h4>
                <div style={{ background: 'white', padding: '12px', borderRadius: '6px' }}>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {reportContent.summary.recommendations.map((rec: string, index: number) => (
                      <li key={index} style={{ marginBottom: '8px' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Stream */}
      <div style={{
        position: 'relative',
        background: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '20px',
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            maxHeight: '500px',
            objectFit: 'contain'
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {!isStreaming && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📹</div>
            <div>點擊「開始實時檢測」啟動攝像頭</div>
          </div>
        )}

        {isAnalyzing && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 123, 255, 0.9)',
            color: 'white',
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}>
            🔍 正在分析畫面...
          </div>
        )}
        {isStreaming && !isAnalyzing && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(40, 167, 69, 0.9)',
            color: 'white',
            padding: '8px 15px',
            borderRadius: '6px',
            fontSize: '14px',
            zIndex: 10
          }}>
            ✅ 監控中
          </div>
        )}
      </div>

      {/* Issue Prompt Modal */}
      {showIssuePrompt && pendingIssue && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#dc3545' }}>
              ⚠️ 檢測到問題！
            </h3>
            <div style={{
              background: '#fff3cd',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                問題類型: {pendingIssue.type}
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                嚴重程度: 
                <span style={{
                  color: pendingIssue.severity === 'high' ? '#dc3545' :
                         pendingIssue.severity === 'medium' ? '#ffc107' : '#17a2b8',
                  fontWeight: 'bold',
                  marginLeft: '8px'
                }}>
                  {pendingIssue.severity === 'high' ? '高' :
                   pendingIssue.severity === 'medium' ? '中' : '低'}
                </span>
              </p>
              <p style={{ margin: 0 }}>
                {pendingIssue.description}
              </p>
            </div>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              您希望現在查看解決方案，還是等到最後生成檢查報告時一起查看？
            </p>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button
                onClick={() => {
                  // Show solution now
                  alert(`解決方案：\n\n${pendingIssue.recommendation}`);
                  setShowIssuePrompt(false);
                  setPendingIssue(null);
                }}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✅ 現在查看解決方案
              </button>
              <button
                onClick={() => {
                  // Save for report
                  setShowIssuePrompt(false);
                  setPendingIssue(null);
                }}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📄 保存到報告中
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storage Information */}
      <div style={{
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>
          💾 存儲位置信息
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#495057', marginBottom: '8px' }}>📷 照片存儲:</h4>
          <ul style={{ paddingLeft: '20px', color: '#6c757d', fontSize: '14px' }}>
            <li>所有捕獲的畫面保存在瀏覽器內存中(最多50張)</li>
            <li>檢測到問題的照片會自動保存到後端數據庫</li>
            <li>所有問題和照片會包含在最終的檢查報告中</li>
            <li style={{ color: '#856404', fontWeight: 'bold' }}>
              ⚠️ 注意：照片不會自動保存到 iPhone 相冊，需要手動保存
            </li>
          </ul>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#495057', marginBottom: '8px' }}>📄 報告存儲:</h4>
          <ul style={{ paddingLeft: '20px', color: '#6c757d', fontSize: '14px' }}>
            <li>檢查報告保存在後端服務器</li>
            <li>報告包含所有檢測到的問題、照片和建議</li>
            <li>可以通過「生成報告」按鈕下載報告</li>
          </ul>
        </div>

        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '6px',
          padding: '12px',
          marginTop: '16px'
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#856404' }}>
            💡 <strong>提示：</strong>在實時檢測時，如果看到可能問題的地方，可以點擊「📸 拍照分析」按鈕手動拍照並立即分析。
          </p>
        </div>
      </div>

      {/* Real-time Analysis Results */}
      {analysisResults.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>
            📊 實時分析結果 ({analysisResults.length})
          </h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {analysisResults.slice(0, 5).map((result, index) => {
              const frameAnalysis = result.frameAnalysis || {};
              const objects = frameAnalysis.objects || [];
              const issues = frameAnalysis.issues || frameAnalysis.detected_issues || [];
              const hasIssues = issues.length > 0;
              
              return (
                <div key={index} style={{
                  background: hasIssues ? '#fff3cd' : '#f8f9fa',
                  border: `2px solid ${hasIssues ? '#ffc107' : '#dee2e6'}`,
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '10px'
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
                      {new Date(result.timestamp).toLocaleTimeString('zh-TW')}
                    </div>
                  </div>

                  {/* Analysis Summary */}
                  {frameAnalysis.overall_assessment || frameAnalysis.analysis_summary ? (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '13px', color: '#495057', marginBottom: '5px', fontWeight: 'bold' }}>
                        📋 分析結果:
                      </div>
                      <div style={{
                        background: '#e3f2fd',
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#1976D2',
                        lineHeight: '1.5'
                      }}>
                        {frameAnalysis.overall_assessment || frameAnalysis.analysis_summary || '已完成分析'}
                      </div>
                      {frameAnalysis.confidence && (
                        <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '5px' }}>
                          分析信心度: {Math.round(frameAnalysis.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Detected Objects (only if actually detected) */}
                  {objects.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '5px', fontWeight: 'bold' }}>
                        🔍 檢測到的物件:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {objects.map((obj: any, objIndex: number) => (
                          <div key={objIndex} style={{
                            background: '#e3f2fd',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#1976D2',
                            fontWeight: '500'
                          }}>
                            {obj.type === 'building_structure' ? '🏠 建築結構' : obj.type} 
                            {obj.confidence && (
                              <span style={{ marginLeft: '5px', color: '#666' }}>
                                ({Math.round(obj.confidence * 100)}%)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues Status */}
                  {hasIssues ? (
                    <div style={{
                      background: '#f8d7da',
                      border: '1px solid #f5c6cb',
                      borderRadius: '6px',
                      padding: '10px',
                      marginTop: '10px'
                    }}>
                      <div style={{ color: '#721c24', fontWeight: 'bold', marginBottom: '5px' }}>
                        ⚠️ 檢測到 {issues.length} 個問題:
                      </div>
                      {issues.map((issue: any, issueIndex: number) => (
                        <div key={issueIndex} style={{ fontSize: '12px', color: '#721c24', marginTop: '5px' }}>
                          • <strong>{issue.type || '未知問題'}:</strong> {issue.description || '檢測到潛在問題'}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      background: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '6px',
                      padding: '10px',
                      marginTop: '10px'
                    }}>
                      <div style={{ color: '#155724', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        ✅ 未檢測到問題
                      </div>
                      <div style={{ fontSize: '11px', color: '#155724', marginTop: '5px' }}>
                        畫面正常，未發現結構、濕度、管道、電氣等問題
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detected Issues List */}
      {detectedIssues.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>
            📋 檢測到的問題 ({detectedIssues.length})
          </h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {detectedIssues.map((issue) => {
              const severityColor = 
                issue.severity === 'high' ? '#dc3545' :
                issue.severity === 'medium' ? '#ffc107' : '#17a2b8';
              
              const severityEmoji = 
                issue.severity === 'high' ? '🚨' :
                issue.severity === 'medium' ? '⚠️' : 'ℹ️';

              return (
                <div
                  key={issue.id}
                  style={{
                    background: 'white',
                    border: `2px solid ${severityColor}`,
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: severityColor, marginBottom: '5px' }}>
                        {severityEmoji} {issue.type}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {new Date(issue.timestamp).toLocaleString('zh-TW')}
                      </div>
                    </div>
                    <div style={{
                      background: severityColor,
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <strong>描述:</strong> {issue.description}
                  </div>
                  
                  <div style={{
                    background: '#e3f2fd',
                    padding: '10px',
                    borderRadius: '6px',
                    marginTop: '10px'
                  }}>
                    <strong>💡 解決建議:</strong>
                    <div style={{ marginTop: '5px' }}>{issue.recommendation}</div>
                  </div>

                  {issue.image && (
                    <div style={{ marginTop: '10px' }}>
                      <img
                        src={issue.image}
                        alt="問題截圖"
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          borderRadius: '6px',
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

      {/* Interactive Solution Prompt */}
      {showSolutionPrompt && pendingIssue && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          border: '3px solid #007bff',
          borderRadius: '12px',
          padding: '25px',
          zIndex: 1000,
          maxWidth: '90%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>
              {pendingIssue.severity === 'high' ? '🚨' : pendingIssue.severity === 'medium' ? '⚠️' : 'ℹ️'}
            </div>
            <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>
              檢測到問題！
            </h3>
            <div style={{ marginBottom: '15px' }}>
              <strong>類型：</strong>{pendingIssue.type}
            </div>
            <div style={{ marginBottom: '15px', color: '#6c757d' }}>
              {pendingIssue.description}
            </div>
          </div>
          
          <div style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <strong>您想要：</strong>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => handleSolutionChoice(true)}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                flex: 1
              }}
            >
              🔧 立即查看解決方案
            </button>
            <button
              onClick={() => handleSolutionChoice(false)}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                flex: 1
              }}
            >
              📝 稍後在報告中查看
            </button>
          </div>
          
          <div style={{
            marginTop: '15px',
            fontSize: '12px',
            color: '#6c757d',
            textAlign: 'center'
          }}>
            問題已自動記錄，將包含在檢查報告中
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        background: '#d1ecf1',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #bee5eb'
      }}>
        <h4 style={{ marginTop: 0, color: '#0c5460' }}>📖 使用說明</h4>
        <ol style={{ color: '#0c5460', paddingLeft: '20px', marginBottom: 0 }}>
          <li>點擊「開始實時檢測」啟動攝像頭</li>
          <li>將 iPhone 對準要檢查的區域</li>
          <li>系統會每 2 秒自動分析畫面</li>
          <li>檢測到問題時會立即通知並記錄</li>
          <li>查看下方「檢測到的問題」列表獲取詳細建議</li>
        </ol>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0c5460' }}>
          <strong>注意:</strong> 
          <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
            <li>iOS 要求使用 HTTPS 或 localhost（http://192.168.x.x:3000 不支援）</li>
            <li>iOS 上所有瀏覽器（Safari/Chrome/Edge）都使用 WebKit，限制相同</li>
            <li>確保已授予瀏覽器攝像頭權限（設置 &gt; Safari/Chrome &gt; 相機）</li>
            <li>如果遇到問題，請查看瀏覽器控制台的錯誤信息</li>
            <li>或使用「📱 iPhone」標籤進行拍照上傳分析（不受 HTTPS 限制）</li>
          </ul>
        </div>
        
        {/* Debug info */}
        {error && (
          <div style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            padding: '15px',
            marginTop: '15px',
            fontSize: '12px',
            color: '#721c24'
          }}>
            <strong>錯誤詳情：</strong>
            <div style={{ marginTop: '5px', fontFamily: 'monospace' }}>
              {error}
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px' }}>
              <strong>調試信息：</strong>
              <div>User Agent: {navigator.userAgent}</div>
              <div>Secure Context: {window.isSecureContext ? '✅ 是' : '❌ 否'}</div>
              <div>Protocol: {window.location.protocol}</div>
              <div>Hostname: {window.location.hostname}</div>
              <div>MediaDevices 支援: {navigator.mediaDevices ? '是' : '否'}</div>
              <div>getUserMedia 支援: {navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' ? '是' : '否'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default iPhoneRealtimeStream;

