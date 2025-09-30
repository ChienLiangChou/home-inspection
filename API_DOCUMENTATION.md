# 📡 API Documentation

Complete API reference for the Home Inspection System backend.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently no authentication required. For production deployment, implement JWT or API key authentication.

## Endpoints

### 🏠 Root Endpoint

```http
GET /
```

**Response:**
```json
{
  "message": "Home Inspection Sensor API",
  "version": "1.0.0",
  "docs": "/docs",
  "redoc": "/redoc",
  "endpoints": {
    "sensor_data": "/api/sensor/data",
    "sensor_latest": "/api/sensor/latest",
    "websocket": "/api/ws/sensor/stream"
  }
}
```

### 🏥 Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "home-inspection-backend",
  "version": "1.0.0"
}
```

## Sensor Data API

### 📤 Submit Sensor Data

```http
POST /api/sensor/data
Content-Type: application/json
```

**Request Body:**
```json
{
  "sensors": [
    {
      "sensor_id": "ble_moist_001",
      "vendor": "BlueTech",
      "model": "MoisturePro-X1",
      "type": "moisture_meter"
    }
  ],
  "readings": [
    {
      "sensor_id": "ble_moist_001",
      "type": "moisture_level",
      "location": "basement_wall",
      "value": 75.5,
      "unit": "%",
      "confidence": 0.95,
      "calibration_json": {
        "calibrated_at": "2024-01-15T10:00:00Z",
        "offset": 0.0
      },
      "extras_json": {
        "battery_level": 90,
        "signal_strength": 85
      },
      "timestamp": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "message": "Sensor data processed successfully",
  "sensors_processed": 1,
  "readings_processed": 1,
  "sensor_ids": ["ble_moist_001"],
  "reading_ids": [123]
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/sensor/data" \
  -H "Content-Type: application/json" \
  -d '{
    "sensors": [{
      "sensor_id": "ble_moist_001",
      "vendor": "BlueTech",
      "model": "MoisturePro-X1",
      "type": "moisture_meter"
    }],
    "readings": [{
      "sensor_id": "ble_moist_001",
      "type": "moisture_level",
      "location": "basement_wall",
      "value": 75.5,
      "unit": "%",
      "confidence": 0.95,
      "timestamp": "2024-01-15T12:00:00Z"
    }]
  }'
```

### 📥 Get Latest Readings

```http
GET /api/sensor/latest
```

**Query Parameters:**
- `type` (optional): Filter by reading type (e.g., "moisture_level")
- `location` (optional): Filter by location (e.g., "basement_wall")
- `since` (optional): Filter readings since timestamp (ISO format)
- `limit` (optional): Maximum number of readings (default: 100, max: 1000)

**Response:**
```json
[
  {
    "id": 123,
    "sensor_id": 1,
    "type": "moisture_level",
    "location": "basement_wall",
    "value": 75.5,
    "unit": "%",
    "confidence": 0.95,
    "calibration_json": {
      "calibrated_at": "2024-01-15T10:00:00Z",
      "offset": 0.0
    },
    "extras_json": {
      "battery_level": 90,
      "signal_strength": 85
    },
    "timestamp": "2024-01-15T12:00:00Z",
    "created_at": "2024-01-15T12:00:01Z"
  }
]
```

**cURL Examples:**
```bash
# Get all latest readings
curl "http://localhost:8000/api/sensor/latest"

# Filter by type
curl "http://localhost:8000/api/sensor/latest?type=moisture_level"

# Filter by location
curl "http://localhost:8000/api/sensor/latest?location=basement_wall"

# Limit results
curl "http://localhost:8000/api/sensor/latest?limit=10"

# Filter by time
curl "http://localhost:8000/api/sensor/latest?since=2024-01-15T10:00:00Z"
```

### 📋 Get All Sensors

```http
GET /api/sensor/sensors
```

**Response:**
```json
[
  {
    "id": 1,
    "sensor_id": "ble_moist_001",
    "vendor": "BlueTech",
    "model": "MoisturePro-X1",
    "type": "moisture_meter",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

**cURL Example:**
```bash
curl "http://localhost:8000/api/sensor/sensors"
```

### 📊 Get Sensor Readings

```http
GET /api/sensor/sensors/{sensor_id}/readings
```

**Path Parameters:**
- `sensor_id`: The sensor identifier (e.g., "ble_moist_001")

**Query Parameters:**
- `limit` (optional): Maximum number of readings (default: 100)

**Response:**
```json
[
  {
    "id": 123,
    "sensor_id": 1,
    "type": "moisture_level",
    "location": "basement_wall",
    "value": 75.5,
    "unit": "%",
    "confidence": 0.95,
    "timestamp": "2024-01-15T12:00:00Z",
    "created_at": "2024-01-15T12:00:01Z"
  }
]
```

**cURL Example:**
```bash
curl "http://localhost:8000/api/sensor/sensors/ble_moist_001/readings?limit=50"
```

## WebSocket API

### 🔌 WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8000/api/ws/sensor/stream');
```

**Connection Events:**
- `open`: Connection established
- `message`: New sensor reading received
- `close`: Connection closed
- `error`: Connection error

**Message Format:**
```json
{
  "type": "sensor_reading",
  "data": {
    "id": 123,
    "sensor_id": 1,
    "type": "moisture_level",
    "location": "basement_wall",
    "value": 75.5,
    "unit": "%",
    "confidence": 0.95,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

**JavaScript Example:**
```javascript
const ws = new WebSocket('ws://localhost:8000/api/ws/sensor/stream');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('New reading:', message.data);
  // Update UI with new sensor data
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
  // Implement reconnection logic
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

## Data Models

### Sensor Schema

```json
{
  "sensor_id": "string (1-100 chars, unique)",
  "vendor": "string (1-100 chars)",
  "model": "string (1-100 chars)",
  "type": "string (moisture_meter|co2|thermal_spot|temperature|humidity|pressure|air_quality|motion|light)"
}
```

### Reading Schema

```json
{
  "sensor_id": "string (1-100 chars)",
  "type": "string (1-50 chars)",
  "location": "string (1-100 chars)",
  "value": "number",
  "unit": "string (1-20 chars)",
  "confidence": "number (0.0-1.0)",
  "calibration_json": "object (optional)",
  "extras_json": "object (optional)",
  "timestamp": "string (ISO 8601)"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Validation error message"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error: error message"
}
```

## Rate Limiting

Currently no rate limiting implemented. For production deployment, consider implementing:
- Request rate limiting per IP
- API key-based rate limiting
- WebSocket connection limits

## CORS Configuration

CORS is configured to allow:
- Origins: `http://localhost:3000`, `http://localhost:8000`
- Methods: All methods
- Headers: All headers
- Credentials: Enabled

For production, update CORS settings in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

## API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Testing the API

### Using cURL

```bash
# Test health endpoint
curl http://localhost:8000/health

# Submit test data
curl -X POST "http://localhost:8000/api/sensor/data" \
  -H "Content-Type: application/json" \
  -d @test_data.json

# Get latest readings
curl "http://localhost:8000/api/sensor/latest"
```

### Using Python requests

```python
import requests

# Submit sensor data
data = {
    "sensors": [{"sensor_id": "test_001", "vendor": "Test", "model": "Test", "type": "moisture_meter"}],
    "readings": [{"sensor_id": "test_001", "type": "moisture_level", "location": "test", "value": 50.0, "unit": "%", "confidence": 0.9, "timestamp": "2024-01-15T12:00:00Z"}]
}

response = requests.post("http://localhost:8000/api/sensor/data", json=data)
print(response.json())
```

### Using JavaScript fetch

```javascript
// Submit sensor data
const data = {
  sensors: [{sensor_id: "test_001", vendor: "Test", model: "Test", type: "moisture_meter"}],
  readings: [{sensor_id: "test_001", type: "moisture_level", location: "test", value: 50.0, unit: "%", confidence: 0.9, timestamp: "2024-01-15T12:00:00Z"}]
};

fetch('http://localhost:8000/api/sensor/data', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(data)
})
.then(response => response.json())
.then(data => console.log(data));
```
