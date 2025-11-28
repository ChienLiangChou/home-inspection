# 驗房系統自我學習功能完整計劃

## 📋 計劃概述

為驗房系統建立完整的自我學習機制，包括數據收集、自動清洗、模型訓練和反饋循環，持續提升問題檢測、嚴重程度預測和建議質量的準確度。

**預期效果**：
- 問題檢測準確度：從初始 ~70% 提升至 90%+
- 嚴重程度預測準確度：從初始 ~60% 提升至 85%+
- 建議質量：用戶滿意度從初始 ~65% 提升至 90%+
- 持續改進：每月自動提升 2-5% 準確度

---

## 🏗️ 系統架構

建立一個端到端的自我學習系統，包含四個核心模組：

1. **數據收集與反饋模組** - 收集檢測結果和用戶反饋
2. **數據清洗與預處理模組** - 自動清洗和標準化學習數據
3. **模型訓練與優化模組** - 基於清洗後的數據訓練和微調模型
4. **性能評估與反饋循環** - 持續監控和改進系統準確度

---

## 📊 API 使用策略

### 數據清洗模組
**主要使用傳統方法（無需 API）：**
- **去重檢測**: 使用 `imagehash` 庫進行感知哈希（Perceptual Hashing）
- **數據驗證**: 規則基礎驗證（格式檢查、範圍檢查）
- **異常值檢測**: 統計方法（Z-score、IQR）
- **標準化處理**: 規則基礎映射表

**可選使用 OpenAI API（智能清洗）：**
- **語義去重**: 使用 OpenAI API 理解相似問題的語義（可選）
- **上下文理解**: 使用 OpenAI API 理解問題描述上下文（可選）

### 模型訓練模組
**混合方案：**

1. **問題檢測模型**
   - **主要**: 使用 OpenAI API 進行 **Prompt Engineering** 和 **Few-shot Learning**
   - **模型**: `gpt-4o-mini`（成本優化）或 `gpt-4o`（高準確度）
   - **方法**: 基於反饋數據優化 prompt 模板

2. **嚴重程度預測模型**
   - **主要**: 使用傳統機器學習（**scikit-learn** 或 **XGBoost**），無需 OpenAI API
   - **原因**: 分類問題，傳統 ML 更適合且成本更低
   - **輸入特徵**: 問題類型、傳感器讀數、圖像特徵向量

3. **建議生成模型**
   - **主要**: 使用 OpenAI API 進行 **RAG + Prompt Engineering**
   - **方法**: 基於反饋數據優化 prompt，結合 RAG 系統

### 成本優化策略
1. **數據清洗**: 99% 使用傳統方法，幾乎零成本
2. **嚴重程度預測**: 100% 使用傳統 ML，無需 API 成本
3. **問題檢測**: 使用 OpenAI API（gpt-4o-mini），成本降低 90%
4. **建議生成**: 使用 OpenAI API，通過 RAG 減少 token 使用

---

## 🚀 第一階段：數據收集與反饋系統

### 1.1 擴展 Issue 模型
**文件**: `apps/backend/models/issue.py`

新增欄位：
```python
user_validated = Column(Boolean, default=False, nullable=False)
user_validation_result = Column(String(20), nullable=True)  # "correct", "incorrect", "partial"
expert_reviewed = Column(Boolean, default=False, nullable=False)
expert_feedback = Column(JSON, nullable=True)  # 專家反饋（修正的問題類型、嚴重程度、建議）
actual_severity = Column(String(10), nullable=True)  # 實際嚴重程度（用於對比預測）
resolution_status = Column(String(20), nullable=True)  # "resolved", "partially_resolved", "not_resolved", "false_positive"
resolution_notes = Column(Text, nullable=True)  # 解決過程記錄
learning_score = Column(Float, nullable=True)  # 學習價值評分（用於優先訓練）
```

### 1.2 創建 Feedback 模型
**新文件**: `apps/backend/models/feedback.py`

