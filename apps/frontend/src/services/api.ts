import axios from 'axios';
import type { SensorData, ReadingFilter, SensorReadingResponse } from '../types/sensor';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class SensorAPI {
  static async sendSensorData(data: SensorData | SensorData[]): Promise<void> {
    try {
      await apiClient.post('/sensor/data', data);
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
      const wsUrl = `ws://localhost:8000/api/ws/sensor/stream`;
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
