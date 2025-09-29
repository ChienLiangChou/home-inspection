from .sensor_routes import router as sensor_router
from .websocket_routes import router as websocket_router

__all__ = ["sensor_router", "websocket_router"]
