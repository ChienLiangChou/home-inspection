
export default function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', fontSize: '24px', marginBottom: '20px' }}>🏠 Home Inspection System</h1>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#666', marginBottom: '10px' }}>✅ System Status</h2>
        <p style={{ color: '#28a745', fontSize: '18px', fontWeight: 'bold' }}>Frontend is working!</p>
        <p style={{ color: '#666', marginTop: '10px' }}>If you can see this message, the React app is rendering correctly on your iPhone.</p>
        
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px', border: '1px solid #b3d9ff' }}>
          <h3 style={{ color: '#0066cc', marginBottom: '10px' }}>Next Steps:</h3>
          <ul style={{ color: '#666', margin: 0, paddingLeft: '20px' }}>
            <li>API connection will be tested next</li>
            <li>Sensor data will be displayed</li>
            <li>Real-time updates will be enabled</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
