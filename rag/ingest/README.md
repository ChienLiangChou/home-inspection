# RAG Document Ingestion and Search

A comprehensive Retrieval-Augmented Generation (RAG) system for the Home Inspection project that combines document knowledge with real-time sensor data.

## Features

- **Document Ingestion**: Process and store home inspection documents with embeddings
- **Semantic Search**: Find relevant information using vector similarity search
- **Sensor Integration**: Combine sensor data with document context for informed recommendations
- **Qdrant Vector Database**: High-performance vector storage and retrieval
- **OpenAI Embeddings**: Generate high-quality embeddings for documents and queries
- **Multi-format Support**: Process text, markdown, JSON, PDF, and DOCX files

## Architecture

```
RAG System
├── Document Processing
│   ├── Text extraction from various formats
│   ├── Metadata extraction and categorization
│   └── Embedding generation
├── Vector Storage (Qdrant)
│   ├── Document embeddings storage
│   ├── Semantic search capabilities
│   └── Filtering and metadata search
├── Sensor Integration
│   ├── Real-time sensor data retrieval
│   ├── Context formatting for AI
│   └── Sensor-based recommendations
└── RAG Context Generation
    ├── Query processing and embedding
    ├── Document retrieval and ranking
    ├── Sensor context integration
    └── Combined context formatting
```

## Setup

### Prerequisites

- Node.js 18+
- Qdrant vector database (local or cloud)
- OpenAI API key
- Home Inspection backend API running

### Installation

```bash
cd rag/ingest
npm install
```

### Environment Configuration

Copy the example environment file and configure:

```bash
cp env.example .env
```

Required environment variables:

```env
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

## Usage

### Document Ingestion

```bash
# Ingest sample documents and create knowledge base
npm run ingest

# Build and run from TypeScript
npm run build
npm start
```

### Search and Testing

```bash
# Basic semantic search
npm run search "roof leak inspection"

# Search with specific category
npm run search "plumbing maintenance procedures"

# Search for electrical safety
npm run search "electrical panel inspection"
```

### Programmatic Usage

```typescript
import { RAGService, QdrantService, EmbeddingService } from './src/index.js';

// Initialize services
const qdrantService = new QdrantService(qdrantUrl, apiKey, collectionName);
const embeddingService = new EmbeddingService(openaiApiKey, config);
const documentService = new DocumentService(embeddingService);
const sensorContextService = new SensorContextService(backendUrl);
const ragService = new RAGService(qdrantService, embeddingService, documentService, sensorContextService);

// Initialize
await ragService.initialize();

// Search with sensor context
const ragContext = await ragService.generateRAGContext(
  "roof moisture inspection",
  "roofing",
  "roof",
  300 // 5 minutes
);

// Use ragContext.combined_context with your AI model
```

## Document Categories

The system supports the following document categories:

- **roofing**: Roof inspection, repair, and maintenance
- **plumbing**: Plumbing systems, leaks, and repairs
- **electrical**: Electrical safety, wiring, and code compliance
- **hvac**: Heating, ventilation, and air conditioning
- **foundation**: Foundation inspection and structural issues
- **insulation**: Insulation assessment and energy efficiency
- **safety**: Safety protocols and hazard identification
- **maintenance**: General maintenance procedures
- **inspection_guide**: Step-by-step inspection procedures
- **repair_procedure**: Detailed repair instructions
- **code_compliance**: Building codes and regulations
- **general**: General home inspection knowledge

## Sensor Integration

The RAG system integrates with real-time sensor data:

### Supported Sensor Types

- **moisture_meter**: Moisture detection and humidity levels
- **co2**: Carbon dioxide and air quality monitoring
- **thermal_spot**: Temperature monitoring and thermal imaging

### Sensor Context Features

- Real-time sensor readings with confidence scores
- Location-based filtering (roof, basement, kitchen, etc.)
- Time-window filtering for recent readings
- Automatic recommendation generation based on sensor thresholds
- Integration with document search results

### Example Sensor Integration

```typescript
// Get RAG context with sensor data
const context = await ragService.generateRAGContext(
  "basement moisture inspection",
  "plumbing",           // Component
  "basement",           // Location prefix
  300                   // 5-minute window
);

// Context includes:
// - Relevant inspection documents
// - Recent sensor readings from basement
// - Sensor-based recommendations
// - Combined formatted context for AI
```

## API Integration

### Backend Endpoints Used

- `POST /sensor/context` - Get sensor context for specific component/location
- `GET /sensor/summary` - Get sensor data summary
- `GET /health` - Backend health check

### RAG Context Format

The generated RAG context includes:

1. **Documentation Section**: Relevant inspection guides and procedures
2. **Sensor Data Section**: Current sensor readings and statistics
3. **Recommendations Section**: Sensor-based alerts and recommendations
4. **Usage Instructions**: Guidelines for AI model integration

## Development

### Project Structure

```
src/
├── types/
│   └── index.ts           # TypeScript interfaces
├── services/
│   ├── qdrant.ts          # Vector database service
│   ├── embedding.ts       # OpenAI embedding service
│   ├── document.ts        # Document processing service
│   ├── sensor-context.ts  # Sensor data integration
│   └── rag.ts            # Main RAG service
├── ingest.ts             # Document ingestion CLI
├── search.ts             # Search testing CLI
└── index.ts              # Main exports
```

### Scripts

- `npm run build` - Compile TypeScript
- `npm run dev` - Development with watch mode
- `npm run ingest` - Run document ingestion
- `npm run search` - Run search testing
- `npm test` - Run tests
- `npm run lint` - Lint code

## Integration with Realtime AI

The RAG system is designed to integrate seamlessly with Realtime AI:

1. **Context Generation**: Generate rich context combining documents and sensor data
2. **Sensor Awareness**: AI models receive current sensor readings for informed decisions
3. **Recommendation Engine**: Automatic generation of sensor-based recommendations
4. **Safety Prioritization**: Sensor alerts are prioritized in AI responses

### Example Realtime Integration

```typescript
// In your Realtime AI handler
const ragContext = await ragService.generateRAGContext(
  userQuery,
  component,
  location,
  windowSec
);

// Add to AI context
const aiContext = {
  system: `You are a home inspection expert. Use the following context to provide informed recommendations:\n\n${ragContext.combined_context}`,
  tools: [...],
  sensor_data: ragContext.sensor_context
};
```

## Troubleshooting

### Common Issues

1. **Qdrant Connection**: Ensure Qdrant is running and accessible
2. **OpenAI API**: Verify API key and rate limits
3. **Backend Connection**: Ensure Home Inspection backend is running
4. **Document Processing**: Check file formats and permissions

### Health Checks

```bash
# Check all services
npm run search "test query"
```

The search command includes health checks for:
- Qdrant vector database
- OpenAI API
- Backend API connectivity

## Performance

- **Embedding Generation**: Batched processing with rate limiting
- **Vector Search**: Optimized with HNSW indexing
- **Sensor Integration**: Cached context with configurable timeouts
- **Memory Usage**: Streaming processing for large documents

## Security

- No hardcoded credentials (all from environment variables)
- Secure API key management
- Input validation and sanitization
- Error handling without exposing sensitive data












