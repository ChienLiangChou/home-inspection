請依下列規格擴充專案 感測器層不得硬編碼任何金鑰

## 📊 進度追蹤
- ✅ **一 專案與環境** - 已完成 (Git: 86db3d5)
- ✅ **二 後端 FastAPI** - 已完成 (Git: c00e9c7)
- ✅ **三 前端 React+Vite** - 已完成 (Git: d1441f3)  
- ✅ **四 RAG 不變** - 已完成 (Git: e9d541f)
- ✅ **五 測試與種子資料** - 已完成 (Git: 63fd9c0)
- ✅ **六 README** - 已完成 (Git: 待提交)

---

一 專案與環境 ✅ COMPLETED
- ✅ 維持 mono-repo 結構 apps/frontend apps/backend rag/ingest infra/docker
- ✅ .env.sample 補上 DB_URL（Postgres 或 SQLite 用檔案路徑）
- ✅ 創建根目錄 package.json 用於 mono-repo 工作區管理
- ✅ 設置 Docker Compose 配置 (infra/docker/)
- ✅ 創建 .gitignore 排除敏感文件和依賴項
- ✅ 添加 README.md 項目文檔
- 📝 Git Checkpoint: 86db3d5 - "Step 1 env: complete project environment setup"

二 後端 FastAPI ✅ COMPLETED
- ✅ models
  - ✅ Sensor(id, sensor_id unique, vendor, model, type, created_at)
  - ✅ Reading(id, sensor_id FK, type, location, value float, unit, confidence float, calibration_json json, extras_json json, timestamp timestamptz, created_at)
- ✅ schema
  - ✅ Pydantic 模型 SensorData 與 ReadingOut 依我提供的 JSON Schema
  - ✅ 嚴格驗證 範圍與必填欄位
- ✅ api
  - ✅ POST /sensor/data 接收單筆或多筆 事先 upsert sensors 再寫 readings
  - ✅ GET /sensor/latest 支援 query type location since limit
  - ✅ WebSocket /sensor/stream 可選 若啟用則在有新 readings 時廣播
- ✅ service
  - ✅ readings_service.append_many(items) 與 readings_service.get_latest(filter)
- ✅ context injection
  - ✅ 提供函式 build_sensor_context(component, location_prefix, window_sec=60) 回傳最近讀數陣列
  - ✅ 在 Realtime 回合中加入 sensor_data 到 system 或 tools context
- ✅ env
  - ✅ DB_URL OPENAI_API_KEY REALTIME_MODEL QDRANT_URL QDRANT_API_KEY
  - ✅ 禁止任何金鑰硬編碼
- ✅ 創建完整的 FastAPI 應用結構
- ✅ 設置 SQLAlchemy 數據庫模型和關係
- ✅ 實現 Pydantic 數據驗證和序列化
- ✅ 創建 REST API 端點和 WebSocket 支持
- ✅ 實現業務邏輯服務層
- ✅ 創建 Realtime 上下文注入功能
- ✅ 設置 Docker 容器化配置
- 📝 Git Checkpoint: c00e9c7 - "Step 2 backend: complete FastAPI backend implementation"

三 前端 React+Vite ✅ COMPLETED
- ✅ React+Vite 專案結構與 TypeScript 配置
- ✅ Sensor 面板顯示 GET /sensor/latest 資料
- ✅ 送測試資料的模擬按鈕呼叫 POST /sensor/data
- ✅ WebSocket 即時刷新功能
- ✅ 與既有 Realtime 介面並存設計
- ✅ Zinc 色彩主題與現代 UI 設計
- ✅ 響應式設計與元件化架構
- ✅ API 服務層與錯誤處理
- ✅ 自動刷新與手動刷新功能
- 📝 Git Checkpoint: d1441f3 - "Step 3 frontend: complete React+Vite frontend implementation"

四 RAG 不變 ✅ COMPLETED
- ✅ 維持 /rag/ingest 的 upsert 與 search 功能
- ✅ 在產生回答前把後端 build_sensor_context 的結果併入會話
- ✅ Qdrant 向量資料庫整合與文件儲存
- ✅ OpenAI 嵌入生成與語義搜尋
- ✅ 多格式文件處理 (TXT, MD, JSON, PDF, DOCX)
- ✅ 感測器資料整合與即時上下文生成
- ✅ 分類搜尋與過濾功能
- ✅ RAG 上下文格式化與 AI 整合
- ✅ CLI 工具與健康檢查
- ✅ 完整的文件處理管道與錯誤處理
- 📝 Git Checkpoint: e9d541f - "Step 4 rag: complete RAG system with sensor integration"

五 測試與種子資料 ✅ COMPLETED
- ✅ 加入 seed 腳本 建三種裝置
  1 ble_moist_001 type moisture_meter
  2 ble_co2_003 type co2
  3 ble_ir_002 type thermal_spot
- ✅ e2e 測試
  - 連線後 模擬送三筆資料
  - 前端面板顯示即時讀數
  - 模型在 Roofing 或 Plumbing 場景會引用 sensor_data 給出行動建議
- ✅ 種子資料腳本 (seed_data.py)
- ✅ 端到端測試 (test_e2e.py)
- ✅ RAG 整合測試 (test_rag_integration.py)
- ✅ 測試資料生成器 (generate_test_data.py)
- ✅ 綜合測試執行器 (run_tests.py)
- ✅ WebSocket 即時串流測試
- ✅ 感測器上下文整合測試
- 📝 Git Checkpoint: 63fd9c0 - "Step 5 testing: complete testing and seed data implementation"

六 README ✅ COMPLETED
- ✅ 如何用 curl 傳感測資料與查詢
- ✅ 如何開啟 WebSocket 並在前端訂閱
- ✅ 資料保存與刪除策略
- ✅ 所有機密來自環境變數 不得進入程式碼
- ✅ 主要 README.md 完整專案文檔
- ✅ API_DOCUMENTATION.md 詳細 API 參考
- ✅ WEBSOCKET_GUIDE.md WebSocket 整合指南
- ✅ DATA_MANAGEMENT.md 資料管理策略
- ✅ 環境變數與安全最佳實踐
- ✅ Docker 部署指南
- ✅ 測試與故障排除指南
- 📝 Git Checkpoint: 待提交 - "Step 6 readme: complete comprehensive documentation"