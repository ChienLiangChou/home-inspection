# Home Inspection System

A comprehensive home inspection system with sensor data integration, built as a mono-repo with FastAPI backend, React frontend, and RAG capabilities.

## Project Structure

```
Home Inspection/
├── apps/
│   ├── frontend/          # React + Vite frontend
│   └── backend/           # FastAPI backend
├── rag/
│   └── ingest/            # RAG data ingestion
├── infra/
│   └── docker/            # Docker configurations
├── .env.sample           # Environment variables template
├── package.json          # Mono-repo workspace configuration
└── .gitignore            # Git ignore rules
```

## Quick Start

### 1. Environment Setup

Copy the environment template and configure your variables:

```bash
cp .env.sample .env
# Edit .env with your actual values
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Environment

Using Docker (recommended):
```bash
npm run docker:up
```

Or manually:
```bash
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Environment Variables

Key environment variables (see `.env.sample` for complete list):

- `DB_URL`: Database connection string (PostgreSQL or SQLite)
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `QDRANT_URL`: Qdrant vector database URL
- `QDRANT_API_KEY`: Qdrant API key

## Development Commands

```bash
# Start all services
npm run dev

# Start individual services
npm run dev:backend
npm run dev:frontend

# Build all services
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Docker commands
npm run docker:up      # Start all services
npm run docker:down    # Stop all services
npm run docker:build   # Build all images
```

## Database Setup

The system supports both PostgreSQL (recommended) and SQLite:

### PostgreSQL (Production)
```bash
# Using Docker
npm run docker:up

# Or manually
createdb home_inspection_db
```

### SQLite (Development)
```bash
# Set DB_URL in .env to:
DB_URL=sqlite:///./data/home_inspection.db
```

## Security Notes

- Never commit `.env` files
- All secrets must come from environment variables
- No hardcoded keys in the codebase
- Use `.env.sample` as a template for required variables

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test`
4. Run linting: `npm run lint`
5. Submit a pull request