```python
class Feedback(Base):
    __tablename__ = "feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    feedback_type = Column(String(50), nullable=False)  # "user_validation", "expert_review", "resolution_tracking"
    original_result = Column(JSON, nullable=False)  # 原始檢測結果
    actual_result = Column(JSON, nullable=True)  # 實際結果
    differences = Column(JSON, nullable=True)  # 差異分析
    feedback_data = Column(JSON, nullable=True)  # 反饋詳細數據
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String(50), nullable=True)  # 反饋來源
```

### 1.3 創建 Training Data 模型
**新文件**: `apps/backend/models/training_data.py`

```python
class TrainingData(Base):
    __tablename__ = "training_data"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    cleaned_status = Column(String(20), nullable=False)  # "pending", "cleaned", "failed"
    quality_score = Column(Float, nullable=True)  # 質量評分 (0-1)
    standardized_data = Column(JSON, nullable=False)  # 標準化後的數據
    labels = Column(JSON, nullable=False)  # 標籤（問題類型、嚴重程度、建議類別）
    used_for_training = Column(Boolean, default=False, nullable=False)
    training_version = Column(String(20), nullable=True)  # 用於哪個模型版本
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 1.4 反饋 API 端點
**新文件**: `apps/backend/api/feedback_routes.py`

端點：
- `POST /api/feedback/validate` - 用戶驗證檢測結果
- `POST /api/feedback/expert-review` - 專家審核提交
- `POST /api/feedback/resolution` - 問題解決狀態更新
- `GET /api/feedback/stats` - 反饋統計數據
- `GET /api/feedback/{issue_id}` - 獲取特定問題的反饋

### 1.5 前端反饋界面
**新文件**: `apps/frontend/src/components/IssueFeedback.tsx`

功能：
- 問題驗證界面（正確/錯誤/部分正確）
- 專家審核表單
- 問題解決狀態追蹤
- 反饋歷史查看

---

## 🧹 第二階段：數據清洗與預處理系統

### 2.1 數據清洗服務
**新文件**: `apps/backend/services/data_cleaning_service.py`

清洗流程：

1. **去重檢測**
   ```python
   - 使用 imagehash 計算圖像感知哈希
   - 基於問題類型、位置、時間窗口檢測重複
   - 標記重複數據（保留第一個，標記後續為重複）
   ```

2. **數據驗證**
   ```python
   - 檢查必填欄位完整性
   - 驗證數據格式（嚴重程度必須是 low/medium/high）
   - 檢查圖像數據有效性（base64 格式、大小限制）
   - 驗證傳感器讀數範圍合理性
   ```

3. **異常值檢測**
   ```python
   - 使用 Z-score 檢測極端嚴重程度評分
   - 檢測異常傳感器讀數組合（例如：高濕度但無溫度異常）
   - 標記可疑數據供人工審核
   ```

4. **標準化處理**
   ```python
   - 問題類型標準化（統一命名，例如："crack" -> "結構裂縫"）
   - 嚴重程度標準化（確保只有 low/medium/high）
   - 位置名稱標準化（統一格式）
   - 建議文本標準化（去除多餘空格、統一格式）
   ```

5. **質量評分**
   ```python
   quality_score = (
       completeness_score * 0.3 +      # 完整性（30%）
       consistency_score * 0.3 +      # 一致性（30%）
       feedback_quality * 0.3 +      # 反饋質量（30%）
       recency_score * 0.1             # 時間新鮮度（10%）
   )
   ```

### 2.2 數據清洗 API
**新文件**: `apps/backend/api/cleaning_routes.py`

端點：
- `POST /api/cleaning/clean` - 手動觸發清洗（可選參數：issue_ids, batch_size）
- `GET /api/cleaning/status` - 清洗狀態（進行中、完成、失敗）
- `GET /api/cleaning/stats` - 清洗統計（清洗數量、質量分數分布、重複率）
- `POST /api/cleaning/validate` - 驗證清洗結果（返回樣本數據供檢查）

### 2.3 自動清洗任務
**新文件**: `apps/backend/services/cleaning_scheduler.py`

定時任務：
- 每日自動清洗新數據（凌晨 2 點執行）
- 每週深度清洗全部數據（週日凌晨 3 點執行）
- 清洗結果報告（發送統計數據）

---

## 🤖 第三階段：模型訓練與優化系統

### 3.1 訓練數據準備服務
**新文件**: `apps/backend/services/training_data_service.py`

功能：
- 從清洗後的數據生成訓練集
- 數據分割（訓練 70% / 驗證 15% / 測試 15%）
- 特徵工程：
  - 圖像特徵（從 OpenAI Vision 提取的特徵向量）
  - 傳感器特徵（濕度、CO2、溫度等）
  - 上下文特徵（位置、組件、時間等）
- 標籤生成（基於反饋數據）：
  - 問題類型標籤
  - 嚴重程度標籤
  - 建議類別標籤

### 3.2 模型訓練服務
**新文件**: `apps/backend/services/model_training_service.py`

三個模型：

#### 1. 問題檢測模型（Prompt 優化）
```python
# 基於反饋數據優化 prompt 模板
def optimize_detection_prompt(feedback_data):
    # 分析正確檢測的案例，提取關鍵特徵
    # 分析錯誤檢測的案例，識別誤判模式
    # 生成優化的 prompt 模板
    # 使用 Few-shot Learning 添加範例
