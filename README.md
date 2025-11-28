# 🏠 Home Inspection System

A comprehensive IoT-based home inspection system that combines real-time sensor data with AI-powered analysis for intelligent home maintenance recommendations.

## 🌟 Features

- **Real-time Sensor Monitoring**: Moisture meters, CO2 sensors, and thermal spot sensors
- **AI-Powered Analysis**: RAG (Retrieval-Augmented Generation) system with document knowledge
- **WebSocket Streaming**: Live sensor data updates
- **Modern Web Interface**: React+Vite frontend with real-time dashboard
- **Comprehensive Testing**: End-to-end tests and seed data generation
- **Docker Support**: Containerized deployment with Docker Compose

## 🏗️ Architecture

```
Home Inspection System
├── 🖥️  Frontend (React+Vite)
│   ├── Real-time sensor dashboard
│   ├── Mock data testing interface
│   └── WebSocket integration
├── ⚡ Backend (FastAPI)
│   ├── REST API for sensor data
│   ├── WebSocket streaming
│   ├── Database models (SQLAlchemy)
│   └── Context injection for AI
├── 🤖 RAG System (Node.js)
│   ├── Document ingestion
│   ├── Vector search (Qdrant)
│   ├── OpenAI embeddings
│   └── Sensor context integration
└── 🐳 Infrastructure
    ├── Docker containers
    ├── Database (PostgreSQL/SQLite)
    └── Nginx reverse proxy
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and **npm 9+**
- **Python 3.11+** and **pip**
- **Docker** and **Docker Compose** (optional)
- **OpenAI API Key** (for RAG system)
- **Qdrant** (vector database)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd "Home Inspection"
```

### 2. Environment Configuration

Create environment files for each component:

#### Backend (.env)
```bash
# Database
DB_URL=sqlite:///./data/home_inspection.db
# or for PostgreSQL: postgresql://user:password@localhost:5432/home_inspection

# API Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=false

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# OpenAI (for RAG integration)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_VISION_MODEL=gpt-4o-mini  # Vision model for image analysis (gpt-4o-mini for cost optimization, gpt-4o for higher accuracy)
REALTIME_MODEL=gpt-4

# Qdrant (for RAG system)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_here
```

#### Frontend (no .env needed - uses Vite proxy)

#### RAG System (rag/ingest/.env)
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSION=1536

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_here
COLLECTION_NAME=home_inspection_knowledge

# Backend Integration
BACKEND_API_URL=http://localhost:8000
```

### 3. Start Services

#### Option A: Docker Compose (Recommended)

```bash
# Start all services
docker-compose -f infra/docker/docker-compose.yml up -d

# Check status
docker-compose -f infra/docker/docker-compose.yml ps
```

#### Option B: Manual Setup

**Backend:**
```bash
cd apps/backend
pip install -r requirements.txt
python seed_data.py  # Create initial data
python main.py
```

**Frontend:**
```bash
cd apps/frontend
npm install
npm run dev
```

**RAG System:**
```bash
cd rag/ingest
npm install
npm run ingest  # Create knowledge base
```

**Device Simulator (Optional):**
```bash
cd apps/device_simulator
pip install -r requirements.txt

# Send one batch of sensor readings
python device_simulator.py

# Run continuously (sends readings every 5 seconds)
python device_simulator.py --continuous
```

### 4. Access the System

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **WebSocket**: ws://localhost:8000/api/ws/sensor/stream

## 📡 API Usage

### Send Sensor Data

```bash
# Single sensor reading
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
      "calibration_json": {"calibrated_at": "2024-01-15T10:00:00Z"},
      "extras_json": {"battery": 90},
      "timestamp": "2024-01-15T12:00:00Z"
    }]
  }'
```

### Query Latest Readings

```bash
# Get all latest readings
curl "http://localhost:8000/api/sensor/latest"

# Filter by type
curl "http://localhost:8000/api/sensor/latest?type=moisture_level"

# Filter by location
curl "http://localhost:8000/api/sensor/latest?location=basement_wall"

# Limit results
curl "http://localhost:8000/api/sensor/latest?limit=10"
```

### Get All Sensors

```bash
curl "http://localhost:8000/api/sensor/sensors"
```

## 🔌 WebSocket Integration

### Frontend JavaScript

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/api/ws/sensor/stream');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New sensor reading:', data);
  // Update UI with new data
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

### Python Client

```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    print(f"Received: {data}")

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("WebSocket closed")

def on_open(ws):
    print("WebSocket connected")

ws = websocket.WebSocketApp(
    "ws://localhost:8000/api/ws/sensor/stream",
    on_open=on_open,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close
)

ws.run_forever()
```

## 🧪 Testing

### Run All Tests

```bash
cd apps/backend
./test_runner.sh
```

### Individual Test Components

```bash
# Seed data
python seed_data.py

# E2E tests
python test_e2e.py

# RAG integration tests
python test_rag_integration.py

