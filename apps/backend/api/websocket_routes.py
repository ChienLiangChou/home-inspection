from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
import asyncio
from datetime import datetime

from database.connection import get_db
from services.readings_service import ReadingsService
from schemas.reading import ReadingOut

router = APIRouter(prefix="/ws", tags=["websocket"])

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except:
            self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

# Global connection manager
manager = ConnectionManager()


@router.websocket("/sensor/stream")
async def websocket_sensor_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time sensor data streaming.
    Broadcasts new readings to all connected clients.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def broadcast_new_reading(reading: ReadingOut):
    """
    Broadcast a new reading to all connected WebSocket clients.
    This function should be called when new readings are added.
    """
    message = {
        "type": "new_reading",
        "data": reading.dict(),
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast(json.dumps(message))


async def broadcast_sensor_update(sensor_id: str, update_type: str, data: Dict[str, Any]):
    """
    Broadcast sensor updates to all connected clients.
    """
    message = {
        "type": "sensor_update",
        "sensor_id": sensor_id,
        "update_type": update_type,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast(json.dumps(message))


@router.get("/connections")
async def get_connection_count():
    """
    Get the number of active WebSocket connections
    """
    return {
        "active_connections": len(manager.active_connections),
        "timestamp": datetime.utcnow().isoformat()
    }
