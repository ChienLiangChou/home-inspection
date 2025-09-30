# 📊 Data Management & Storage Strategy

Comprehensive guide for data storage, retention, and management in the Home Inspection System.

## 🗄️ Data Architecture

### Database Schema

```sql
-- Sensors table
CREATE TABLE sensors (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(100) UNIQUE NOT NULL,
    vendor VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Readings table
CREATE TABLE readings (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER REFERENCES sensors(id) NOT NULL,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    confidence FLOAT NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    calibration_json JSONB,
    extras_json JSONB,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_readings_sensor_id ON readings(sensor_id);
CREATE INDEX idx_readings_type ON readings(type);
CREATE INDEX idx_readings_location ON readings(location);
CREATE INDEX idx_readings_timestamp ON readings(timestamp);
CREATE INDEX idx_readings_created_at ON readings(created_at);
```

### Vector Database (Qdrant)

```json
{
  "collection_name": "home_inspection_knowledge",
  "vector_size": 1536,
  "distance": "Cosine",
  "payload_schema": {
    "document_id": "string",
    "title": "string",
    "content": "string",
    "category": "string",
    "source": "string",
    "created_at": "string"
  }
}
```

## 📈 Data Storage Strategy

### 1. Sensor Data Storage

**Primary Storage**: PostgreSQL/SQLite
- **Real-time data**: Last 24 hours in memory cache
- **Recent data**: Last 30 days in fast storage
- **Historical data**: Compressed storage for long-term retention

**Storage Tiers**:
```python
# Storage tier configuration
STORAGE_TIERS = {
    "hot": {
        "duration": "24 hours",
        "storage": "memory + SSD",
        "access_pattern": "real-time queries"
    },
    "warm": {
        "duration": "30 days", 
        "storage": "SSD",
        "access_pattern": "frequent queries"
    },
    "cold": {
        "duration": "1 year",
        "storage": "compressed archive",
        "access_pattern": "occasional analysis"
    }
}
```

### 2. Document Knowledge Storage

**Vector Database**: Qdrant
- **Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **Metadata**: Document categorization and source tracking
- **Search**: Semantic similarity search with filtering

## 🔄 Data Retention Policies

### Automatic Cleanup

```sql
-- Clean up old readings (older than 90 days)
DELETE FROM readings 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Archive readings before deletion
INSERT INTO readings_archive 
SELECT * FROM readings 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Clean up archived data (older than 1 year)
DELETE FROM readings_archive 
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Retention Schedule

| Data Type | Retention Period | Storage Location | Access Pattern |
|-----------|------------------|------------------|----------------|
| Real-time readings | 24 hours | Memory + Database | High frequency |
| Recent readings | 30 days | Database | Medium frequency |
| Historical readings | 1 year | Compressed archive | Low frequency |
| Document embeddings | Permanent | Qdrant | On-demand |
| Sensor metadata | Permanent | Database | Low frequency |

## 🗂️ Data Backup Strategy

### Database Backup

```bash
#!/bin/bash
# Database backup script

# PostgreSQL backup
pg_dump -h localhost -U user -d home_inspection \
  --format=custom \
  --compress=9 \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# SQLite backup
cp /path/to/home_inspection.db /backups/home_inspection_$(date +%Y%m%d_%H%M%S).db
```

### Qdrant Backup

```bash
#!/bin/bash
# Qdrant backup script

# Create snapshot
curl -X POST "http://localhost:6333/collections/home_inspection_knowledge/snapshots"

# Download snapshot
curl -X GET "http://localhost:6333/collections/home_inspection_knowledge/snapshots/{snapshot_name}" \
  --output "qdrant_backup_$(date +%Y%m%d_%H%M%S).tar"
```

### Automated Backup Script

```python
#!/usr/bin/env python3
"""
Automated backup script for Home Inspection System
"""

import os
import subprocess
import datetime
from pathlib import Path

