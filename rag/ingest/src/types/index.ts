export interface Document {
  id: string;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface DocumentMetadata {
  source: string;
  category: DocumentCategory;
  tags: string[];
  location?: string;
  component?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  language: string;
  page_count?: number;
  file_type?: string;
  file_size?: number;
}

export type DocumentCategory = 
  | 'roofing'
  | 'plumbing' 
  | 'electrical'
  | 'hvac'
  | 'foundation'
  | 'insulation'
  | 'safety'
  | 'maintenance'
  | 'inspection_guide'
  | 'repair_procedure'
  | 'code_compliance'
  | 'general';

export interface SearchQuery {
  query: string;
  category?: DocumentCategory;
  location?: string;
  component?: string;
  limit?: number;
  threshold?: number;
  include_metadata?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface RAGContext {
  query: string;
  search_results: SearchResult[];
  sensor_context: SensorContextData;
  combined_context: string;
  timestamp: string;
}

export interface SensorContextData {
  component: string;
  location_prefix: string;
  window_seconds: number;
  readings: SensorReading[];
  summary: SensorSummary;
}

export interface SensorReading {
  sensor_id: string;
  type: string;
  location: string;
  value: number;
  unit: string;
  confidence: number;
  timestamp: string;
  age_seconds: number;
  calibration?: Record<string, any>;
  extras?: Record<string, any>;
}

export interface SensorSummary {
  component: string;
  location_prefix: string;
  total_readings: number;
  readings_by_type: Record<string, {
    count: number;
    avg_value: number;
    min_value: number;
    max_value: number;
    avg_confidence: number;
    latest_reading: SensorReading | null;
  }>;
  overall_stats: any;
  timestamp: string;
}

export interface UpsertRequest {
  documents: Document[];
  batch_size?: number;
  update_existing?: boolean;
}

export interface UpsertResponse {
  success: boolean;
  processed_count: number;
  errors: string[];
  document_ids: string[];
}

export interface CollectionConfig {
  name: string;
  vector_size: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
  on_disk_payload?: boolean;
  hnsw_config?: {
    m: number;
    ef_construct: number;
    full_scan_threshold: number;
  };
}

export interface EmbeddingConfig {
  model: string;
  dimension: number;
  batch_size: number;
  max_retries: number;
}
