# Home Inspection Frontend

A modern React+Vite frontend application for the Home Inspection System with sensor data integration.

## Features

- **Sensor Dashboard**: Real-time display of sensor readings from moisture meters, CO2 sensors, and thermal spot sensors
- **Mock Data Testing**: Interactive panel to send test sensor data to the backend
- **WebSocket Support**: Real-time updates via WebSocket connection
- **Auto Refresh**: Configurable automatic refresh of sensor data
- **Modern UI**: Clean, responsive design with Zinc color scheme
- **TypeScript**: Full type safety and IntelliSense support

## Technology Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type safety and better DX
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client for API calls

## Project Structure

```
src/
├── components/
│   ├── SensorCard.tsx      # Individual sensor display card
│   ├── SensorPanel.tsx     # Main sensor dashboard
│   └── MockDataPanel.tsx   # Testing interface
├── services/
│   └── api.ts              # API client and WebSocket service
├── types/
│   └── sensor.ts           # TypeScript type definitions
├── App.tsx                 # Main application component
├── main.tsx               # Application entry point
└── index.css              # Global styles
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

The frontend runs on `http://localhost:3000` and proxies API requests to the backend at `http://localhost:8000`.

## API Integration

### Sensor Data Endpoints

- **GET /api/sensor/latest** - Fetch latest sensor readings
- **POST /api/sensor/data** - Send sensor data (single or batch)

### WebSocket

- **ws://localhost:8000/sensor/stream** - Real-time sensor updates

### Mock Data

The application includes predefined mock sensors:
- `ble_moist_001` - Moisture meter (basement)
- `ble_co2_003` - CO2 sensor (living room)  
- `ble_ir_002` - Thermal spot sensor (roof)

## Usage

### Dashboard Tab
- View real-time sensor readings
- Toggle WebSocket connection for live updates
- Enable/disable auto-refresh (5-second intervals)
- Manual refresh button

### Mock Testing Tab
- Send predefined sensor data
- Generate random sensor readings
- Send individual sensor readings
- Test API connectivity

### Realtime AI Tab
- Placeholder for Realtime AI integration
- Will integrate with existing AI interface
- Sensor data will be automatically included in AI context

## Configuration

### Environment Variables

The frontend uses Vite's proxy configuration to connect to the backend. Update `vite.config.ts` if your backend runs on a different port.

### Styling

The application uses Tailwind CSS with a custom Zinc color palette. Colors can be customized in `tailwind.config.js`.

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment.

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run test` - Run tests (when implemented)

## Integration with Backend

The frontend is designed to work seamlessly with the FastAPI backend:

1. **Sensor Data Flow**: Frontend displays data from backend's sensor endpoints
2. **Real-time Updates**: WebSocket connection for live sensor readings
3. **Mock Testing**: Send test data to validate backend functionality
4. **AI Integration**: Sensor context will be available to Realtime AI system

## Next Steps

- Implement unit tests with Vitest
- Add error boundaries for better error handling
- Implement data visualization charts
- Add sensor configuration management
- Integrate with Realtime AI interface