```

**方法**：
- 使用 OpenAI API（gpt-4o-mini）進行圖像分析
- 基於反饋數據優化 prompt 模板
- 實現 Few-shot Learning（在 prompt 中包含正確範例）

#### 2. 嚴重程度預測模型（傳統 ML）
```python
# 使用 scikit-learn 或 XGBoost
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

# 特徵：問題類型、傳感器讀數、圖像特徵、上下文
# 標籤：實際嚴重程度（從反饋數據獲取）
```

**方法**：
- 輸入特徵：問題類型編碼、傳感器讀數、圖像特徵向量
- 輸出：嚴重程度分類（low/medium/high）
- 模型：RandomForest 或 XGBoost
- 訓練：使用清洗後的訓練數據

#### 3. 建議生成模型（RAG + Prompt 優化）
```python
# 基於反饋數據優化建議生成 prompt
def optimize_recommendation_prompt(feedback_data):
    # 分析高質量建議的特徵
    # 識別低質量建議的問題
    # 優化 RAG 查詢和 prompt 模板
```

**方法**：
- 使用 OpenAI API（gpt-4o-mini）生成建議
- 結合 RAG 系統提供上下文
- 基於反饋數據優化 prompt 模板

### 3.3 模型版本管理
**新文件**: `apps/backend/models/model_version.py`

```python
class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    model_type = Column(String(50), nullable=False)  # "detection", "severity", "recommendation"
    version = Column(String(20), nullable=False)  # "v1.0", "v1.1"
    training_data_range = Column(JSON, nullable=True)  # 訓練數據範圍（日期、數量）
    performance_metrics = Column(JSON, nullable=False)  # 性能指標
    model_file_path = Column(String(255), nullable=True)  # 模型文件路徑（如果是本地模型）
    prompt_template = Column(Text, nullable=True)  # Prompt 模板（如果是 API 模型）
    deployed = Column(Boolean, default=False, nullable=False)
    deployed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 3.4 模型訓練 API
**新文件**: `apps/backend/api/training_routes.py`

端點：
- `POST /api/training/train` - 觸發模型訓練（參數：model_type, use_latest_data）
- `GET /api/training/status` - 訓練狀態（進行中、完成、失敗）
- `GET /api/training/models` - 模型列表（所有版本）
- `POST /api/training/deploy` - 部署模型版本（參數：version_id）
- `GET /api/training/performance` - 模型性能指標（對比不同版本）

---

## 📈 第四階段：性能評估與反饋循環

### 4.1 性能評估服務
**新文件**: `apps/backend/services/performance_evaluation_service.py`

評估指標：

#### 問題檢測準確度
```python
- 精確率（Precision）= TP / (TP + FP)
- 召回率（Recall）= TP / (TP + FN)
- F1 分數 = 2 * (Precision * Recall) / (Precision + Recall)
- 混淆矩陣（Confusion Matrix）
```

