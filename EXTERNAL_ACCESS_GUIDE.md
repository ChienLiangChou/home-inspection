# 📱 讓 iPhone 在外網訪問 Home Inspection 系統

## 🎯 目標
離開電腦後，iPhone 可以在任何地方（使用移動數據）訪問系統。

## ⚠️ 目前限制

**當前部署狀態：**
- ✅ 本地網絡：iPhone 和電腦在同一 WiFi 可以使用
- ❌ 外網訪問：離開 WiFi 或電腦關機後無法訪問

---

## 🚀 方案選擇

### 方案 A：ngrok（快速測試，電腦需開機）

**適用場景：**
- 短期測試
- 電腦會一直開機
- 快速驗證功能

**優點：**
- 5 分鐘設置完成
- 完全免費
- 可在任何地方訪問

**缺點：**
- 電腦必須保持開機
- 免費版 URL 每次重啟會變化
- 有連接數限制

---

### 方案 B：雲端部署（永久方案，電腦可關機）

**適用場景：**
- 長期使用
- 電腦不需要一直開機
- 需要穩定可靠的服務

**推薦組合：**
- **前端**：Vercel（免費）
- **後端**：Railway（免費套餐可用）

**優點：**
- 電腦關機也能使用
- URL 固定不變
- 更穩定可靠
- 自動 HTTPS 證書

**缺點：**
- 需要設置雲服務帳號
- 約 30-60 分鐘設置時間

---

## 📋 方案 A 詳細步驟：使用 ngrok

### 前提條件
- 電腦保持開機並連接互聯網
- 後端和前端服務正在運行

### 步驟 1：安裝 ngrok

```bash
# macOS
brew install ngrok

# 或從官網下載：https://ngrok.com/download
```

### 步驟 2：註冊並獲取 authtoken（首次使用）

1. 訪問 https://dashboard.ngrok.com/signup
2. 註冊免費帳號
3. 複製 authtoken
4. 運行：`ngrok config add-authtoken YOUR_TOKEN`

### 步驟 3：為後端創建 ngrok 隧道

**新開一個終端窗口：**

```bash
ngrok http 8000
```

**您會看到類似輸出：**
```
Forwarding  https://abc123-def456.ngrok.io -> http://localhost:8000
```

**複製這個 HTTPS URL**（例如：`https://abc123-def456.ngrok.io`）

### 步驟 4：更新後端 CORS 配置

編輯 `apps/backend/.env`，添加 ngrok URL：

```bash
cd "/Users/kevinchou/Home Inspection/apps/backend"
# 在 CORS_ORIGINS 中添加 ngrok URL
```

或者直接修改環境變量：

```bash
# 查看當前的 CORS_ORIGINS
grep CORS_ORIGINS .env

# 添加 ngrok URL（替換為您實際獲得的 URL）
echo 'CORS_ORIGINS=http://localhost:3000,https://localhost:3000,https://10.0.0.33:3000,https://abc123-def456.ngrok.io' > .env.cors
```

然後重啟後端服務。

### 步驟 5：為前端創建 ngrok 隧道

**再開一個終端窗口：**

```bash
ngrok http 3000
```

**複製前端的 ngrok URL**（例如：`https://xyz789-uvw012.ngrok.io`）

### 步驟 6：更新前端環境變量

```bash
cd "/Users/kevinchou/Home Inspection/apps/frontend"

# 創建新的環境變量文件（使用後端的 ngrok URL）
echo "VITE_API_URL=https://abc123-def456.ngrok.io" > .env.ngrok
echo "VITE_WS_URL=wss://abc123-def456.ngrok.io" >> .env.ngrok

# 或直接修改 .env.local
```

**注意：** 需要重啟前端服務使環境變量生效。

### 步驟 7：在 iPhone 上訪問

1. 打開 iPhone Safari
2. 訪問前端的 ngrok URL：`https://xyz789-uvw012.ngrok.io`
3. 首次訪問會顯示警告，點擊"繼續訪問"
4. ✅ 現在可以在任何地方使用移動數據訪問了！

---

## 📋 方案 B 詳細步驟：雲端部署

### 前置準備

1. **GitHub 帳號**（代碼需要推送到 GitHub）
2. **Vercel 帳號**（https://vercel.com/signup）
3. **Railway 帳號**（https://railway.app/signup）

### 步驟 1：部署後端到 Railway

```bash
cd "/Users/kevinchou/Home Inspection/apps/backend"

# 安裝 Railway CLI
npm i -g @railway/cli

# 登錄 Railway
railway login

# 初始化項目
railway init

# 部署
railway up

# 設置環境變量
railway variables set OPENAI_API_KEY=your_openai_key
railway variables set DB_URL=sqlite:///./data/home_inspection.db
# 或使用 Railway 提供的 PostgreSQL

# 獲取後端 URL（類似：https://your-app.railway.app）
railway domain
```

### 步驟 2：部署前端到 Vercel

```bash
cd "/Users/kevinchou/Home Inspection/apps/frontend"

# 安裝 Vercel CLI
npm i -g vercel

# 登錄 Vercel
vercel login

# 構建前端
npm run build

# 部署
vercel --prod

# 設置環境變量（使用 Railway 的後端 URL）
vercel env add VITE_API_URL production
# 輸入：https://your-backend.railway.app

vercel env add VITE_WS_URL production
# 輸入：wss://your-backend.railway.app

# 重新部署使環境變量生效
vercel --prod
```

### 步驟 3：更新後端 CORS

在 Railway 設置中添加前端 URL：

```bash
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app
```

### 步驟 4：在 iPhone 上訪問

1. 打開 iPhone Safari
2. 訪問 Vercel 提供的前端 URL：`https://your-frontend.vercel.app`
3. ✅ 完成！電腦關機也能使用

---

## 🔍 方案比較

| 特性 | ngrok (方案 A) | 雲端部署 (方案 B) |
|------|----------------|-------------------|
| 設置時間 | 5-10 分鐘 | 30-60 分鐘 |
| 電腦需開機 | ✅ 是 | ❌ 否 |
| URL 固定 | ❌ 否（免費版） | ✅ 是 |
| 費用 | 免費 | 免費（基礎套餐） |
| 穩定性 | 中等 | 高 |
| 適合場景 | 測試、臨時使用 | 長期使用 |

---

## 💡 推薦

- **快速測試**：使用方案 A (ngrok)
- **長期使用**：使用方案 B (雲端部署)

---

## ❓ 需要幫助？

選擇您想要的方案，我可以協助您完成部署！

