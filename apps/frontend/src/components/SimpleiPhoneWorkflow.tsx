import React, { useState } from 'react';

const SimpleiPhoneWorkflow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'prepare' | 'capture' | 'upload' | 'analyze' | 'report'>('prepare');

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'prepare': return '📋';
      case 'capture': return '📱';
      case 'upload': return '📤';
      case 'analyze': return '🤖';
      case 'report': return '📊';
      default: return '❓';
    }
  };

  const getStepTitle = (step: string) => {
    switch (step) {
      case 'prepare': return '準備階段';
      case 'capture': return '拍照階段';
      case 'upload': return '上傳階段';
      case 'analyze': return '分析階段';
      case 'report': return '報告階段';
      default: return '未知階段';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
        📱 iPhone 房屋檢查工作流程
      </h2>
      
      {/* 工作流程步驟 */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>🔄 工作流程步驟</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {['prepare', 'capture', 'upload', 'analyze', 'report'].map((step) => (
            <div
              key={step}
              style={{
                flex: '1',
                minWidth: '100px',
                padding: '15px',
                borderRadius: '8px',
                textAlign: 'center',
                backgroundColor: currentStep === step ? '#007AFF' : '#f0f0f0',
                color: currentStep === step ? 'white' : '#333',
                border: currentStep === step ? '2px solid #0056CC' : '2px solid transparent',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '5px' }}>
                {getStepIcon(step)}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {getStepTitle(step)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 準備階段 */}
      {currentStep === 'prepare' && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>📋 準備階段</h3>
          <p>請準備好您的 iPhone 進行房屋檢查：</p>
          <ol style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>確保 iPhone 電量充足</li>
            <li>清理相機鏡頭</li>
            <li>準備檢查清單</li>
            <li>選擇合適的光線環境</li>
          </ol>
          <button
            onClick={() => setCurrentStep('capture')}
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
            開始檢查 →
          </button>
        </div>
      )}

      {/* 拍照階段 */}
      {currentStep === 'capture' && (
        <div style={{
          background: '#e3f2fd',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>📱 拍照階段</h3>
          <p><strong>請使用 iPhone 原生相機應用程式拍照：</strong></p>
          <div style={{ margin: '15px 0' }}>
            <h4>📸 建議拍攝區域：</h4>
            <ul style={{ paddingLeft: '20px' }}>
              <li>🏠 屋頂外觀</li>
              <li>🚿 浴室管道</li>
              <li>⚡ 電氣面板</li>
              <li>🏗️ 結構狀況</li>
              <li>🪟 門窗狀況</li>
            </ul>
          </div>
          <div style={{
            background: '#fff3cd',
            padding: '15px',
            borderRadius: '8px',
            margin: '15px 0',
            border: '1px solid #ffc107'
          }}>
            <strong>💡 拍照技巧：</strong>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>確保光線充足</li>
              <li>保持相機穩定</li>
              <li>拍攝多個角度</li>
              <li>注意細節捕捉</li>
            </ul>
          </div>
          <button
            onClick={() => setCurrentStep('upload')}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              marginTop: '15px',
              cursor: 'pointer'
            }}
          >
            拍照完成，開始上傳 →
          </button>
        </div>
      )}

      {/* 上傳階段 */}
      {currentStep === 'upload' && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>📤 上傳階段</h3>
          <p>請選擇您拍攝的照片進行上傳：</p>
          
          <div style={{
            border: '2px dashed #6c757d',
            borderRadius: '8px',
            padding: '30px',
            textAlign: 'center',
            margin: '20px 0'
          }}>
            <input
              type="file"
              accept="image/*"
              multiple
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
              📷 選擇照片
            </label>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>
              支援 JPG, PNG 格式，最多 20 張照片
            </p>
          </div>

          <div style={{
            background: '#d4edda',
            padding: '15px',
            borderRadius: '8px',
            margin: '15px 0'
          }}>
            <p>✅ 已選擇照片</p>
            <button
              onClick={() => setCurrentStep('analyze')}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                marginTop: '10px',
                cursor: 'pointer'
              }}
            >
              🤖 開始 AI 分析
            </button>
          </div>
        </div>
      )}

      {/* 分析階段 */}
      {currentStep === 'analyze' && (
        <div style={{
          background: '#e3f2fd',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h3>🤖 AI 分析階段</h3>
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
          <button
            onClick={() => setCurrentStep('report')}
            style={{
              background: '#007AFF',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            查看分析結果 →
          </button>
        </div>
      )}

      {/* 報告階段 */}
      {currentStep === 'report' && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>📊 檢查報告</h3>
          
          <div style={{
            background: '#fff',
            padding: '15px',
            borderRadius: '8px',
            margin: '15px 0',
            border: '1px solid #dee2e6'
          }}>
            <h4>📈 整體評分: 85/100</h4>
            <p>檢查時間: {new Date().toLocaleString()}</p>
            <p>分析照片: 5 張</p>
          </div>

          <div style={{ margin: '20px 0' }}>
            <h4>🏠 各區域狀況:</h4>
            <div style={{
              background: '#d4edda',
              padding: '10px',
              borderRadius: '6px',
              margin: '10px 0',
              border: '1px solid #c3e6cb'
            }}>
              <strong>屋頂:</strong> ✅ 良好
            </div>
            <div style={{
              background: '#fff3cd',
              padding: '10px',
              borderRadius: '6px',
              margin: '10px 0',
              border: '1px solid #ffeaa7'
            }}>
              <strong>管道:</strong> ⚠️ 需注意 - 管道連接處有輕微滲漏
            </div>
            <div style={{
              background: '#d4edda',
              padding: '10px',
              borderRadius: '6px',
              margin: '10px 0',
              border: '1px solid #c3e6cb'
            }}>
              <strong>電氣:</strong> ✅ 良好
            </div>
          </div>

          <div style={{
            background: '#fff3cd',
            padding: '15px',
            borderRadius: '8px',
            margin: '15px 0',
            border: '1px solid #ffc107'
          }}>
            <h4>⚠️ 優先問題:</h4>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>管道連接處有輕微滲漏</li>
            </ul>
          </div>

          <div style={{
            background: '#d1ecf1',
            padding: '15px',
            borderRadius: '8px',
            margin: '15px 0',
            border: '1px solid #bee5eb'
          }}>
            <h4>💡 建議:</h4>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>建議在 6 個月內檢查管道連接</li>
              <li>屋頂狀況良好，無需立即維修</li>
              <li>電氣系統正常，可繼續使用</li>
            </ul>
          </div>

          <button
            onClick={() => setCurrentStep('prepare')}
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
  );
};

export default SimpleiPhoneWorkflow;
