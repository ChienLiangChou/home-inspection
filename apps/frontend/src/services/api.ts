import axios from 'axios';
import type { ReadingFilter, SensorReadingResponse } from '../types/sensor';

// Use VITE_API_URL if set (production), otherwise use relative path (development with proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class SensorAPI {
  /**
   * Send sensor data to the backend.
   * The backend expects a SensorDataBatch with separate sensors and readings arrays.
   * This method accepts either:
   * - A single SensorData object (will be split into sensor and reading)
   * - An array of SensorData objects
   * - A properly formatted SensorDataBatch object
   */
  static async sendSensorData(data: any): Promise<void> {
    try {
      // If data already has sensors and readings arrays, use it directly
      if (data.sensors && data.readings) {
        await apiClient.post('/sensor/data', data);
        return;
      }

      // Otherwise, convert SensorData format to SensorDataBatch format
      const dataArray = Array.isArray(data) ? data : [data];
      
      const batch = {
        sensors: dataArray.map((item: any) => ({
          sensor_id: item.sensor_id,
          vendor: item.vendor || 'Unknown',
          model: item.model || 'Unknown',
          type: item.type
        })),
        readings: dataArray.map((item: any) => ({
          sensor_id: item.sensor_id,
          type: item.type,
          location: item.location,
          value: item.value,
          unit: item.unit,
          confidence: item.confidence,
          calibration_json: item.calibration_json,
          extras_json: item.extras_json,
          timestamp: item.timestamp || new Date().toISOString()
        }))
      };

      await apiClient.post('/sensor/data', batch);
    } catch (error) {
      console.error('Failed to send sensor data:', error);
      throw error;
    }
  }

  static async getLatestReadings(filter?: ReadingFilter): Promise<SensorReadingResponse[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.type) params.append('type', filter.type);
      if (filter?.location) params.append('location', filter.location);
      if (filter?.since) params.append('since', filter.since);
      if (filter?.limit) params.append('limit', filter.limit.toString());

      const response = await apiClient.get(`/sensor/latest?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch latest readings:', error);
      throw error;
    }
  }
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private onMessage: (data: any) => void,
    private onError?: (error: Event) => void,
    private onOpen?: () => void,
    private onClose?: () => void
  ) {}

  connect(): void {
    try {
      // Use Vite proxy for WebSocket in development, or direct connection in production
      // Vite proxy handles /api/* routes, so we use ws://localhost:3000/api/ws/sensor/stream
      // which gets proxied to the backend
      const isDev = import.meta.env.DEV;
      let wsUrl: string;
      
      if (isDev) {
        // In development, use the Vite dev server (which proxies to backend)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/api/ws/sensor/stream`;
      } else {
        // In production, connect directly to backend
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const wsProtocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:';
        const wsHost = backendUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        wsUrl = `${wsProtocol}//${wsHost}/api/ws/sensor/stream`;
      }
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.onClose?.();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, delay);
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
