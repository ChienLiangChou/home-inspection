# 🔌 WebSocket Integration Guide

Complete guide for WebSocket integration with the Home Inspection System.

## WebSocket Endpoint

```
ws://localhost:8000/api/ws/sensor/stream
```

## Connection Management

### JavaScript (Browser)

```javascript
class SensorWebSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.onConnected();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.onDisconnected();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.onError(error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Override these methods in your implementation
  onConnected() {}
  onMessage(data) {}
  onDisconnected() {}
  onError(error) {}
}

// Usage
const sensorWS = new SensorWebSocket('ws://localhost:8000/api/ws/sensor/stream');

sensorWS.onConnected = () => {
  console.log('Sensor WebSocket ready');
};

sensorWS.onMessage = (data) => {
  console.log('New sensor reading:', data);
  // Update your UI here
};

sensorWS.onDisconnected = () => {
  console.log('Sensor WebSocket disconnected');
};

sensorWS.onError = (error) => {
  console.error('Sensor WebSocket error:', error);
};

// Connect
sensorWS.connect();
```

### React Hook

```javascript
import { useState, useEffect, useRef } from 'react';

export const useSensorWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = () => {
    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('✅ WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('🔌 WebSocket disconnected');
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        setError(error);
        console.error('❌ WebSocket error:', error);
      };

    } catch (err) {
      setError(err);
      console.error('Failed to create WebSocket:', err);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [url]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect
  };
};

// Usage in React component
const SensorDashboard = () => {
  const { isConnected, lastMessage, error } = useSensorWebSocket(
    'ws://localhost:8000/api/ws/sensor/stream'
  );

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {error && <div>Error: {error.message}</div>}
      {lastMessage && (
        <div>
          Latest Reading: {JSON.stringify(lastMessage, null, 2)}
        </div>
      )}
    </div>
  );
};
```

### Python Client

```python
import websocket
import json
import threading
import time
from typing import Callable, Optional

class SensorWebSocketClient:
    def __init__(self, url: str):
        self.url = url
        self.ws = None
        self.is_connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_delay = 1
        self.message_handlers = []
        self.connection_handlers = []
        self.disconnection_handlers = []
        self.error_handlers = []

    def add_message_handler(self, handler: Callable):
        """Add a handler for incoming messages"""
        self.message_handlers.append(handler)

    def add_connection_handler(self, handler: Callable):
        """Add a handler for connection events"""
        self.connection_handlers.append(handler)

    def add_disconnection_handler(self, handler: Callable):
        """Add a handler for disconnection events"""
        self.disconnection_handlers.append(handler)

    def add_error_handler(self, handler: Callable):
        """Add a handler for error events"""
        self.error_handlers.append(handler)

    def on_message(self, ws, message):
        """Handle incoming messages"""
        try:
            data = json.loads(message)
            for handler in self.message_handlers:
                handler(data)
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse message: {e}")

    def on_error(self, ws, error):
        """Handle WebSocket errors"""
        print(f"❌ WebSocket error: {error}")
        for handler in self.error_handlers:
            handler(error)

    def on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket disconnection"""
        print(f"🔌 WebSocket closed: {close_status_code} - {close_msg}")
        self.is_connected = False
        for handler in self.disconnection_handlers:
            handler(close_status_code, close_msg)
        
        # Auto-reconnect
        self.attempt_reconnect()

    def on_open(self, ws):
        """Handle WebSocket connection"""
        print("✅ WebSocket connected")
        self.is_connected = True
        self.reconnect_attempts = 0
        for handler in self.connection_handlers:
            handler()

    def attempt_reconnect(self):
        """Attempt to reconnect to WebSocket"""
        if self.reconnect_attempts < self.max_reconnect_attempts:
            self.reconnect_attempts += 1
            print(f"🔄 Attempting to reconnect ({self.reconnect_attempts}/{self.max_reconnect_attempts})...")
            time.sleep(self.reconnect_delay * self.reconnect_attempts)
            self.connect()
        else:
            print("❌ Max reconnection attempts reached")

    def connect(self):
        """Connect to WebSocket"""
        try:
            self.ws = websocket.WebSocketApp(
                self.url,
                on_open=self.on_open,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close
            )
            
            # Run in a separate thread
            def run_websocket():
                self.ws.run_forever()
            
            thread = threading.Thread(target=run_websocket, daemon=True)
            thread.start()
            
        except Exception as e:
            print(f"❌ Failed to create WebSocket connection: {e}")

    def disconnect(self):
        """Disconnect from WebSocket"""
        if self.ws:
            self.ws.close()
            self.ws = None
        self.is_connected = False

# Usage
def on_sensor_reading(data):
    print(f"📊 New sensor reading: {data}")

def on_connected():
    print("🔌 Connected to sensor stream")

def on_disconnected(code, reason):
    print(f"🔌 Disconnected: {code} - {reason}")

def on_error(error):
    print(f"❌ Error: {error}")

# Create client
client = SensorWebSocketClient("ws://localhost:8000/api/ws/sensor/stream")

# Add handlers
client.add_message_handler(on_sensor_reading)
client.add_connection_handler(on_connected)
client.add_disconnection_handler(on_disconnected)
client.add_error_handler(on_error)

# Connect
client.connect()

# Keep running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    client.disconnect()
```