class BackupManager:
    def __init__(self, backup_dir="/backups"):
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
        self.timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def backup_database(self):
        """Backup PostgreSQL database"""
        backup_file = self.backup_dir / f"database_backup_{self.timestamp}.dump"
        
        cmd = [
            "pg_dump",
            "-h", "localhost",
            "-U", os.getenv("DB_USER", "user"),
            "-d", os.getenv("DB_NAME", "home_inspection"),
            "--format=custom",
            "--compress=9",
            "--file", str(backup_file)
        ]
        
        subprocess.run(cmd, check=True)
        print(f"✅ Database backup created: {backup_file}")
        return backup_file
    
    def backup_qdrant(self):
        """Backup Qdrant vector database"""
        # Create snapshot
        snapshot_response = subprocess.run([
            "curl", "-X", "POST",
            f"{os.getenv('QDRANT_URL', 'http://localhost:6333')}/collections/home_inspection_knowledge/snapshots"
        ], capture_output=True, text=True)
        
        if snapshot_response.returncode == 0:
            print("✅ Qdrant snapshot created")
        else:
            print(f"❌ Qdrant backup failed: {snapshot_response.stderr}")
    
    def cleanup_old_backups(self, days=30):
        """Clean up backups older than specified days"""
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
        
        for backup_file in self.backup_dir.glob("*"):
            if backup_file.stat().st_mtime < cutoff_date.timestamp():
                backup_file.unlink()
                print(f"🗑️ Deleted old backup: {backup_file}")

if __name__ == "__main__":
    backup_manager = BackupManager()
    backup_manager.backup_database()
    backup_manager.backup_qdrant()
    backup_manager.cleanup_old_backups()
```

## 📊 Data Analytics & Reporting

### Aggregation Queries

```sql
-- Daily sensor statistics
SELECT 
    DATE(timestamp) as date,
    type,
    location,
    COUNT(*) as reading_count,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    AVG(confidence) as avg_confidence
FROM readings 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), type, location
ORDER BY date DESC, type, location;

-- Sensor health monitoring
SELECT 
    s.sensor_id,
    s.type,
    COUNT(r.id) as reading_count,
    MAX(r.timestamp) as last_reading,
    AVG(r.confidence) as avg_confidence,
    AVG((r.extras_json->>'battery_level')::float) as avg_battery
FROM sensors s
LEFT JOIN readings r ON s.id = r.sensor_id
WHERE r.timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY s.id, s.sensor_id, s.type
ORDER BY last_reading DESC;
```

### Performance Monitoring

```sql
-- Database performance metrics
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public' 
AND tablename IN ('sensors', 'readings');

-- Index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public';
```

## 🔒 Data Security & Privacy

### Encryption

```python
# Data encryption for sensitive information
from cryptography.fernet import Fernet
import os

class DataEncryption:
    def __init__(self):
        self.key = os.getenv('ENCRYPTION_KEY', Fernet.generate_key())
        self.cipher = Fernet(self.key)
    
    def encrypt_sensitive_data(self, data):
        """Encrypt sensitive sensor data"""
        if isinstance(data, dict):
            # Encrypt specific fields
            sensitive_fields = ['extras_json', 'calibration_json']
            for field in sensitive_fields:
                if field in data and data[field]:
                    data[field] = self.cipher.encrypt(
                        str(data[field]).encode()
                    ).decode()
        return data
    
    def decrypt_sensitive_data(self, data):
        """Decrypt sensitive sensor data"""
        if isinstance(data, dict):
            sensitive_fields = ['extras_json', 'calibration_json']
            for field in sensitive_fields:
                if field in data and data[field]:
                    try:
                        data[field] = self.cipher.decrypt(
                            data[field].encode()
                        ).decode()
                    except:
                        pass  # Handle decryption errors gracefully
        return data
```

### Access Control

```sql
-- Database user roles
CREATE ROLE sensor_reader;
CREATE ROLE sensor_writer;
CREATE ROLE admin_user;

-- Grant permissions
GRANT SELECT ON sensors, readings TO sensor_reader;
GRANT INSERT, UPDATE ON sensors, readings TO sensor_writer;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;

-- Row-level security (if needed)
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY sensor_access_policy ON readings
    FOR ALL TO sensor_reader
    USING (true);  -- Adjust based on your security requirements
