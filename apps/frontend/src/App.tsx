import React, { useState } from 'react';
import { SensorPanel } from './components/SensorPanel';
import { MockDataPanel } from './components/MockDataPanel';
import { 
  Activity, 
  Play, 
  Settings,
  Home,
  BarChart3
} from 'lucide-react';

type TabType = 'dashboard' | 'testing' | 'realtime';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: <BarChart3 className="w-4 h-4" />,
      component: <SensorPanel />
    },
    {
      id: 'testing' as TabType,
      label: 'Mock Testing',
      icon: <Play className="w-4 h-4" />,
      component: <MockDataPanel />
    },
    {
      id: 'realtime' as TabType,
      label: 'Realtime AI',
      icon: <Activity className="w-4 h-4" />,
      component: (
        <div className="bg-white rounded-lg shadow-md border border-zinc-200 p-8">
          <div className="text-center">
            <Activity className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-2">Realtime AI Interface</h3>
            <p className="text-zinc-600 mb-4">
              This section will integrate with your existing Realtime AI interface.
              Sensor data will be automatically included in the AI context.
            </p>
            <div className="bg-zinc-50 rounded-md p-4 text-sm text-zinc-600">
              <p>
                The AI system will have access to sensor readings through the 
                <code className="bg-zinc-200 px-2 py-1 rounded">build_sensor_context</code> function
                and will provide contextual recommendations for roofing, plumbing, and other inspection scenarios.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-zinc-600 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900">Home Inspection System</h1>
                <p className="text-sm text-zinc-600">Sensor Data Integration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-zinc-100 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2
                      ${activeTab === tab.id
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                      }
                    `}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">
              <p>Home Inspection System v1.0.0</p>
              <p className="text-xs text-zinc-500 mt-1">
                Built with React, Vite, TypeScript, and Tailwind CSS
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-zinc-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Backend Connected</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