## Message Format

### Incoming Messages

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
}
```

### Message Types

- `sensor_reading`: New sensor reading received
- `sensor_status`: Sensor connection status update
- `error`: Error message from server

## Error Handling

### Connection Errors

```javascript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  
  // Handle different error types
  if (error.code === 'ECONNREFUSED') {
    console.log('Server is not running');
  } else if (error.code === 'ENOTFOUND') {
    console.log('Server address not found');
  }
};
```

### Reconnection Strategy

```javascript
class WebSocketManager {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      ...options
    };
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('✅ Connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onclose = () => {
      console.log('🔌 Disconnected');
      this.stopHeartbeat();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('❌ Error:', error);
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Reconnecting in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.options.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
```

## Testing WebSocket Connection

### Browser Console Test

```javascript
// Open browser console and run:
const ws = new WebSocket('ws://localhost:8000/api/ws/sensor/stream');

ws.onopen = () => console.log('✅ Connected');
ws.onmessage = (event) => console.log('📊 Message:', JSON.parse(event.data));
ws.onclose = () => console.log('🔌 Disconnected');
ws.onerror = (error) => console.error('❌ Error:', error);

// Test connection
console.log('WebSocket state:', ws.readyState);
```

### Python Test Script

```python
import websocket
import json

def test_websocket():
    def on_message(ws, message):
        print(f"📊 Received: {json.loads(message)}")
    
    def on_error(ws, error):
        print(f"❌ Error: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print(f"🔌 Closed: {close_status_code} - {close_msg}")
    
    def on_open(ws):
        print("✅ Connected to sensor stream")
    
    ws = websocket.WebSocketApp(
        "ws://localhost:8000/api/ws/sensor/stream",
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    
    ws.run_forever()

if __name__ == "__main__":
    test_websocket()
```

## Production Considerations

### Security

```javascript
// Use WSS in production
const wsUrl = process.env.NODE_ENV === 'production' 
  ? 'wss://yourdomain.com/api/ws/sensor/stream'
  : 'ws://localhost:8000/api/ws/sensor/stream';
```

### Load Balancing

For multiple backend instances, consider:
- Sticky sessions
- Redis pub/sub for message broadcasting
- WebSocket connection pooling

### Monitoring

```javascript
// Add connection monitoring
class WebSocketMonitor {
  constructor(ws) {
    this.ws = ws;
    this.metrics = {
      messagesReceived: 0,
      connectionTime: Date.now(),
      lastMessageTime: null
    };
  }

  trackMessage() {
    this.metrics.messagesReceived++;
    this.metrics.lastMessageTime = Date.now();
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.connectionTime,
      isConnected: this.ws.readyState === WebSocket.OPEN
    };
  }
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if backend is running
   - Verify WebSocket endpoint URL
   - Check firewall settings

2. **CORS Issues**
   - Ensure CORS is properly configured
   - Check origin headers

3. **Message Parsing Errors**
   - Validate JSON format
   - Handle malformed messages gracefully

4. **Reconnection Failures**
   - Implement exponential backoff
   - Add connection state management
   - Handle network interruptions

### Debug Tools

```javascript
// WebSocket debugging
const debugWS = (ws) => {
  const originalSend = ws.send;
  ws.send = function(data) {
    console.log('📤 Sending:', data);
    return originalSend.call(this, data);
  };
  
  ws.addEventListener('message', (event) => {
    console.log('📥 Received:', event.data);
  });
};
```
