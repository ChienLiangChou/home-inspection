# 🚀 Render 免費部署指南 - Home Inspection System

## 📋 部署方案

**完全免費方案：**
- **前端：** Vercel（免費）
- **後端：** Render（免費套餐，持續可用）

## ✅ Render 免費套餐說明

Render 提供 **永久免費套餐**：
- ✅ **Web Service**：免費（有使用限制但適合個人項目）
- ✅ **Static Site**：完全免費（前端部署）
- ✅ 自動 SSL 證書
- ✅ 自定義域名支持
- ⚠️ 免費服務在 15 分鐘無活動後會休眠（喚醒需要幾秒）

**注意：** 與 Railway 不同，Render 的免費套餐不需要試用期，可以持續使用。

---

## 🚀 部署步驟

### 前置條件

1. ✅ **GitHub 帳號** - 代碼需要推送到 GitHub
2. ✅ **Render 帳號** - https://render.com（可以用 GitHub 登錄）
3. ✅ **Vercel 帳號** - https://vercel.com（可以用 GitHub 登錄）
4. ✅ **OpenAI API Key** - 系統需要此 API key

---

## 步驟 1：準備 GitHub 倉庫

確保代碼已經推送到 GitHub：

```bash
cd "/Users/kevinchou/Home Inspection"

# 檢查 Git 狀態
git status

# 如果有未提交的更改，先提交
git add .
git commit -m "Prepare for Render deployment"

# 推送到 GitHub（如果還沒有）
# git remote add origin https://github.com/ChienLiangChou/home-inspection.git
# git push -u origin main
```

---

## 步驟 2：部署後端到 Render

### 2.1 登錄 Render

1. 訪問 https://render.com
2. 點擊 "Get Started" 或 "Sign Up"
3. 選擇 "Log in with GitHub"
4. 授權 Render 訪問您的 GitHub 帳號

### 2.2 創建 Web Service（後端）

1. 在 Render Dashboard，點擊 **"New +"** → **"Web Service"**
2. 連接您的 GitHub 倉庫（`home-inspection` 或您倉庫的名稱）
3. 配置以下設置：

   **Basic Settings:**
   - **Name:** `home-inspection-backend`
   - **Region:** 選擇離您最近的區域（如 `Oregon (US West)`）
   - **Branch:** `main`

   **Build & Deploy:**
   - **Root Directory:** `apps/backend`（重要！）
   - **Environment:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```

   **Plan:**
   - 選擇 **"Free"** 套餐

4. 點擊 **"Create Web Service"**

### 2.3 設置環境變量

在 Render Dashboard 的服務頁面：

1. 點擊左側 **"Environment"** 標籤
2. 添加以下環境變量：

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_VISION_MODEL=gpt-4o-mini
   REALTIME_MODEL=gpt-4
   PORT=10000
   DEBUG=false
   ```

   **注意：** Render 會自動設置 `PORT` 環境變量，但您也可以明確設置。

3. 如果使用 PostgreSQL（可選），在 Render Dashboard：
   - 點擊 **"New +"** → **"PostgreSQL"**
   - 選擇免費套餐
   - 記下連接字符串，添加環境變量：
     ```
     DB_URL=postgresql://user:password@host:5432/dbname
     ```

4. 設置 CORS（等前端部署後再設置）：
   ```
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```

### 2.4 獲取後端 URL

部署完成後，Render 會提供一個 URL：
- 例如：`https://home-inspection-backend.onrender.com`

**記下這個 URL**，稍後配置前端時需要。

### 2.5 創建 render.yaml（可選，推薦）

在項目根目錄創建 `render.yaml` 來自動化部署：

```yaml
services:
  - type: web
    name: home-inspection-backend
    runtime: python
    plan: free
    rootDir: apps/backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: OPENAI_API_KEY
        sync: false  # 需要在 Dashboard 手動設置
      - key: OPENAI_VISION_MODEL
        value: gpt-4o-mini
      - key: REALTIME_MODEL
        value: gpt-4
      - key: DEBUG
        value: false
      - key: PORT
        value: 10000
```

