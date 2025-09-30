import React from 'react';
import { Sensor, Reading } from '../types/sensor';
import { 
  Droplets, 
  Thermometer, 
  Wind, 
  Clock, 
  MapPin, 
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

interface SensorCardProps {
  sensor: Sensor;
  reading: Reading;
  isOnline?: boolean;
}

const getSensorIcon = (type: string) => {
  switch (type) {
    case 'moisture_meter':
      return <Droplets className="w-5 h-5 text-blue-500" />;
    case 'thermal_spot':
      return <Thermometer className="w-5 h-5 text-red-500" />;
    case 'co2':
      return <Wind className="w-5 h-5 text-green-500" />;
    default:
      return <Activity className="w-5 h-5 text-zinc-500" />;
  }
};

const getStatusColor = (confidence: number) => {
  if (confidence >= 0.9) return 'text-green-600';
  if (confidence >= 0.7) return 'text-yellow-600';
  return 'text-red-600';
};

const getStatusIcon = (confidence: number) => {
  if (confidence >= 0.9) return <CheckCircle className="w-4 h-4 text-green-600" />;
  return <AlertCircle className="w-4 h-4 text-red-600" />;
};

export const SensorCard: React.FC<SensorCardProps> = ({ 
  sensor, 
  reading, 
  isOnline = true 
}) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={clsx(
      "bg-white rounded-lg shadow-md border border-zinc-200 p-6 transition-all duration-200 hover:shadow-lg",
      !isOnline && "opacity-60"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getSensorIcon(sensor.type)}
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              {sensor.vendor} {sensor.model}
            </h3>
            <p className="text-sm text-zinc-600">ID: {sensor.sensor_id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(reading.confidence)}
          <span className={clsx("text-sm font-medium", getStatusColor(reading.confidence))}>
            {Math.round(reading.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Reading Value */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-zinc-900">
            {reading.value.toFixed(2)}
          </span>
          <span className="text-lg text-zinc-600">{reading.unit}</span>
        </div>
        <p className="text-sm text-zinc-600 capitalize">
          {sensor.type.replace('_', ' ')} Reading
        </p>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-zinc-600">
          <MapPin className="w-4 h-4" />
          <span className="capitalize">{reading.location.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-zinc-600">
          <Clock className="w-4 h-4" />
          <span>{formatTimestamp(reading.timestamp)}</span>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mt-4 pt-4 border-t border-zinc-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-600">Connection</span>
          <div className="flex items-center space-x-2">
            <div className={clsx(
              "w-2 h-2 rounded-full",
              isOnline ? "bg-green-500" : "bg-red-500"
            )} />
            <span className={clsx(
              "text-sm font-medium",
              isOnline ? "text-green-600" : "text-red-600"
            )}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
