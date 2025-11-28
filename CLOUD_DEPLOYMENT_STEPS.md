# ☁️ 雲端部署步驟指南 - Home Inspection System

## 📋 部署概述

本指南將幫助您將 Home Inspection 系統部署到雲端，讓 iPhone 可以在任何地方訪問。

**部署方案：**
- **前端：** Vercel（免費）
- **後端：** Railway（免費套餐可用）

---

## ✅ 前置條件

在開始之前，請確保您有：

1. ✅ **GitHub 帳號** - 代碼需要推送到 GitHub
2. ✅ **Vercel 帳號** - https://vercel.com/signup
3. ✅ **Railway 帳號** - https://railway.app/signup
4. ✅ **OpenAI API Key** - 系統需要此 API key

---

## 🚀 部署步驟

### 步驟 1：準備 GitHub 倉庫

```bash
# 檢查 Git 狀態
cd "/Users/kevinchou/Home Inspection"
git status

# 如果有未提交的更改，先提交
git add .
git commit -m "Prepare for cloud deployment"

# 如果還沒有遠程倉庫，需要先創建 GitHub 倉庫並添加 remote
# git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
# git push -u origin main
```

### 步驟 2：部署後端到 Railway

#### 2.1 安裝 Railway CLI

```bash
npm i -g @railway/cli
```

#### 2.2 登錄 Railway

```bash
railway login
```

這會打開瀏覽器讓您登錄 Railway。

#### 2.3 初始化並部署

```bash
cd "/Users/kevinchou/Home Inspection/apps/backend"
railway init
railway up
```

#### 2.4 設置環境變量

在 Railway Dashboard 或使用 CLI：

```bash
# 獲取 OpenAI API Key（請替換為您的實際 key）
railway variables set OPENAI_API_KEY=your_openai_api_key_here
railway variables set OPENAI_VISION_MODEL=gpt-4o-mini
railway variables set REALTIME_MODEL=gpt-4

# 設置數據庫（Railway 會自動提供 PostgreSQL，或使用 SQLite）
# 如果使用 Railway 的 PostgreSQL：
railway add postgresql
# 然後設置 DB_URL（Railway 會自動生成）
```

#### 2.5 獲取後端 URL

```bash
railway domain
```

記下這個 URL（例如：`https://your-backend.railway.app`）

---

### 步驟 3：部署前端到 Vercel

#### 3.1 安裝 Vercel CLI

```bash
npm i -g vercel
```

#### 3.2 登錄 Vercel

```bash
vercel login
```

#### 3.3 構建前端

```bash
cd "/Users/kevinchou/Home Inspection/apps/frontend"

# 創建生產環境配置文件
cat > .env.production << EOF
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app
EOF

# 構建
npm run build
```

**注意：** 請將 `your-backend.railway.app` 替換為步驟 2.5 中獲得的實際 URL。

#### 3.4 部署到 Vercel

```bash
# 首次部署（會引導您設置）
vercel

# 生產環境部署
vercel --prod
```

#### 3.5 設置環境變量

在 Vercel Dashboard 或使用 CLI：

```bash
vercel env add VITE_API_URL production
# 輸入：https://your-backend.railway.app

vercel env add VITE_WS_URL production
# 輸入：wss://your-backend.railway.app

# 重新部署使環境變量生效
vercel --prod
```

---

### 步驟 4：配置 CORS

在 Railway 後端設置中添加前端 URL：

```bash
cd "/Users/kevinchou/Home Inspection/apps/backend"

# 獲取前端 URL（從 Vercel）
# 然後設置 CORS
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app
```

或者在 Railway Dashboard 中直接設置。

---

### 步驟 5：驗證部署

#### 5.1 測試後端

```bash
# 獲取後端 URL
railway domain

# 測試健康檢查
curl https://your-backend.railway.app/health

# 測試 API 文檔
# 訪問：https://your-backend.railway.app/docs
```

#### 5.2 測試前端

```bash
# 獲取前端 URL
vercel ls

# 在瀏覽器中訪問前端 URL
# 測試功能是否正常
```

#### 5.3 在 iPhone 上測試

1. 打開 iPhone Safari
2. 訪問 Vercel 提供的前端 URL
3. ✅ 測試所有功能

---

## 🔧 故障排除

### 問題 1：後端部署失敗

**可能原因：**
- 依賴安裝失敗
- 環境變量未設置

**解決方案：**
```bash
# 檢查 Railway 日誌
railway logs

# 檢查環境變量
railway variables
```

### 問題 2：前端無法連接後端

**可能原因：**
- CORS 配置錯誤
- 環境變量未正確設置

**解決方案：**
```bash
# 檢查前端環境變量
vercel env ls

# 檢查後端 CORS 設置
railway variables | grep CORS
```

### 問題 3：數據庫連接問題

**解決方案：**
- Railway 提供免費 PostgreSQL，建議使用
- 或使用 SQLite（不適合生產環境）

---

## 📝 重要提示

1. **環境變量：** 確保所有必要的環境變量都已設置
2. **CORS：** 後端必須允許前端域名訪問
3. **API Key：** 確保 OpenAI API Key 有效且有足夠額度
4. **數據庫：** 生產環境建議使用 PostgreSQL

---

## 🎉 完成！

部署完成後，您將獲得：
- ✅ 前端 URL（Vercel）
- ✅ 後端 URL（Railway）
- ✅ 可在任何地方訪問的系統

**下一步：**
- 在 iPhone 上訪問前端 URL
- 測試所有功能
- 享受隨時隨地訪問的便利！

---

## 📞 需要幫助？

如果遇到問題，請檢查：
1. Railway 和 Vercel 的日誌
2. 環境變量配置
3. CORS 設置