然後在 Render Dashboard 導入這個配置。

---

## 步驟 3：部署前端到 Vercel

### 3.1 登錄 Vercel

1. 訪問 https://vercel.com
2. 點擊 "Sign Up"
3. 選擇 "Continue with GitHub"
4. 授權 Vercel 訪問您的 GitHub 帳號

### 3.2 導入項目

1. 在 Vercel Dashboard，點擊 **"Add New..."** → **"Project"**
2. 選擇您的 GitHub 倉庫（`home-inspection`）
3. 配置項目：

   **Framework Preset:** Vite
   
   **Root Directory:** `apps/frontend`
   
   **Build Command:**
   ```bash
   npm run build
   ```
   
   **Output Directory:**
   ```
   dist
   ```

### 3.3 設置環境變量

在項目設置的 **"Environment Variables"** 頁面：

添加：
```
VITE_API_URL=https://home-inspection-backend.onrender.com
```

**注意：** 將 URL 替換為您實際的 Render 後端 URL。

### 3.4 部署

點擊 **"Deploy"**，Vercel 會自動：
- 安裝依賴
- 構建項目
- 部署到全球 CDN

部署完成後，記下前端 URL（例如：`https://home-inspection.vercel.app`）。

---

## 步驟 4：更新後端 CORS 設置

回到 Render Dashboard，更新後端環境變量：

1. 編輯 `CORS_ORIGINS` 環境變量：
   ```
   CORS_ORIGINS=https://home-inspection.vercel.app,https://home-inspection.vercel.app
   ```
   （將 URL 替換為您的實際 Vercel URL）

2. 保存並重新部署服務（Render 會自動觸發）

---

## 步驟 5：測試部署

### 5.1 測試後端

訪問後端 API 文檔：
```
https://home-inspection-backend.onrender.com/docs
```

應該能看到 FastAPI 自動生成的 API 文檔。

### 5.2 測試前端

訪問前端 URL：
```
https://home-inspection.vercel.app
```

### 5.3 在 iPhone 上測試

1. 打開 Safari 或 Chrome
2. 訪問前端 Vercel URL
3. 測試相機功能

---

## ⚠️ 注意事項

### Render 免費服務的限制

1. **自動休眠：** 免費服務在 15 分鐘無活動後會休眠
   - 第一次訪問喚醒需要 30-60 秒
   - 之後會保持運行直到再次休眠

2. **解決方案：**
   - 使用免費的 uptime monitor（如 UptimeRobot）每 10 分鐘 ping 一次
   - 或升級到付費套餐（$7/月起）

### 自定義域名

兩者都支持自定義域名：
- **Render:** 在 Dashboard 設置
- **Vercel:** 在項目設置 → Domains

---

## 📊 費用總結

| 服務 | 套餐 | 費用 |
|------|------|------|
| Render (後端) | Free | $0/月 |
| Vercel (前端) | Free | $0/月 |
| **總計** | | **$0/月** |

---

## 🔧 故障排除

### 後端無法訪問

1. 檢查 Render Dashboard 的日誌
2. 確認環境變量設置正確
3. 檢查 `PORT` 環境變量（Render 會自動設置，無需手動）

### 前端無法連接後端

1. 檢查 `VITE_API_URL` 環境變量
2. 確認後端 CORS 設置包含前端 URL
3. 檢查瀏覽器控制台的錯誤信息

### 服務休眠

免費服務會休眠，這是正常的。使用 UptimeRobot 保持喚醒。

---

## 🎉 完成！

您的 Home Inspection 系統現在已經部署到雲端，可以從任何地方訪問！

**後端 URL:** `https://home-inspection-backend.onrender.com`  
**前端 URL:** `https://home-inspection.vercel.app`

在 iPhone 上訪問前端 URL 即可使用系統。

