import React, { useState, useEffect } from 'react';
import SimpleBluetoothService from '../services/SimpleBluetoothService';

interface SimpleBluetoothManagerProps {
  onSensorConnected?: (sensor: any) => void;
}

const SimpleBluetoothManager: React.FC<SimpleBluetoothManagerProps> = ({
  onSensorConnected
}) => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const bluetoothService = new SimpleBluetoothService();

  useEffect(() => {
    checkBluetoothSupport();
  }, []);

  const checkBluetoothSupport = async () => {
    try {
      const result = await bluetoothService.checkSupport();
      setIsSupported(result.supported);
      if (!result.supported) {
        setError(result.message);
      }
    } catch (err: any) {
      setError(`藍牙支援檢查失敗: ${err.message}`);
      setIsSupported(false);
    }
  };

  const testBluetooth = async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      const result = await bluetoothService.requestDevice();
      setTestResult(result.message);
      
      if (result.success) {
        onSensorConnected?.({ id: 'test', name: 'Test Device' });
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(`藍牙測試失敗: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  if (isSupported === null) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          🔌 藍牙感應器管理
        </h3>
        <div style={{ textAlign: 'center', color: '#666' }}>
          正在檢查藍牙支援...
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          🔌 藍牙感應器管理
        </h3>
        
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb',
          textAlign: 'center'
        }}>
          ❌ {error}
        </div>

        <div style={{
          backgroundColor: '#e9ecef',
          padding: '15px',
          borderRadius: '5px',
          fontSize: '14px',
          color: '#495057'
        }}>
          <h4 style={{ marginBottom: '10px', color: '#333' }}>📋 解決方案:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>請使用支援 Web Bluetooth 的現代瀏覽器</li>
            <li>Chrome 瀏覽器通常支援藍牙功能</li>
            <li>確保設備有藍牙功能</li>
            <li>檢查瀏覽器權限設置</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginBottom: '20px', color: '#333' }}>
        🔌 藍牙感應器管理
      </h3>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      {testResult && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          ✅ {testResult}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={testBluetooth}
          disabled={isScanning}
          style={{
            padding: '12px 20px',
            backgroundColor: isScanning ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            flex: 1
          }}
        >
          {isScanning ? '⏳ 測試中...' : '🔍 測試藍牙'}
        </button>

        <button
          onClick={checkBluetoothSupport}
          style={{
            padding: '12px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            flex: 1
          }}
        >
          🔄 重新檢查
        </button>
      </div>

      <div style={{
        backgroundColor: '#e9ecef',
        padding: '15px',
        borderRadius: '5px',
        fontSize: '14px',
        color: '#495057'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#333' }}>📋 使用說明:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>點擊「測試藍牙」來檢查藍牙功能</li>
          <li>確保設備支援藍牙功能</li>
          <li>使用支援 Web Bluetooth 的瀏覽器</li>
          <li>允許瀏覽器訪問藍牙設備</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleBluetoothManager;
