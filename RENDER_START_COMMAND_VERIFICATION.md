# ✅ Render Start Command 驗證與配置

## 📋 FastAPI App 信息

- **位置**: `apps/backend/main.py`
- **App 實例**: `app = FastAPI(...)` (第 49 行)
- **模組路徑**: `main:app` (因為 Root Directory 是 `apps/backend`)

## ✅ 配置文件已正確設置

### 1. render.yaml
```yaml
services:
  - type: web
    name: home-inspection-backend
    runtime: python
    plan: free
    rootDir: apps/backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT  # ✅ 正確
```

### 2. Procfile (`apps/backend/Procfile`)
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT  # ✅ 正確
```

### 3. Dependencies (requirements.txt)
```txt
pydantic>=2.10.0  # ✅ 已升級，使用預編譯 wheel
pydantic-settings>=2.6.0  # ✅ 已升級
```

## 🎯 最終 Start Command

```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## ⚠️ 重要說明

如果 Render 仍在使用錯誤的命令 `gunicorn your_application.wsgi`，可能的原因：

1. **Render 服務是通過 Dashboard 手動創建的**，沒有使用 `render.yaml`
2. **Dashboard 設置覆蓋了配置文件**

## 🔧 解決方案

### 方法 1: 在 Render Dashboard 中設置（推薦）

1. 訪問 Render Dashboard → 你的服務 → Settings
2. 找到 "Build & Deploy" 部分
3. 找到 "Start Command" 字段
4. 設置為：`uvicorn main:app --host 0.0.0.0 --port $PORT`
5. 保存更改

### 方法 2: 使用 render.yaml（如果服務是從 Blueprint 創建的）

如果服務是從 `render.yaml` Blueprint 創建的，應該會自動使用配置。

## ✅ 驗證清單

- [x] FastAPI app 位置確認：`apps/backend/main.py`
- [x] 模組路徑確認：`main:app`
- [x] render.yaml 配置正確
- [x] Procfile 配置正確
- [x] Dependencies 已升級（pydantic>=2.10.0）
- [ ] Render Dashboard Start Command 設置正確（需要手動檢查）
- [ ] 部署成功驗證（等待下次部署）

## 📝 提交信息

配置文件已正確，無需修改。如果需要觸發重新部署，可以創建一個空提交或修改說明文檔。

