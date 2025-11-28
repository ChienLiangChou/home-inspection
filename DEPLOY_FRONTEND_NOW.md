# 🚀 立即部署前端到 Vercel

## ✅ 準備就緒

- ✅ Vercel CLI 已安裝（版本 48.12.0）
- ✅ 前端配置已準備（`apps/frontend/vercel.json`）
- ✅ GitHub 倉庫已準備
- ✅ 構建腳本已配置

---

## 📋 部署步驟

### 方法 A：使用 Vercel CLI（推薦）

#### 步驟 1：登錄 Vercel（如果還沒有）
```bash
cd "/Users/kevinchou/Home Inspection/apps/frontend"
vercel login
```

#### 步驟 2：部署到 Vercel
```bash
vercel
```

首次部署會提示：
- Set up and deploy? → Yes
- Which scope? → 選擇您的帳號
- Link to existing project? → No（首次部署）
- Project name? → home-inspection-frontend（或使用默認值）
- Directory? → .（當前目錄）
- Override settings? → No

#### 步驟 3：設置環境變量
```bash
vercel env add VITE_API_URL production
# 輸入您的 Render 後端 URL，例如：
# https://home-inspection-xxxx.onrender.com
```

#### 步驟 4：部署到生產環境
```bash
vercel --prod
```

---

### 方法 B：使用 Vercel Dashboard（視覺化）

1. 訪問 https://vercel.com/dashboard
2. 點擊 "Add New..." → "Project"
3. 選擇 GitHub 倉庫：`ChienLiangChou/home-inspection`
4. 配置項目：
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 添加環境變量：
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.onrender.com`
6. 點擊 "Deploy"

---

## 🔍 需要的信息

在部署前，需要先獲取：

1. **Render 後端 URL**
   - 從 Render Dashboard 獲取
   - 格式：`https://home-inspection-xxxx.onrender.com`

---

## ✅ 部署完成後

1. 記下 Vercel 提供的前端 URL
2. 更新 Render 後端的 CORS 設置
3. 測試完整系統

---

**讓我開始部署流程！** 🚀