#### 嚴重程度預測準確度
```python
- 分類準確度 = 正確預測數 / 總數
- 嚴重程度偏差分析（預測 vs 實際）
- 各類別（low/medium/high）的 Precision/Recall
```

#### 建議質量評分
```python
- 用戶滿意度（基於反饋）
- 專家評分（如果有）
- 建議採納率（問題解決狀態追蹤）
```

### 4.2 A/B 測試框架
**新文件**: `apps/backend/services/ab_testing_service.py`

功能：
- 新舊模型對比測試
- 流量分配（50/50 或自定義比例）
- 性能對比分析（準確度、速度、成本）
- 自動切換最佳模型（基於性能指標）

### 4.3 持續學習循環
**新文件**: `apps/backend/services/continuous_learning_service.py`

自動化流程：
```python
1. 收集新反饋數據（每日，凌晨 1 點）
2. 觸發數據清洗（每週，週日凌晨 2 點）
3. 評估是否需要重新訓練：
   - 檢查性能是否下降（>5%）
   - 檢查是否有足夠新數據（>100 條新反饋）
4. 訓練新模型（如果滿足條件）
5. A/B 測試新模型（與當前版本對比）
6. 部署最佳模型（如果新模型性能更好）
```

### 4.4 學習儀表板
**新文件**: `apps/frontend/src/components/LearningDashboard.tsx`

顯示：
- 模型性能趨勢圖（準確度、召回率、F1 分數）
- 數據質量統計（清洗數量、質量分數分布）
- 反饋統計（驗證數量、專家審核數量）
- 學習進度（訓練次數、模型版本）
- 準確度提升曲線

---

## 🔧 第五階段：集成與優化

### 5.1 更新現有檢測流程
**文件**: `apps/backend/api/rag_routes.py`

修改 `analyze_image_with_openai` 函數：
- 使用最新訓練的 prompt 模板（從 ModelVersion 表讀取）
- 記錄檢測結果用於學習（自動創建 TrainingData 記錄）
- 應用嚴重程度預測模型（調用本地 ML 模型）
- 使用優化後的建議生成（使用最新 prompt）

### 5.2 更新 Issue Service
**文件**: `apps/backend/services/issue_service.py`

新增：
- 自動觸發學習數據收集（創建 Issue 時自動計算 learning_score）
- 計算學習價值評分（基於問題類型、反饋狀態等）
- 標記高價值訓練樣本（learning_score > 0.8）

### 5.3 數據庫遷移
**新文件**: `apps/backend/database/migrations/add_learning_fields.py`

執行：
- 添加新欄位到 Issue 表
- 創建 Feedback 表
- 創建 TrainingData 表
- 創建 ModelVersion 表

---

## 📦 技術棧與依賴

### 新增 Python 依賴
```txt
scikit-learn>=1.3.0  # 機器學習模型（嚴重程度預測）
xgboost>=2.0.0       # 梯度提升模型（可選，用於嚴重程度預測）
Pillow>=10.0.0       # 圖像處理
imagehash>=4.3.1     # 圖像相似度檢測（去重）
pandas>=2.0.0        # 數據處理
numpy>=1.24.0        # 數值計算
joblib>=1.3.0        # 模型序列化
```

### 新增前端依賴
```json
{
  "recharts": "^2.10.0",        // 圖表庫（學習儀表板）
  "react-hook-form": "^7.48.0"   // 表單處理（反饋界面）
}
```

---

## 📅 實施優先順序

### Phase 1 (Week 1-2): 數據收集與反饋系統
- [ ] 擴展 Issue 模型
- [ ] 創建 Feedback 模型
- [ ] 創建 TrainingData 模型
- [ ] 實現反饋 API 端點
- [ ] 創建前端反饋界面
- [ ] 數據庫遷移

### Phase 2 (Week 3-4): 數據清洗系統
- [ ] 實現數據清洗服務
- [ ] 實現去重檢測
- [ ] 實現數據驗證
- [ ] 實現異常值檢測
- [ ] 實現標準化處理
- [ ] 實現質量評分
- [ ] 創建清洗 API
- [ ] 實現自動清洗任務

