# 🚀 立即開始雲端部署

## 您已經準備好開始部署！

### ✅ 前提條件檢查
- ✅ Railway CLI 已安裝
- ✅ Vercel CLI 已安裝
- ✅ 配置文件已創建
- ✅ GitHub 帳號：ChienLiangChou

---

## 📋 部署步驟（請按順序執行）

### 步驟 1：登錄 Railway（使用 GitHub）

**在終端中運行：**

```bash
railway login
```

這會：
1. 打開瀏覽器
2. 提示您使用 GitHub 登錄
3. 授權 Railway 訪問您的 GitHub 帳號

**完成後，繼續下一步。**

---

### 步驟 2：登錄 Vercel（使用 GitHub）

**在終端中運行：**

```bash
vercel login
```

這會：
1. 打開瀏覽器
2. 提示您使用 GitHub 登錄
3. 授權 Vercel 訪問您的 GitHub 帳號

**完成後，繼續下一步。**

---

### 步驟 3：準備部署後端到 Railway

**在終端中運行：**

```bash
cd "/Users/kevinchou/Home Inspection/apps/backend"

# 初始化 Railway 項目
railway init

# 這會提示您：
# - 創建新項目 或 選擇現有項目
# - 輸入項目名稱（例如：home-inspection-backend）
```

**初始化完成後，繼續下一步。**

---

### 步驟 4：設置後端環境變量

**您需要設置以下環境變量：**

在 Railway Dashboard 中設置，或使用 CLI：

```bash
# 設置 OpenAI API Key（請替換為您的實際 key）
railway variables set OPENAI_API_KEY=your_openai_key_here

# 設置 OpenAI 模型
railway variables set OPENAI_VISION_MODEL=gpt-4o-mini
railway variables set REALTIME_MODEL=gpt-4

# 設置數據庫（可以先使用 SQLite，之後可以添加 Railway 的 PostgreSQL）
railway variables set DB_URL=sqlite:///./data/home_inspection.db

# CORS 設置稍後添加（等前端部署完成後）
```

**或者** 在 Railway Dashboard (https://railway.app) 中：
1. 選擇您的項目
2. 進入 "Variables" 標籤
3. 添加上述環境變量

---

### 步驟 5：部署後端

**在終端中運行：**

```bash
cd "/Users/kevinchou/Home Inspection/apps/backend"

# 部署到 Railway
railway up
```

這會開始構建和部署過程。等待完成。

---

### 步驟 6：獲取後端 URL

**部署完成後，獲取後端 URL：**

```bash
railway domain
```

**記下這個 URL**（例如：`https://your-backend.railway.app`）

或者生成一個自定義域名：

```bash
railway domain generate
```

**複製後端 URL，稍後會用到。**

---

### 步驟 7：準備部署前端到 Vercel

**在終端中運行：**

```bash
cd "/Users/kevinchou/Home Inspection/apps/frontend"

# 創建生產環境配置（請將 YOUR_BACKEND_URL 替換為步驟 6 獲得的 URL）
cat > .env.production << EOF
VITE_API_URL=YOUR_BACKEND_URL
VITE_WS_URL=YOUR_BACKEND_URL
EOF

# 注意：將 ws:// 改為 wss://（例如：wss://your-backend.railway.app）
```

**實際示例（請替換為您的實際後端 URL）：**

```bash
cat > .env.production << EOF
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app
EOF
```

---

### 步驟 8：構建前端

```bash
cd "/Users/kevinchou/Home Inspection/apps/frontend"

# 構建生產版本
npm run build
```

---

### 步驟 9：部署前端到 Vercel

**首次部署：**

```bash
cd "/Users/kevinchou/Home Inspection/apps/frontend"

# 首次部署（會提示設置）
vercel
```

按照提示：
- 選擇項目範圍（您的帳號）
- 是否鏈接到現有項目？（選擇 No）
- 項目名稱（例如：home-inspection-frontend）
- 目錄：`./` (當前目錄)
- 是否覆蓋設置？（選擇 No）

**生產環境部署：**

```bash
vercel --prod
```

---

### 步驟 10：設置前端環境變量

**在 Vercel Dashboard 中：**

1. 訪問 https://vercel.com/dashboard
2. 選擇您的項目
3. 進入 "Settings" > "Environment Variables"
4. 添加：
   - `VITE_API_URL` = `https://your-backend.railway.app`
   - `VITE_WS_URL` = `wss://your-backend.railway.app`

**或者使用 CLI：**

```bash
vercel env add VITE_API_URL production
# 輸入：https://your-backend.railway.app

vercel env add VITE_WS_URL production
# 輸入：wss://your-backend.railway.app

# 重新部署以應用環境變量
vercel --prod
```

---

### 步驟 11：配置後端 CORS

**獲取前端 URL：**

在 Vercel Dashboard 查看，或使用 CLI：

```bash
vercel ls
```

**然後在 Railway 設置 CORS：**

```bash
cd "/Users/kevinchou/Home Inspection/apps/backend"

# 設置 CORS（請替換為您的實際前端 URL）
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app
```

**或者** 在 Railway Dashboard 中：
1. 選擇項目
2. 進入 "Variables"
3. 添加或更新 `CORS_ORIGINS` = `https://your-frontend.vercel.app`

---

### 步驟 12：測試部署

**測試後端：**

```bash
# 獲取後端 URL
railway domain

# 測試健康檢查
curl https://your-backend.railway.app/health

# 訪問 API 文檔
# https://your-backend.railway.app/docs
```

**測試前端：**

在瀏覽器中訪問 Vercel 提供的前端 URL。

**在 iPhone 上測試：**

1. 打開 Safari
2. 訪問前端 URL
3. 測試所有功能

---

## 🎉 完成！

部署完成後，您將獲得：
- ✅ 後端 URL（Railway）
- ✅ 前端 URL（Vercel）
- ✅ 可以在任何地方訪問的系統

---

## 💡 快速命令參考

### Railway 常用命令

```bash
railway login              # 登錄
railway init               # 初始化項目
railway up                 # 部署
railway domain             # 查看/生成域名
railway variables          # 查看環境變量
railway variables set KEY=VALUE  # 設置環境變量
railway logs               # 查看日誌
```

### Vercel 常用命令

```bash
vercel login               # 登錄
vercel                     # 部署（預覽）
vercel --prod              # 部署（生產）
vercel ls                  # 列出項目
vercel env add KEY         # 添加環境變量
vercel env ls              # 列出環境變量
```

---

## 🔧 故障排除

### 問題：Railway 部署失敗

**檢查日誌：**
```bash
railway logs
```

**檢查環境變量：**
```bash
railway variables
```

### 問題：前端無法連接後端

**檢查：**
1. 前端環境變量是否正確設置
2. 後端 CORS 是否包含前端 URL
3. 後端 URL 是否可訪問

**測試後端：**
```bash
curl https://your-backend.railway.app/health
```

---

## 📞 需要幫助？

如果遇到問題：
1. 查看 Railway 日誌：`railway logs`
2. 查看 Vercel 日誌：在 Dashboard 中查看
3. 檢查環境變量設置
4. 確認 CORS 配置

---

**準備好了嗎？從步驟 1 開始！** 🚀

