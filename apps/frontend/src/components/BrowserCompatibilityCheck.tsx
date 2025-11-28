import React from 'react';

interface BrowserCompatibilityCheckProps {
  children: React.ReactNode;
}

const BrowserCompatibilityCheck: React.FC<BrowserCompatibilityCheckProps> = ({ children }) => {
  const [isCompatible, setIsCompatible] = React.useState(true);
  const [compatibilityMessage, setCompatibilityMessage] = React.useState('');

  React.useEffect(() => {
    checkBrowserCompatibility();
  }, []);

  const checkBrowserCompatibility = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isEdge = /Edge/.test(userAgent);
    
    // Check for required APIs
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasBluetooth = 'bluetooth' in navigator;
    
    let message = '';
    let compatible = true;
    
    // iOS 安全限制：需要 secure context (HTTPS 或 localhost)
    const isSecureContext = window.isSecureContext;
    if (isIOS && !isSecureContext) {
      message = 'iOS 安全限制：相機功能需要 HTTPS 或 localhost。您可以使用 "📱 iPhone" 標籤進行拍照上傳（不受此限制）。';
      compatible = true; // 允許訪問其他功能
    } else if (!hasGetUserMedia && isIOS) {
      message = 'iOS 上相機功能需要 HTTPS 或 localhost。您可以使用 "📱 iPhone" 標籤進行房屋檢查。';
      compatible = true; // 改為 true，允許訪問其他功能
    } else if (!hasGetUserMedia) {
      message = '您的瀏覽器不支援攝像頭訪問。';
      compatible = false;
    } else if (isIOS) {
      // iOS 上所有瀏覽器都使用 WebKit，限制相同
      message = '在 iPhone 上，相機功能需要 HTTPS 或 localhost 環境。';
      compatible = true; // 改為 true，允許嘗試
    } else if (isAndroid && !isChrome) {
      message = '在 Android 上，建議使用 Chrome 瀏覽器。';
      compatible = true; // 改為 true，允許嘗試
    } else if (!isChrome && !isSafari && !isEdge) {
      message = '建議使用 Chrome、Safari 或 Edge 瀏覽器以獲得最佳體驗。';
      compatible = true; // 改為 true，允許嘗試
    }
    
    if (!hasBluetooth) {
      message += ' 藍牙功能可能不可用。';
    }
    
    setCompatibilityMessage(message);
    setIsCompatible(compatible);
  };

  if (!isCompatible) {
    return (
      <div style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
        <h3 style={{ color: '#856404', marginBottom: '10px' }}>瀏覽器兼容性問題</h3>
        <p style={{ color: '#856404', marginBottom: '15px' }}>
          {compatibilityMessage}
        </p>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '5px',
          fontSize: '14px',
          color: '#495057'
        }}>
          <h4 style={{ marginBottom: '10px' }}>建議的瀏覽器：</h4>
          <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '20px' }}>
            <li><strong>iPhone:</strong> 需要 HTTPS 或 localhost（所有瀏覽器限制相同）</li>
            <li><strong>Android:</strong> Chrome 瀏覽器</li>
            <li><strong>桌面:</strong> Chrome、Safari 或 Edge</li>
          </ul>
        </div>
      </div>
    );
  }

  if (compatibilityMessage) {
    return (
      <div>
        <div style={{
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '5px' }}>ℹ️</div>
          <p style={{ color: '#0c5460', margin: 0, fontSize: '14px' }}>
            {compatibilityMessage}
          </p>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
};

export default BrowserCompatibilityCheck;