# Generate test data
python generate_test_data.py
```

### Test Results

Tests generate comprehensive reports:
- `comprehensive_test_results.json` - Overall test results
- `e2e_test_results.json` - End-to-end test details
- `rag_integration_test_results.json` - RAG system test results

## 📱 Home Inspection Device

The system includes a device simulator that can send sensor readings to the backend, simulating real BLE sensors.

### Real-time Live Streaming Detection

The system supports **real-time live streaming** with AI-powered issue detection:

- **Real-time Analysis**: Camera stream is analyzed every 2 seconds
- **Instant Notifications**: Issues are detected and notified immediately
- **Automatic Recording**: Detected issues are saved to database with snapshots
- **Solution Recommendations**: Each issue includes recommended solutions

**Important for iPhone Users:**
- iPhone Safari does NOT support live streaming (getUserMedia API limitation)
- **Solution**: Use iPhone Chrome or Edge browser for live streaming
- **Alternative**: Use "📱 iPhone" tab for photo upload and analysis workflow

### Device Simulator

The device simulator (`apps/device_simulator/device_simulator.py`) simulates three sensor types:

- **ble_moist_001** - Moisture meter (30-90% readings)
- **ble_co2_003** - CO2 sensor (400-1200 ppm readings)
- **ble_ir_002** - Thermal spot sensor (15-35°C readings)

### Quick Start

```bash
cd apps/device_simulator
pip install -r requirements.txt

# Send one batch of readings
python device_simulator.py

# Run continuously (every 5 seconds)
python device_simulator.py --continuous

# Custom interval (every 10 seconds)
python device_simulator.py --continuous --interval 10

# Custom backend URL
python device_simulator.py --backend http://localhost:8000
```

### Integration with Real BLE Devices

To integrate real BLE sensors:

1. Install BLE library: `pip install bleak` (Linux/Windows) or use `pyobjc` (macOS)
2. Modify `device_simulator.py` to connect to actual BLE devices
3. Map BLE characteristic values to the reading format
4. Keep the same JSON structure for backend compatibility

See `apps/device_simulator/README.md` for detailed documentation.

## 🤖 RAG System Usage

### Document Ingestion

```bash
cd rag/ingest
npm run ingest
```

### Semantic Search

```bash
# Basic search
npm run search "roof leak inspection"

# Category-specific search
npm run search "plumbing maintenance procedures"
```

### Programmatic Integration

```typescript
import { RAGService } from './src/index.js';

const ragService = new RAGService(/* ... */);
await ragService.initialize();

// Generate context with sensor data
const context = await ragService.generateRAGContext(
  "roof moisture inspection",
  "roofing",
  "attic",
  300 // 5 minutes window
);

// Use context.combined_context with AI models
```

## 📊 Data Management

### Storage Strategy

- **Sensor Data**: Stored in PostgreSQL/SQLite with automatic indexing
- **Document Knowledge**: Vector embeddings in Qdrant for semantic search
- **Real-time Data**: WebSocket streaming for live updates
- **Historical Data**: Time-series storage with configurable retention

### Data Retention

```sql
-- Automatic cleanup of old readings (example)
DELETE FROM readings 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Backup Strategy

```bash
# Database backup
pg_dump home_inspection > backup_$(date +%Y%m%d).sql

# Qdrant backup
curl -X POST "http://localhost:6333/collections/home_inspection_knowledge/snapshots"
```

## 🔒 Security & Environment Variables

### Required Environment Variables

All sensitive data is stored in environment variables:

```bash
# Backend
DB_URL=postgresql://user:password@localhost:5432/home_inspection
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_key

# Frontend (development)
VITE_API_URL=http://localhost:8000

# RAG System
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_key
```

### Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment files** (.env) for local development
3. **Rotate API keys** regularly
4. **Use HTTPS** in production
5. **Implement authentication** for production deployment

## 🐳 Docker Deployment

### Production Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build: ./apps/backend
    environment:
      - DB_URL=postgresql://user:password@db:5432/home_inspection
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - qdrant

  frontend:
    build: ./apps/frontend
    ports:
      - "80:80"

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=home_inspection
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
```

## 📈 Monitoring & Health Checks

### API Health

```bash
# Backend health
curl http://localhost:8000/health

# Database connectivity
curl http://localhost:8000/api/sensor/sensors
```

### RAG System Health

```bash
cd rag/ingest
npm run search "health check"
```

### WebSocket Status

```javascript
// Check WebSocket connection
const ws = new WebSocket('ws://localhost:8000/api/ws/sensor/stream');
ws.onopen = () => console.log('✅ WebSocket healthy');
ws.onerror = () => console.log('❌ WebSocket error');
```

## 🛠️ Development

### Project Structure

```
Home Inspection/
├── apps/
│   ├── backend/          # FastAPI backend
│   │   ├── api/         # API routes
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   ├── schemas/     # Pydantic schemas
│   │   └── utils/       # Utilities
│   ├── frontend/        # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── types/
│   │   └── public/
│   └── device_simulator/ # Device simulator (Python)
│       └── device_simulator.py
├── rag/ingest/          # RAG system
│   ├── src/
│   │   ├── services/
│   │   └── types/
│   └── sample-docs/
├── infra/docker/       # Docker configuration
└── README.md
```

### Development Scripts

```bash
# Backend
cd apps/backend
python main.py                    # Start server
python seed_data.py              # Create test data
python test_e2e.py               # Run E2E tests
./test_runner.sh                 # Run all tests

# Frontend
cd apps/frontend
npm run dev                      # Development server
npm run build                    # Production build
npm run preview                  # Preview build

# RAG System
cd rag/ingest
npm run ingest                   # Ingest documents
npm run search "query"           # Test search
npm run build                    # Build TypeScript

# Device Simulator
cd apps/device_simulator
python device_simulator.py        # Send one batch
python device_simulator.py --continuous  # Run continuously
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `./test_runner.sh`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section in component READMEs
2. Review test results for system health
3. Check logs in Docker containers
4. Open an issue on GitHub

---

**Built with ❤️ for intelligent home inspection and maintenance**