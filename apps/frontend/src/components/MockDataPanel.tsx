import React, { useState } from 'react';
import { SensorAPI } from '../services/api';
import { SensorData, SensorType } from '../types/sensor';
import { 
  Play, 
  RotateCcw, 
  Send, 
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react';

const mockSensors: SensorData[] = [
  {
    sensor_id: 'ble_moist_001',
    vendor: 'BLE Moisture',
    model: 'MM-001',
    type: 'moisture_meter',
    location: 'basement',
    value: 45.2,
    unit: '%',
    confidence: 0.95,
    timestamp: new Date().toISOString(),
    calibration_json: { temperature_compensation: true },
    extras_json: { humidity: 62, temperature: 22 }
  },
  {
    sensor_id: 'ble_co2_003',
    vendor: 'BLE Air',
    model: 'CO2-003',
    type: 'co2',
    location: 'living_room',
    value: 420,
    unit: 'ppm',
    confidence: 0.88,
    timestamp: new Date().toISOString(),
    calibration_json: { auto_calibration: true },
    extras_json: { air_quality: 'good', ventilation_rate: 1.2 }
  },
  {
    sensor_id: 'ble_ir_002',
    vendor: 'BLE Thermal',
    model: 'IR-002',
    type: 'thermal_spot',
    location: 'roof',
    value: 23.5,
    unit: '°C',
    confidence: 0.92,
    timestamp: new Date().toISOString(),
    calibration_json: { emissivity: 0.95 },
    extras_json: { ambient_temp: 21.2, surface_type: 'shingle' }
  }
];

export const MockDataPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const sendMockData = async (data: SensorData | SensorData[]) => {
    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      await SensorAPI.sendSensorData(data);
      setStatus({
        type: 'success',
        message: `Successfully sent ${Array.isArray(data) ? data.length : 1} sensor reading(s)`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Failed to send sensor data. Check console for details.'
      });
      console.error('Error sending mock data:', error);
    } finally {
      setIsLoading(false);
      // Clear status after 3 seconds
      setTimeout(() => {
        setStatus({ type: null, message: '' });
      }, 3000);
    }
  };

  const generateRandomData = (): SensorData[] => {
    return mockSensors.map(sensor => ({
      ...sensor,
      value: generateRandomValue(sensor.type as SensorType),
      confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
      timestamp: new Date().toISOString(),
      extras_json: {
        ...sensor.extras_json,
        ...(sensor.type === 'moisture_meter' && {
          humidity: Math.random() * 30 + 50,
          temperature: Math.random() * 10 + 18
        }),
        ...(sensor.type === 'co2' && {
          air_quality: ['good', 'moderate', 'poor'][Math.floor(Math.random() * 3)],
          ventilation_rate: Math.random() * 2 + 0.5
        }),
        ...(sensor.type === 'thermal_spot' && {
          ambient_temp: Math.random() * 10 + 18,
          surface_type: ['shingle', 'metal', 'concrete'][Math.floor(Math.random() * 3)]
        })
      }
    }));
  };

  const generateRandomValue = (type: SensorType): number => {
    switch (type) {
      case 'moisture_meter':
        return Math.random() * 50 + 20; // 20-70%
      case 'co2':
        return Math.random() * 200 + 300; // 300-500 ppm
      case 'thermal_spot':
        return Math.random() * 20 + 15; // 15-35°C
      default:
        return Math.random() * 100;
    }
  };

  const handleSendAll = () => sendMockData(mockSensors);
  const handleSendRandom = () => sendMockData(generateRandomData());
  const handleSendSingle = (sensor: SensorData) => sendMockData(sensor);

  return (
    <div className="bg-white rounded-lg shadow-md border border-zinc-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 flex items-center">
          <Play className="w-5 h-5 mr-2 text-zinc-600" />
          Mock Data Testing
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handleSendAll}
            disabled={isLoading}
            className="px-4 py-2 bg-zinc-600 text-white rounded-md hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Send All</span>
          </button>
          <button
            onClick={handleSendRandom}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Random Data</span>
          </button>
        </div>
      </div>

      {/* Status Message */}
      {status.type && (
        <div className={`
          mb-4 p-3 rounded-md flex items-center space-x-2
          ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}
        `}>
          {status.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{status.message}</span>
        </div>
      )}

      {/* Individual Sensor Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-700 mb-3">Send Individual Readings:</h3>
        {mockSensors.map((sensor) => (
          <div key={sensor.sensor_id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-md">
            <div className="flex items-center space-x-3">
              <div className="text-sm">
                <span className="font-medium text-zinc-900">{sensor.sensor_id}</span>
                <span className="text-zinc-600 ml-2 capitalize">
                  {sensor.type.replace('_', ' ')} - {sensor.location}
                </span>
              </div>
              <div className="text-sm text-zinc-600">
                {sensor.value} {sensor.unit}
              </div>
            </div>
            <button
              onClick={() => handleSendSingle(sensor)}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-200">
        <p className="text-xs text-zinc-500">
          Use these controls to test the sensor data API endpoints. 
          Data will be sent to the backend and can be viewed in the sensor panel above.
        </p>
      </div>
    </div>
  );
};
