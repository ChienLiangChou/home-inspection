export interface Sensor {
  id: number;
  sensor_id: string;
  vendor: string;
  model: string;
  type: string;
  created_at: string;
}

export interface Reading {
  id: number;
  sensor_id: string;
  type: string;
  location: string;
  value: number;
  unit: string;
  confidence: number;
  calibration_json?: Record<string, any>;
  extras_json?: Record<string, any>;
  timestamp: string;
  created_at: string;
}

export interface SensorData {
  sensor_id: string;
  vendor: string;
  model: string;
  type: string;
  location: string;
  value: number;
  unit: string;
  confidence: number;
  calibration_json?: Record<string, any>;
  extras_json?: Record<string, any>;
  timestamp: string;
}

export interface ReadingFilter {
  type?: string;
  location?: string;
  since?: string;
  limit?: number;
}

export interface SensorReadingResponse {
  sensor: Sensor;
  latest_reading: Reading;
}

export type SensorType = 'moisture_meter' | 'co2' | 'thermal_spot';
export type SensorLocation = 'roof' | 'basement' | 'kitchen' | 'living_room' | 'bathroom';
