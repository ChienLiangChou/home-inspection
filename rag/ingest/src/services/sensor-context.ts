import axios from 'axios';
import { SensorContextData, SensorReading, SensorSummary } from '../types/index.js';

export class SensorContextService {
  private backendApiUrl: string;

  constructor(backendApiUrl: string) {
    this.backendApiUrl = backendApiUrl;
  }

  async getSensorContext(
    component: string,
    locationPrefix: string,
    windowSec: number = 60
  ): Promise<SensorContextData | null> {
    try {
      // Call the backend's sensor context endpoint
      const response = await axios.post(`${this.backendApiUrl}/sensor/context`, {
        component,
        location_prefix: locationPrefix,
        window_sec: windowSec,
      });

      const data = response.data;
      
      return {
        component: data.component || component,
        location_prefix: data.location_prefix || locationPrefix,
        window_seconds: data.window_seconds || windowSec,
        readings: data.readings || [],
        summary: data.summary || this.createEmptySummary(component, locationPrefix),
      };
    } catch (error) {
      console.error('❌ Failed to get sensor context:', error);
      
      // Return null to indicate no sensor context available
      // This allows RAG to work without sensor data
      return null;
    }
  }

  async getSensorSummary(
    component: string,
    locationPrefix: string,
    windowSec: number = 60
  ): Promise<SensorSummary | null> {
    try {
      const response = await axios.get(`${this.backendApiUrl}/sensor/summary`, {
        params: {
          component,
          location_prefix: locationPrefix,
          window_sec: windowSec,
        },
      });

      return response.data;
    } catch (error) {
      console.error('❌ Failed to get sensor summary:', error);
      return null;
    }
  }

  private createEmptySummary(component: string, locationPrefix: string): SensorSummary {
    return {
      component,
      location_prefix: locationPrefix,
      total_readings: 0,
      readings_by_type: {},
      overall_stats: {},
      timestamp: new Date().toISOString(),
    };
  }

  formatSensorContextForAI(sensorContext: SensorContextData): string {
    const parts = [
      `## Sensor Data Context`,
      `Component: ${sensorContext.component}`,
      `Location: ${sensorContext.location_prefix}`,
      `Time Window: ${sensorContext.window_seconds} seconds`,
      `Total Readings: ${sensorContext.readings.length}`,
    ];

    if (sensorContext.readings.length > 0) {
      parts.push('\n### Recent Sensor Readings:');
      
      // Group readings by type
      const readingsByType = this.groupReadingsByType(sensorContext.readings);
      
      for (const [type, readings] of Object.entries(readingsByType)) {
        const latest = readings[0];
        const avg = readings.reduce((sum, r) => sum + r.value, 0) / readings.length;
        
        parts.push(`\n**${type.replace('_', ' ').toUpperCase()}:**`);
        parts.push(`- Latest: ${latest.value} ${latest.unit} (${latest.confidence * 100}% confidence)`);
        parts.push(`- Average: ${avg.toFixed(2)} ${latest.unit}`);
        parts.push(`- Location: ${latest.location}`);
        parts.push(`- Age: ${Math.round(latest.age_seconds)}s ago`);
        
        if (latest.extras) {
          parts.push(`- Additional Data: ${JSON.stringify(latest.extras)}`);
        }
      }

      // Add summary statistics
      if (sensorContext.summary) {
        parts.push('\n### Summary Statistics:');
        for (const [type, stats] of Object.entries(sensorContext.summary.readings_by_type)) {
          parts.push(`\n**${type.replace('_', ' ').toUpperCase()}:**`);
          parts.push(`- Count: ${stats.count}`);
          parts.push(`- Range: ${stats.min_value} - ${stats.max_value} ${stats.latest_reading?.unit || ''}`);
          parts.push(`- Avg Confidence: ${(stats.avg_confidence * 100).toFixed(1)}%`);
        }
      }
    } else {
      parts.push('\n**No recent sensor readings available.**');
    }

    return parts.join('\n');
  }

  private groupReadingsByType(readings: SensorReading[]): Record<string, SensorReading[]> {
    const grouped: Record<string, SensorReading[]> = {};
    
    for (const reading of readings) {
      if (!grouped[reading.type]) {
        grouped[reading.type] = [];
      }
      grouped[reading.type].push(reading);
    }

    // Sort each group by timestamp (most recent first)
    for (const type in grouped) {
      grouped[type].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return grouped;
  }

  generateSensorRecommendations(
    sensorContext: SensorContextData,
    searchResults: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze sensor readings for potential issues
    for (const reading of sensorContext.readings) {
      const age = reading.age_seconds;
      
      // Check for stale readings
      if (age > 300) { // 5 minutes
        recommendations.push(`⚠️ Stale sensor reading: ${reading.sensor_id} (${Math.round(age)}s old)`);
      }

      // Check for low confidence readings
      if (reading.confidence < 0.8) {
        recommendations.push(`⚠️ Low confidence reading: ${reading.sensor_id} (${Math.round(reading.confidence * 100)}%)`);
      }

      // Component-specific recommendations
      if (reading.type === 'moisture_meter' && reading.value > 60) {
        recommendations.push(`🚨 High moisture detected: ${reading.value}% in ${reading.location}`);
      }

      if (reading.type === 'co2' && reading.value > 1000) {
        recommendations.push(`🚨 High CO2 levels: ${reading.value} ppm in ${reading.location}`);
      }

      if (reading.type === 'thermal_spot') {
        if (reading.value > 30) {
          recommendations.push(`🌡️ High temperature detected: ${reading.value}°C in ${reading.location}`);
        } else if (reading.value < 15) {
          recommendations.push(`❄️ Low temperature detected: ${reading.value}°C in ${reading.location}`);
        }
      }
    }

    // Add recommendations based on search results
    if (searchResults.length > 0) {
      recommendations.push(`📚 Found ${searchResults.length} relevant inspection guides and procedures`);
    }

    return recommendations;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.backendApiUrl}/health`);
      return true;
    } catch (error) {
      console.error('❌ Backend API health check failed:', error);
      return false;
    }
  }
}