### Phase 3 (Week 5-6): 模型訓練基礎架構
- [ ] 實現訓練數據準備服務
- [ ] 實現問題檢測模型優化（Prompt Engineering）
- [ ] 實現嚴重程度預測模型（傳統 ML）
- [ ] 實現建議生成模型優化
- [ ] 實現模型版本管理
- [ ] 創建訓練 API

### Phase 4 (Week 7-8): 性能評估與反饋循環
- [ ] 實現性能評估服務
- [ ] 實現 A/B 測試框架
- [ ] 實現持續學習循環
- [ ] 創建學習儀表板

### Phase 5 (Week 9-10): 集成測試與優化
- [ ] 更新現有檢測流程
- [ ] 更新 Issue Service
- [ ] 端到端測試
- [ ] 性能優化
- [ ] 文檔完善

---

## 🎯 預期效果

### 短期（1-3 個月）
- 問題檢測準確度：70% → 80%
- 嚴重程度預測準確度：60% → 75%
- 建議質量：65% → 80%

### 中期（3-6 個月）
- 問題檢測準確度：80% → 88%
- 嚴重程度預測準確度：75% → 82%
- 建議質量：80% → 87%

### 長期（6-12 個月）
- 問題檢測準確度：88% → 92%+
- 嚴重程度預測準確度：82% → 87%+
- 建議質量：87% → 92%+

---

## ⚠️ 風險與緩解

### 1. 數據質量問題
**風險**: 低質量數據影響模型訓練效果
**緩解**: 
- 實施嚴格清洗流程
- 質量評分機制
- 人工審核可疑數據

### 2. 過度擬合
**風險**: 模型過度擬合訓練數據，泛化能力差
**緩解**: 
- 使用交叉驗證
- 正則化技術
- 足夠的驗證和測試集

### 3. 計算資源
**風險**: 模型訓練需要大量計算資源
**緩解**: 
- 使用雲端訓練服務（可選）
- 本地 GPU（如可用）
- 分批訓練，避免一次性處理大量數據

### 4. 模型部署複雜度
**風險**: 模型版本管理和部署複雜
**緩解**: 
- 使用模型版本管理系統
- A/B 測試框架
- 自動化部署流程

### 5. API 成本
**風險**: OpenAI API 使用成本過高
**緩解**: 
- 使用 gpt-4o-mini（成本降低 90%）
- 嚴重程度預測使用傳統 ML（零 API 成本）
- 優化 prompt 減少 token 使用
- 實現緩存機制（避免重複分析相同圖像）

---

## 📝 實施檢查清單

### 數據收集階段
- [ ] Issue 模型擴展完成
- [ ] Feedback 模型創建完成
- [ ] TrainingData 模型創建完成
- [ ] 反饋 API 實現完成
- [ ] 前端反饋界面完成
- [ ] 數據庫遷移執行成功

### 數據清洗階段
- [ ] 去重檢測實現完成
- [ ] 數據驗證實現完成
- [ ] 異常值檢測實現完成
- [ ] 標準化處理實現完成
- [ ] 質量評分實現完成
- [ ] 清洗 API 實現完成
- [ ] 自動清洗任務配置完成

### 模型訓練階段
- [ ] 訓練數據準備服務完成
- [ ] 問題檢測模型優化完成
- [ ] 嚴重程度預測模型完成
- [ ] 建議生成模型優化完成
- [ ] 模型版本管理實現完成
- [ ] 訓練 API 實現完成

### 性能評估階段
- [ ] 性能評估服務完成
- [ ] A/B 測試框架完成
- [ ] 持續學習循環實現完成
- [ ] 學習儀表板完成

### 集成優化階段
- [ ] 現有檢測流程更新完成
- [ ] Issue Service 更新完成
- [ ] 端到端測試通過
- [ ] 性能優化完成
- [ ] 文檔完善

---

## 🔄 持續改進流程

1. **每日**: 收集新反饋數據
2. **每週**: 自動清洗數據，評估性能
3. **每月**: 評估是否需要重新訓練模型
4. **每季度**: 全面性能評估和優化

---

**計劃版本**: v1.0  
**創建日期**: 2024  
**最後更新**: 2024



