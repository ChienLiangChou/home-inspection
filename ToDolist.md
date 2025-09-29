請依下列規格擴充專案 感測器層不得硬編碼任何金鑰

一 專案與環境
- 維持 mono-repo 結構 apps/frontend apps/backend rag/ingest infra/docker
- .env.sample 補上 DB_URL（Postgres 或 SQLite 用檔案路徑）

二 後端 FastAPI
- models
  - Sensor(id, sensor_id unique, vendor, model, type, created_at)
  - Reading(id, sensor_id FK, type, location, value float, unit, confidence float, calibration_json json, extras_json json, timestamp timestamptz, created_at)
- schema
  - Pydantic 模型 SensorData 與 ReadingOut 依我提供的 JSON Schema
  - 嚴格驗證 範圍與必填欄位
- api
  - POST /sensor/data 接收單筆或多筆 事先 upsert sensors 再寫 readings
  - GET /sensor/latest 支援 query type location since limit
  - WebSocket /sensor/stream 可選 若啟用則在有新 readings 時廣播
- service
  - readings_service.append_many(items) 與 readings_service.get_latest(filter)
- context injection
  - 提供函式 build_sensor_context(component, location_prefix, window_sec=60) 回傳最近讀數陣列
  - 在 Realtime 回合中加入 sensor_data 到 system 或 tools context
- env
  - DB_URL OPENAI_API_KEY REALTIME_MODEL QDRANT_URL QDRANT_API_KEY
  - 禁止任何金鑰硬編碼

三 前端 React+Vite
- Sensor 面板 顯示 GET /sensor/latest
- 送測試資料的模擬按鈕 呼叫 POST /sensor/data
- 可選 WebSocket 即時刷新
- 與既有 Realtime 介面並存

四 RAG 不變
- 維持 /rag/ingest 的 upsert 與 search
- 在產生回答前 把後端 build_sensor_context 的結果併入會話

五 測試與種子資料
- 加入 seed 腳本 建三種裝置
  1 ble_moist_001 type moisture_meter
  2 ble_co2_003 type co2
  3 ble_ir_002 type thermal_spot
- e2e 測試
  - 連線後 模擬送三筆資料
  - 前端面板顯示即時讀數
  - 模型在 Roofing 或 Plumbing 場景會引用 sensor_data 給出行動建議

六 README
- 如何用 curl 傳感測資料與查詢
- 如何開啟 WebSocket 並在前端訂閱
- 資料保存與刪除策略
- 所有機密來自環境變數 不得進入程式碼