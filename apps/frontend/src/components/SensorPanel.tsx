import React, { useState, useEffect } from 'react';
import { SensorAPI, WebSocketService } from '../services/api';
import { SensorCard } from './SensorCard';
import { SensorReadingResponse } from '../types/sensor';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle,
  Loader2
} from 'lucide-react';

export const SensorPanel: React.FC = () => {
  const [readings, setReadings] = useState<SensorReadingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchReadings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await SensorAPI.getLatestReadings();
      setReadings(data);
    } catch (err) {
      setError('Failed to fetch sensor readings');
      console.error('Error fetching readings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWebSocket = () => {
    if (wsService) {
      wsService.disconnect();
      setWsService(null);
      setWsConnected(false);
    } else {
      const ws = new WebSocketService(
        (data) => {
          console.log('WebSocket message received:', data);
          // Refresh readings when new data arrives
          fetchReadings();
        },
        (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        },
        () => {
          console.log('WebSocket connected');
          setWsConnected(true);
        },
        () => {
          console.log('WebSocket disconnected');
          setWsConnected(false);
        }
      );
      
      ws.connect();
      setWsService(ws);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && !wsConnected) {
      interval = setInterval(fetchReadings, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, wsConnected]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsService) {
        wsService.disconnect();
      }
    };
  }, [wsService]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-zinc-600" />
          <h1 className="text-2xl font-bold text-zinc-900">Sensor Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Auto Refresh Toggle */}
          <button
            onClick={toggleAutoRefresh}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2
              ${autoRefresh 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }
            `}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>Auto Refresh</span>
          </button>

          {/* WebSocket Toggle */}
          <button
            onClick={toggleWebSocket}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2
              ${wsConnected 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }
            `}
          >
            {wsConnected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span>{wsConnected ? 'WebSocket' : 'Connect WS'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchReadings}
            disabled={isLoading}
            className="px-3 py-2 bg-zinc-600 text-white rounded-md hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className={wsConnected ? 'text-green-600' : 'text-gray-600'}>
            WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {autoRefresh && !wsConnected && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-blue-600">Auto Refresh: 5s</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && readings.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
          <span className="ml-3 text-zinc-600">Loading sensor readings...</span>
        </div>
      )}

      {/* Sensor Cards */}
      {readings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {readings.map(({ sensor, latest_reading }) => (
            <SensorCard
              key={sensor.id}
              sensor={sensor}
              reading={latest_reading}
              isOnline={true}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && readings.length === 0 && !error && (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 mb-2">No Sensor Data</h3>
          <p className="text-zinc-600 mb-4">
            No sensor readings found. Use the mock data panel below to send test data.
          </p>
        </div>
      )}
    </div>
  );
};
