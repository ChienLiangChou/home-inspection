# Home Inspection Device Simulator

A Python script that simulates a home inspection device sending sensor readings to the FastAPI backend.

## Features

- Simulates three sensor types: moisture meter, CO2 sensor, and thermal spot sensor
- Generates realistic sensor readings with proper metadata
- Can run once or continuously
- Configurable backend URL and interval

## Prerequisites

- Python 3.11+
- `requests` library: `pip install requests`
- Backend must be running (see main README)

## Usage

### Send One Batch

```bash
cd apps/device_simulator
python device_simulator.py
```

### Run Continuously

```bash
# Default: sends readings every 5 seconds
python device_simulator.py --continuous

# Custom interval (e.g., every 10 seconds)
python device_simulator.py --continuous --interval 10
```

### Custom Backend URL

```bash
python device_simulator.py --backend http://localhost:8000
```

### Environment Variable

You can also set the backend URL via environment variable:

```bash
export BACKEND_URL=http://localhost:8000
python device_simulator.py
```

## Simulated Sensors

The simulator creates readings for three sensors:

1. **ble_moist_001** - Moisture meter (BlueTech MoisturePro-X1)
   - Values: 30-90%
   - Locations: basement_wall, attic_ceiling, bathroom_wall, kitchen_sink

2. **ble_co2_003** - CO2 sensor (AirSense CO2Monitor-Pro)
   - Values: 400-1200 ppm
   - Locations: living_room, bedroom, kitchen, basement

3. **ble_ir_002** - Thermal spot sensor (ThermoTech ThermalSpot-2000)
   - Values: 15-35°C
   - Locations: roof, attic, exterior_wall, window

## Integration with Real Devices

To integrate with real BLE sensors:

1. Replace the `generate_reading()` method with actual BLE device communication
2. Use libraries like `bleak` (Linux/Windows) or `pyobjc` (macOS) for BLE
3. Map BLE characteristic values to the reading format
4. Keep the same JSON structure for backend compatibility

## Example Output

```
📡 Device Simulator - Sending sensor data to http://localhost:8000
============================================================
✅ Backend is reachable at http://localhost:8000

📊 Generated readings for 3 sensors:
  - ble_moist_001: 65.42 % @ basement_wall
  - ble_co2_003: 850.0 ppm @ living_room
  - ble_ir_002: 22.5 °C @ roof

✅ Sent 3 readings
✅ Successfully sent sensor data!
```