```

## 📈 Data Growth Management

### Partitioning Strategy

```sql
-- Partition readings table by month
CREATE TABLE readings_y2024m01 PARTITION OF readings
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE readings_y2024m02 PARTITION OF readings
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automatic partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_y' || to_char(start_date, 'YYYY') || 
                     'm' || to_char(start_date, 'MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

### Data Compression

```python
# Compress old readings
import gzip
import json
from datetime import datetime, timedelta

def compress_old_readings(days_old=90):
    """Compress readings older than specified days"""
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    # Query old readings
    old_readings = db.query(Reading).filter(
        Reading.created_at < cutoff_date
    ).all()
    
    # Compress and store
    compressed_data = gzip.compress(
        json.dumps([reading.to_dict() for reading in old_readings]).encode()
    )
    
    # Store compressed data
    with open(f"compressed_readings_{cutoff_date.strftime('%Y%m%d')}.gz", "wb") as f:
        f.write(compressed_data)
    
    # Delete original data
    db.query(Reading).filter(
        Reading.created_at < cutoff_date
    ).delete()
    db.commit()
```

## 🔄 Data Migration

### Schema Migrations

```python
# Alembic migration example
"""Add sensor calibration tracking

Revision ID: 001
Revises: 
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add calibration tracking columns
    op.add_column('sensors', sa.Column('last_calibrated', sa.DateTime(), nullable=True))
    op.add_column('sensors', sa.Column('calibration_interval_days', sa.Integer(), nullable=True))
    
    # Add calibration history table
    op.create_table('sensor_calibrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sensor_id', sa.Integer(), nullable=False),
        sa.Column('calibrated_at', sa.DateTime(), nullable=False),
        sa.Column('calibration_data', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['sensor_id'], ['sensors.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('sensor_calibrations')
    op.drop_column('sensors', 'calibration_interval_days')
    op.drop_column('sensors', 'last_calibrated')
```

## 📊 Monitoring & Alerting

### Data Quality Monitoring

```python
# Data quality checks
class DataQualityMonitor:
    def __init__(self, db):
        self.db = db
    
    def check_missing_readings(self, sensor_id, hours=24):
        """Check for missing readings from sensors"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        last_reading = self.db.query(Reading).filter(
            Reading.sensor_id == sensor_id,
            Reading.timestamp >= cutoff
        ).order_by(Reading.timestamp.desc()).first()
        
        if not last_reading:
            return {"status": "missing", "hours_missing": hours}
        
        time_since_last = datetime.utcnow() - last_reading.timestamp
        if time_since_last.total_seconds() > hours * 3600:
            return {"status": "stale", "hours_since_last": time_since_last.total_seconds() / 3600}
        
        return {"status": "healthy"}
    
    def check_data_anomalies(self, sensor_id, hours=24):
        """Check for anomalous sensor readings"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        readings = self.db.query(Reading).filter(
            Reading.sensor_id == sensor_id,
            Reading.timestamp >= cutoff
        ).all()
        
        if len(readings) < 2:
            return {"status": "insufficient_data"}
        
        values = [r.value for r in readings]
        mean_value = sum(values) / len(values)
        std_dev = (sum((x - mean_value) ** 2 for x in values) / len(values)) ** 0.5
        
        # Check for outliers (3 standard deviations)
        outliers = [r for r in readings if abs(r.value - mean_value) > 3 * std_dev]
        
        return {
            "status": "anomalies_detected" if outliers else "normal",
            "outlier_count": len(outliers),
            "mean_value": mean_value,
            "std_deviation": std_dev
        }
```

## 🗑️ Data Deletion & GDPR Compliance

### Right to be Forgotten

```python
def delete_user_data(sensor_id):
    """Delete all data associated with a sensor (GDPR compliance)"""
    
    # Delete readings
    readings_deleted = db.query(Reading).filter(
        Reading.sensor_id == sensor_id
    ).delete()
    
    # Delete sensor
    sensor_deleted = db.query(Sensor).filter(
        Sensor.sensor_id == sensor_id
    ).delete()
    
    db.commit()
    
    return {
        "readings_deleted": readings_deleted,
        "sensor_deleted": sensor_deleted
    }
```

### Data Anonymization

```python
def anonymize_historical_data(days_old=365):
    """Anonymize data older than specified days"""
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    # Anonymize location data
    db.query(Reading).filter(
        Reading.created_at < cutoff_date
    ).update({
        "location": "anonymized",
        "extras_json": None
    })
    
    db.commit()
```

This comprehensive data management strategy ensures efficient storage, proper retention, security, and compliance for the Home Inspection System.
