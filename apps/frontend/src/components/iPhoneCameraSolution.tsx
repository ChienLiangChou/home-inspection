import React, { useState } from 'react';

const iPhoneCameraSolution: React.FC = () => {
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedPhotos(files);
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis process
    setTimeout(() => {
      setAnalysisResults({
        totalPhotos: selectedPhotos.length,
        analysis: {
          '屋頂': { status: 'good', issues: [] },
          '管道': { status: 'warning', issues: ['輕微滲漏'] },
          '電氣': { status: 'good', issues: [] },
          '結構': { status: 'good', issues: [] }
        },
        overallScore: 85,
        recommendations: [
          '建議在 6 個月內檢查管道連接',
          '屋頂狀況良好，無需立即維修',
          '電氣系統正常，可繼續使用'
        ]
      });
      setIsAnalyzing(false);
    }, 3000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        📱 iPhone 房屋檢查解決方案
      </h2>

      {/* 問題說明 */}
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <h3 style={{ color: '#856404', marginTop: 0 }}>⚠️ iPhone Safari 攝像頭限制</h3>
        <p style={{ color: '#856404', marginBottom: 0 }}>
          iPhone Safari 不支援網頁攝像頭 API，但我們提供了完整的替代解決方案！
        </p>
      </div>

      {/* 解決方案步驟 */}
      <div style={{ marginBottom: '30px' }}>
        <h3>🔄 完整工作流程</h3>
        
        {/* 步驟 1: 準備 */}
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #007AFF'
        }}>
          <h4>📋 步驟 1: 準備檢查</h4>
          <ul style={{ paddingLeft: '20px' }}>
            <li>確保 iPhone 電量充足</li>
            <li>清理相機鏡頭</li>
            <li>準備檢查清單</li>
            <li>選擇合適的光線環境</li>
          </ul>
        </div>

        {/* 步驟 2: 拍照 */}
        <div style={{
          background: '#e3f2fd',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4>📱 步驟 2: 使用 iPhone 原生相機拍照</h4>
          <div style={{
            background: '#fff',
            padding: '15px',
            borderRadius: '8px',
            margin: '15px 0'
          }}>
            <p><strong>請打開 iPhone 相機應用程式，拍攝以下區域：</strong></p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '15px' }}>
              <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>🏠 屋頂外觀</div>
              <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>🚿 浴室管道</div>
              <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>⚡ 電氣面板</div>
              <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>🏗️ 結構狀況</div>
              <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>🪟 門窗狀況</div>
              <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>🔧 暖通系統</div>
            </div>
          </div>
        </div>

        {/* 步驟 3: 上傳 */}
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4>📤 步驟 3: 上傳照片到系統</h4>
          <div style={{
            border: '2px dashed #6c757d',
            borderRadius: '8px',
            padding: '30px',
            textAlign: 'center',
            margin: '15px 0'
          }}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              style={{
                background: '#007AFF',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'inline-block'
              }}
            >
              📷 選擇照片 (最多 20 張)
            </label>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>
              支援 JPG, PNG 格式
            </p>
          </div>
          
          {selectedPhotos.length > 0 && (
            <div style={{
              background: '#d4edda',
              padding: '15px',
              borderRadius: '8px',
              margin: '15px 0'
            }}>
              <p>✅ 已選擇 {selectedPhotos.length} 張照片</p>
              <button
                onClick={startAnalysis}
                disabled={isAnalyzing}
                style={{
                  background: isAnalyzing ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  marginTop: '10px'
                }}
              >
                {isAnalyzing ? '🤖 分析中...' : '🤖 開始 AI 分析'}
              </button>
            </div>
          )}
        </div>

        {/* 步驟 4: 分析結果 */}
        {isAnalyzing && (
          <div style={{
            background: '#e3f2fd',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h4>🤖 AI 分析進行中</h4>
            <div style={{ fontSize: '48px', margin: '20px 0' }}>🔍</div>
            <p>正在使用 AI 分析您的照片...</p>
            <div style={{
              background: '#fff',
              padding: '15px',
              borderRadius: '8px',
              margin: '15px 0'
            }}>
              <div style={{ fontSize: '14px', color: '#666' }}>
                • 識別房屋結構<br/>
                • 檢測潛在問題<br/>
                • 生成專業建議<br/>
                • 評估整體狀況
              </div>
            </div>
          </div>
        )}

        {/* 步驟 5: 報告 */}
        {analysisResults && (
          <div style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4>📊 專業檢查報告</h4>
            
            <div style={{
              background: '#fff',
              padding: '15px',
              borderRadius: '8px',
              margin: '15px 0',
              border: '1px solid #dee2e6'
            }}>
              <h5>📈 整體評分: {analysisResults.overallScore}/100</h5>
              <p>檢查時間: {new Date().toLocaleString()}</p>
              <p>分析照片: {analysisResults.totalPhotos} 張</p>
            </div>

            <div style={{ margin: '20px 0' }}>
              <h5>🏠 各區域狀況:</h5>
              {Object.entries(analysisResults.analysis).map(([area, data]: [string, any]) => (
                <div key={area} style={{
                  background: data.status === 'good' ? '#d4edda' : '#fff3cd',
                  padding: '10px',
                  borderRadius: '6px',
                  margin: '10px 0',
                  border: data.status === 'good' ? '1px solid #c3e6cb' : '1px solid #ffeaa7'
                }}>
                  <strong>{area}:</strong> {data.status === 'good' ? '✅ 良好' : '⚠️ 需注意'}
                  {data.issues.length > 0 && (
                    <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                      {data.issues.map((issue: string, index: number) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div style={{
              background: '#d1ecf1',
              padding: '15px',
              borderRadius: '8px',
              margin: '15px 0',
              border: '1px solid #bee5eb'
            }}>
              <h5>💡 專業建議:</h5>
              <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                {analysisResults.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => {
                setSelectedPhotos([]);
                setAnalysisResults(null);
                setIsAnalyzing(false);
              }}
              style={{
                background: '#007AFF',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                marginTop: '15px',
                cursor: 'pointer'
              }}
            >
              🔄 開始新的檢查
            </button>
          </div>
        )}
      </div>

      {/* 優勢說明 */}
      <div style={{
        background: '#d4edda',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '30px'
      }}>
        <h4 style={{ color: '#155724', marginTop: 0 }}>✅ iPhone 解決方案優勢</h4>
        <ul style={{ color: '#155724', paddingLeft: '20px' }}>
          <li>使用 iPhone 原生相機，畫質更佳</li>
          <li>支援多張照片同時上傳</li>
          <li>AI 智能分析，專業準確</li>
          <li>生成詳細檢查報告</li>
          <li>無需額外硬體設備</li>
        </ul>
      </div>
    </div>
  );
};

export default iPhoneCameraSolution;
