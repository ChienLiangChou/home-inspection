import React, { useState } from 'react';

interface CameraRAGAnalysisProps {
  photoData: string;
  onAnalysisComplete?: (analysis: any) => void;
}

interface RAGAnalysisResult {
  query: string;
  relevantDocuments: Array<{
    title: string;
    content: string;
    relevance: number;
    category: string;
    location?: string;
    component?: string;
  }>;
  sensorContext: any;
  recommendations: string[];
  combinedContext: string;
}

const CameraRAGAnalysis: React.FC<CameraRAGAnalysisProps> = ({ 
  photoData, 
  onAnalysisComplete 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RAGAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectionQuery, setInspectionQuery] = useState('');

  // Analyze photo with RAG system
  const analyzePhoto = async () => {
    if (!photoData || !inspectionQuery.trim()) {
      setError('請輸入檢查查詢並確保照片已拍攝');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Send photo and query to RAG analysis endpoint
      const response = await fetch('/api/rag/analyze-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo: photoData,
          query: inspectionQuery,
          component: 'visual_inspection',
          location: 'current_location',
          windowSec: 300 // 5 minutes
        })
      });

      if (!response.ok) {
        throw new Error(`分析失敗: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setAnalysisResult(result);
      onAnalysisComplete?.(result);
    } catch (err: any) {
      setError(`分析錯誤: ${err.message}`);
      console.error('RAG analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate inspection query suggestions
  const getQuerySuggestions = () => [
    '檢查屋頂狀況和潛在問題',
    '分析牆壁濕度和黴菌問題',
    '檢查管道系統和洩漏',
    '評估電氣系統安全',
    '檢查結構完整性',
    '分析通風和空氣品質',
    '檢查絕緣和能源效率',
    '評估安全隱患'
  ];

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginTop: '20px'
    }}>
      <h3 style={{ 
        marginBottom: '20px', 
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        🤖 AI 攝像頭分析 (RAG 整合)
      </h3>

      {/* Photo Preview */}
      {photoData && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#495057' }}>📸 拍攝照片:</h4>
          <img
            src={photoData}
            alt="Inspection photo"
            style={{
              width: '100%',
              maxWidth: '300px',
              height: 'auto',
              borderRadius: '8px',
              border: '2px solid #dee2e6'
            }}
          />
        </div>
      )}

      {/* Query Input */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 'bold',
          color: '#495057'
        }}>
          檢查查詢:
        </label>
        <textarea
          value={inspectionQuery}
          onChange={(e) => setInspectionQuery(e.target.value)}
          placeholder="描述你想要檢查的內容，例如：檢查屋頂狀況、分析牆壁濕度等..."
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px',
            minHeight: '80px',
            resize: 'vertical'
          }}
        />
        
        {/* Query Suggestions */}
        <div style={{ marginTop: '10px' }}>
          <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
            建議查詢:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {getQuerySuggestions().map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInspectionQuery(suggestion)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#e9ecef',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  color: '#495057'
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Button */}
      <button
        onClick={analyzePhoto}
        disabled={isAnalyzing || !photoData || !inspectionQuery.trim()}
        style={{
          padding: '12px 24px',
          backgroundColor: isAnalyzing ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          width: '100%',
          opacity: (isAnalyzing || !photoData || !inspectionQuery.trim()) ? 0.6 : 1
        }}
      >
        {isAnalyzing ? '🔄 分析中...' : '🤖 開始 AI 分析'}
      </button>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginTop: '15px',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '15px', color: '#333' }}>📊 分析結果:</h4>
          
          {/* Relevant Documents */}
          {analysisResult.relevantDocuments && analysisResult.relevantDocuments.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ color: '#495057', marginBottom: '10px' }}>📚 相關文件:</h5>
              {analysisResult.relevantDocuments.map((doc, index) => (
                <div key={index} style={{
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#495057' }}>
                    {doc.title} (相關度: {Math.round(doc.relevance * 100)}%)
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                    類別: {doc.category} 
                    {doc.location && ` | 位置: ${doc.location}`}
                    {doc.component && ` | 組件: ${doc.component}`}
                  </div>
                  <div style={{ fontSize: '13px', color: '#495057' }}>
                    {doc.content.substring(0, 200)}...
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sensor Context */}
          {analysisResult.sensorContext && (
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ color: '#495057', marginBottom: '10px' }}>📡 感應器數據:</h5>
              <div style={{
                backgroundColor: '#e9ecef',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#495057'
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(analysisResult.sensorContext, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ color: '#495057', marginBottom: '10px' }}>💡 建議:</h5>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {analysisResult.recommendations.map((rec, index) => (
                  <li key={index} style={{ marginBottom: '5px', color: '#495057' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Combined Context */}
          {analysisResult.combinedContext && (
            <div>
              <h5 style={{ color: '#495057', marginBottom: '10px' }}>📋 完整上下文:</h5>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #dee2e6',
                fontSize: '13px',
                color: '#495057',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {analysisResult.combinedContext}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        backgroundColor: '#e9ecef',
        padding: '15px',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#495057',
        marginTop: '20px'
      }}>
        <h4 style={{ marginBottom: '8px', color: '#333' }}>📋 使用說明:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>拍攝檢查照片後，輸入具體的檢查查詢</li>
          <li>AI 會結合你的 RAG 文件庫和感應器數據進行分析</li>
          <li>系統會提供相關文件、感應器數據和專業建議</li>
          <li>所有分析結果都會基於你上傳的 home inspection reports</li>
        </ul>
      </div>
    </div>
  );
};

export default CameraRAGAnalysis;
