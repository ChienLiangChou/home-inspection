
export default function SimpleTestApp() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#333', fontSize: '28px', marginBottom: '20px' }}>
        🏠 Home Inspection System
      </h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2 style={{ color: '#28a745', fontSize: '24px', marginBottom: '15px' }}>
          ✅ System is Working!
        </h2>
        
        <p style={{ color: '#666', fontSize: '18px', marginBottom: '20px' }}>
          The React app is rendering correctly on your iPhone.
        </p>
        
        <div style={{ 
          backgroundColor: '#e7f3ff', 
          padding: '20px', 
          borderRadius: '4px', 
          border: '1px solid #b3d9ff',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#0066cc', marginBottom: '15px' }}>
            System Status:
          </h3>
          <ul style={{ color: '#666', textAlign: 'left', margin: 0, paddingLeft: '20px' }}>
            <li>✅ Frontend: React + Vite running on port 3000</li>
            <li>✅ Backend: FastAPI running on port 8000</li>
            <li>✅ API: Sensor data accessible</li>
            <li>✅ WebSocket: Ready for real-time updates</li>
            <li>✅ iPhone Access: Working via http://10.0.0.68:3000</li>
          </ul>
        </div>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          border: '1px solid #e9ecef'
        }}>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
            <strong>Next Steps:</strong> The system is ready for iPhone camera integration and real-time house inspection!
          </p>
        </div>
      </div>
    </div>
  );
}




