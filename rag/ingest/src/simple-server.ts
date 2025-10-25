import express from 'express';
import cors from 'cors';

const app = express();
const port = parseInt(process.env.PORT || '3001');

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'rag-service',
    version: '1.0.0' 
  });
});

// Document count endpoint
app.get('/api/documents/count', (req, res) => {
  res.json({ count: 0, message: 'RAG service is running but not fully configured' });
});

// Photo analysis endpoint
app.post('/api/rag/analyze-photo', (req, res) => {
  const { query, image, component, location, windowSec, sensor_context } = req.body;
  
  // Mock response for now
  res.json({
    query,
    relevantDocuments: [
      {
        title: "Sample Inspection Report",
        content: "This is a sample inspection report for testing purposes.",
        relevance: 0.8,
        category: "general"
      }
    ],
    sensorContext: sensor_context || {},
    recommendations: [
      "Check for visible damage",
      "Verify proper installation",
      "Monitor for future issues"
    ],
    combinedContext: `Analysis of ${component} at ${location} with sensor data: ${JSON.stringify(sensor_context)}`,
    timestamp: new Date().toISOString()
  });
});

// Stream analysis endpoint
app.post('/api/rag/analyze-stream', (req, res) => {
  const { query, frame, streamType, location, timestamp, quality, sensor_context, analysis_type } = req.body;
  
  // Mock response for now
  res.json({
    frameAnalysis: {
      objects: [
        {
          type: "building_structure",
          confidence: 0.85,
          location: { x: 100, y: 100, width: 200, height: 300 }
        }
      ],
      issues: [],
      detectedProblems: []
    },
    ragContext: {
      relevantDocuments: [
        {
          title: "Real-time Inspection Guide",
          content: "Guidelines for real-time inspection procedures",
          relevance: 0.9,
          category: "inspection"
        }
      ],
      sensorData: sensor_context || [],
      recommendations: [
        "Continue monitoring",
        "Check for any visible issues",
        "Document findings"
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 RAG Service running on port ${port}`);
  console.log(`📚 Health check: http://localhost:${port}/api/health`);
});
