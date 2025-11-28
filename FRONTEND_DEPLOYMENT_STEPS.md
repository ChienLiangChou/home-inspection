# 🚀 前端部署到 Vercel - 步驟指南

## 📋 當前狀態

- ✅ Vercel CLI 已安裝：`/opt/homebrew/bin/vercel`
- ✅ 前端配置文件已準備：`apps/frontend/vercel.json`
- ✅ GitHub 倉庫已準備：`https://github.com/ChienLiangChou/home-inspection`

---

## 🔧 部署步驟

### 步驟 1：獲取 Render 後端 URL

1. 檢查 Render Dashboard 上的服務狀態
2. 獲取後端 URL（例如：`https://home-inspection-xxxx.onrender.com`）

### 步驟 2：登錄 Vercel

如果還沒有登錄，運行：
```bash
vercel login
```

### 步驟 3：部署前端

進入前端目錄並部署：
```bash
cd apps/frontend
vercel
```

或使用指定參數：
```bash
vercel --prod
```

### 步驟 4：配置環境變量

在 Vercel Dashboard 或使用 CLI：
```bash
vercel env add VITE_API_URL production
# 輸入：https://your-backend-url.onrender.com
```

### 步驟 5：重新部署

環境變量更新後，需要重新部署：
```bash
vercel --prod
```

---

## 📝 前端配置說明

### 需要的環境變量

- `VITE_API_URL`: Render 後端 URL
  - 例如：`https://home-inspection-xxxx.onrender.com`
  - 用於 API 調用和 WebSocket 連接

### Build 配置

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite

---

## ✅ 完成後

1. 獲取 Vercel 前端 URL
2. 更新 Render 後端的 CORS 設置
3. 測試完整系統

---

**準備開始部署！** 🚀

