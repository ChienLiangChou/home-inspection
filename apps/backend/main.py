import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env file first
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.issue_routes import router as issue_router
from api.rag_routes import router as rag_router
from api.report_routes import router as report_router
from api.sensor_routes import router as sensor_router
from api.websocket_routes import router as websocket_router
from api.storage_routes import router as storage_router
from api.feedback_routes import router as feedback_router
from api.cleaning_routes import router as cleaning_router
from api.training_routes import router as training_router
from api.performance_routes import router as performance_router
from database.base import Base
from database.connection import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown events
    """
    # Startup
    print("🚀 Starting Home Inspection Backend API...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Home Inspection Backend API...")


# Create FastAPI application
app = FastAPI(
    title="Home Inspection Sensor API",
    description="API for managing home inspection sensor data with real-time streaming",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:8000,https://localhost:3000,https://10.0.0.33:3000,http://10.0.0.33:3000,http://10.0.0.33:3001,http://10.0.0.33:3002,https://10.0.0.33:3001,https://10.0.0.33:3002,http://10.0.0.68:3000,http://10.0.0.68:3001,http://10.0.0.68:3002").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sensor_router, prefix="/api")
app.include_router(websocket_router, prefix="/api")
app.include_router(rag_router)
app.include_router(issue_router)
app.include_router(report_router)
app.include_router(storage_router)
app.include_router(feedback_router)
app.include_router(cleaning_router)
app.include_router(training_router)
app.include_router(performance_router)


@app.get("/")
async def root():
    """
    Root endpoint with API information
    """
    return {
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


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "service": "home-inspection-backend",
        "version": "1.0.0"
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """
    Custom HTTP exception handler
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """
    General exception handler for unhandled errors
    """
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG", "false").lower() == "true" else "An unexpected error occurred",
            "path": str(request.url)
        }
    )


if __name__ == "__main__":
    # Get configuration from environment
    # Railway uses PORT, but we also support BACKEND_PORT for local development
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("BACKEND_PORT", "8000")))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    print(f"🌐 Starting server on {host}:{port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"📚 API Documentation: http://{host}:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info" if not debug else "debug"
    )
