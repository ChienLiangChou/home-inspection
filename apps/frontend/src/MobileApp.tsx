import { useState, useEffect } from 'react';
import CameraInspection from './components/CameraInspection';
import SimpleBluetoothManager from './components/SimpleBluetoothManager';
import RealtimeCameraStream from './components/RealtimeCameraStream';
import DirectCameraAccess from './components/DirectCameraAccess';
import SimpleCameraTest from './components/SimpleCameraTest';
import UniversalCameraAccess from './components/UniversalCameraAccess';
import SimpleiPhoneWorkflow from './components/SimpleiPhoneWorkflow';

interface SensorReading {
  id: number;
  sensor_id: number;
  type: string;
  location: string;
  value: number;
  unit: string;
  confidence: number;
  timestamp: string;
}

export default function MobileApp() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'testing' | 'camera' | 'realtime-stream' | 'bluetooth' | 'realtime' | 'direct-camera' | 'simple-test' | 'universal-camera' | 'iphone-workflow'>('dashboard');

  // Fetch sensor data
  const fetchSensorData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/sensor/latest?limit=10');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setReadings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sensor data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchSensorData();
  }, []);

  // Send test data
  const sendTestData = async () => {
    try {
      const testData = {
        sensors: [{
          sensor_id: "test_mobile_001",
          vendor: "MobileTest",
          model: "TestModel",
          type: "temperature"
        }],
        readings: [{
          sensor_id: "test_mobile_001",
          type: "temperature",
          location: "mobile_test",
          value: Math.round((Math.random() * 20 + 15) * 10) / 10,
          unit: "°C",
          confidence: 0.95,
          timestamp: new Date().toISOString()
        }]
      };

      const response = await fetch('/api/sensor/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        alert('Test data sent successfully!');
        fetchSensorData(); // Refresh data
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      alert('Failed to send test data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#343a40',
        color: 'white',
        padding: '15px 20px',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>🏠 Home Inspection System</h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.8 }}>Mobile Sensor Dashboard</p>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        backgroundColor: 'white',
        borderBottom: '1px solid #dee2e6',
        marginBottom: '20px'
      }}>
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'testing', label: '🧪 Testing' },
          { id: 'camera', label: '📷 Camera' },
          { id: 'realtime-stream', label: '📹 Live' },
          { id: 'bluetooth', label: '🔌 Bluetooth' },
          { id: 'realtime', label: '🤖 AI' },
          { id: 'direct-camera', label: '🎥 Direct' },
          { id: 'simple-test', label: '🔧 Test' },
          { id: 'universal-camera', label: '🌐 Universal' },
          { id: 'iphone-workflow', label: '📱 iPhone' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '15px 10px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#495057',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px 20px 20px' }}>
        {activeTab === 'dashboard' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Sensor Dashboard</h2>
              <button
                onClick={fetchSensorData}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '20px',
                border: '1px solid #f5c6cb'
              }}>
                ❌ Error: {error}
              </div>
            )}

            {isLoading && !error && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6c757d'
              }}>
                ⏳ Loading sensor data...
              </div>
            )}

            {!isLoading && !error && readings.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6c757d'
              }}>
                📭 No sensor data available
              </div>
            )}

            {!isLoading && !error && readings.length > 0 && (
              <div>
                {readings.map((reading) => (
                  <div key={reading.id} style={{
                    backgroundColor: 'white',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#495057' }}>
                          {reading.type.charAt(0).toUpperCase() + reading.type.slice(1)}
                        </h3>
                        <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6c757d' }}>
                          📍 {reading.location}
                        </p>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>
                          🕒 {formatTimestamp(reading.timestamp)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                          {reading.value}{reading.unit}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          Confidence: {Math.round(reading.confidence * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'testing' && (
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Mock Data Testing</h2>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #dee2e6'
            }}>
              <p style={{ marginBottom: '20px', color: '#6c757d' }}>
                Generate test sensor data to verify the system is working correctly.
              </p>
              <button
                onClick={sendTestData}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                🧪 Send Test Data
              </button>
            </div>
          </div>
        )}

        {activeTab === 'camera' && (
          <div>
            <CameraInspection 
              onPhotoCapture={(photoData) => {
                console.log('Photo captured:', photoData);
                // Here you can send the photo to AI for analysis
              }}
              onVideoStream={(stream) => {
                console.log('Video stream started:', stream);
              }}
            />
          </div>
        )}

        {activeTab === 'realtime-stream' && (
          <div>
            <RealtimeCameraStream 
              onStreamAnalysis={(analysis) => {
                console.log('Realtime stream analysis:', analysis);
                // Refresh sensor data when analysis is complete
                fetchSensorData();
              }}
              onStreamStart={(stream) => {
                console.log('Realtime stream started:', stream);
              }}
              onStreamStop={() => {
                console.log('Realtime stream stopped');
              }}
            />
          </div>
        )}

        {activeTab === 'bluetooth' && (
          <div>
            <SimpleBluetoothManager 
              onSensorConnected={(sensor: any) => {
                console.log('Bluetooth sensor connected:', sensor);
              }}
            />
          </div>
        )}

        {activeTab === 'realtime' && (
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Realtime AI Interface</h2>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #dee2e6',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🤖</div>
              <h3 style={{ marginBottom: '15px', color: '#495057' }}>AI Integration Ready</h3>
              <p style={{ color: '#6c757d', marginBottom: '20px' }}>
                The AI system will have access to sensor readings and provide contextual recommendations for roofing, plumbing, and other inspection scenarios.
              </p>
              <div style={{
                backgroundColor: '#e9ecef',
                padding: '15px',
                borderRadius: '4px',
                fontSize: '14px',
                color: '#495057'
              }}>
                <strong>Available Sensor Data:</strong><br />
                • Temperature readings<br />
                • CO2 concentration levels<br />
                • Moisture measurements<br />
                • Real-time monitoring<br />
                • Camera inspection photos
              </div>
            </div>
          </div>
        )}

        {activeTab === 'direct-camera' && (
          <div>
            <DirectCameraAccess 
              onPhotoCapture={(photoData) => {
                console.log('Direct camera photo captured:', photoData);
              }}
              onVideoStream={(stream) => {
                console.log('Direct camera stream started:', stream);
              }}
            />
          </div>
        )}

        {activeTab === 'simple-test' && (
          <div>
            <SimpleCameraTest 
              onSuccess={() => {
                console.log('Simple camera test successful');
                alert('攝像頭測試成功！');
              }}
              onError={(error) => {
                console.log('Simple camera test failed:', error);
                alert('攝像頭測試失敗: ' + error);
              }}
            />
          </div>
        )}

        {activeTab === 'universal-camera' && (
          <div>
            <UniversalCameraAccess 
              onPhotoCapture={(photoData) => {
                console.log('Universal camera photo captured:', photoData);
                alert('照片已拍攝！');
              }}
              onVideoStream={(stream) => {
                console.log('Universal camera stream started:', stream);
              }}
              onError={(error) => {
                console.log('Universal camera error:', error);
                alert('攝像頭錯誤: ' + error);
              }}
            />
          </div>
        )}

        {activeTab === 'iphone-workflow' && (
          <div>
            <SimpleiPhoneWorkflow />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px 20px',
        borderTop: '1px solid #dee2e6',
        textAlign: 'center',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <div style={{ marginBottom: '5px' }}>
          <span style={{ color: '#28a745' }}>●</span> Backend Connected
        </div>
        <div>Home Inspection System v1.0.0</div>
      </div>
    </div>
  );
}
