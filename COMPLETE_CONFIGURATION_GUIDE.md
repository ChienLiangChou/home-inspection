# 🔧 完成環境變量配置指南

## 📋 當前狀態

### ✅ 已完成
- ✅ 前端已部署到 Vercel
- ✅ 前端 URL: `https://home-inspection-frontend.vercel.app/`
- ✅ 前端可以訪問

### ⏳ 需要完成
- ⏳ 檢查 Render 後端服務狀態
- ⏳ 獲取後端 URL
- ⏳ 配置環境變量

---

## 🔍 步驟 1: 檢查 Render 後端服務

1. 訪問 Render Dashboard: https://dashboard.render.com/
2. 查找服務名稱：
   - 可能是 `home-inspection`
   - 可能是 `Home Inspection`
   - 可能是 `home-inspection-backend`

3. 點擊服務進入詳情頁面
4. 在服務詳情頁面找到 **URL**（通常在頂部）
   - 格式：`https://home-inspection-xxxx.onrender.com`

---

## 🔧 步驟 2: 在 Vercel 配置前端環境變量

1. 訪問 Vercel Dashboard: https://vercel.com/skc-realty-teams-projects/home-inspection-frontend
2. 點擊 **Settings**（設置）標籤
3. 點擊左側 **Environment Variables**（環境變量）
4. 添加新的環境變量：
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.onrender.com`（替換為實際的 Render 後端 URL）
   - **Environment**: 選擇 `Production`, `Preview`, `Development`（或全部）
5. 點擊 **Save**
6. 重新部署前端（Vercel 會自動觸發）

---

## 🔧 步驟 3: 在 Render 配置後端環境變量

1. 在 Render 服務詳情頁面，點擊左側 **Environment**（環境變量）標籤
2. 添加/更新環境變量：

   **CORS_ORIGINS**:
   - **Key**: `CORS_ORIGINS`
   - **Value**: `https://home-inspection-frontend.vercel.app`
   - 點擊 **Save Changes**

   **其他環境變量（如果還沒設置）**:
   - `REALTIME_MODEL`: `gpt-4`
   - `DEBUG`: `false`

3. Render 會自動重新部署

---

## ✅ 步驟 4: 驗證配置

### 驗證前端可以訪問後端

1. 訪問前端 URL: `https://home-inspection-frontend.vercel.app/`
2. 打開瀏覽器開發者工具（F12）
3. 查看 Console（控制台）是否有錯誤
4. 嘗試使用功能（如 Dashboard），查看 Network（網絡）標籤是否有成功的 API 請求

### 驗證後端 API

訪問後端 API 文檔：
```
https://your-backend-url.onrender.com/docs
```

應該能看到 FastAPI 自動生成的 API 文檔。

---

## 📝 需要的 URL

- **前端 URL**: `https://home-inspection-frontend.vercel.app/`
- **後端 URL**: `https://home-inspection-xxxx.onrender.com`（需要從 Render Dashboard 獲取）

---

## 🎯 配置完成後的狀態

配置完成後：
- ✅ 前端可以訪問
- ✅ 後端 API 可以訪問
- ✅ 前端可以調用後端 API
- ✅ CORS 已正確配置
- ✅ 系統完全可用

---

**請告訴我您找到的 Render 後端 URL，我可以幫您完成配置！** 🚀

