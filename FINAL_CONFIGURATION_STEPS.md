# 🔧 最終配置步驟

## ✅ 已找到的信息

### 後端（Render）
- **服務名稱**: `home-inspection`
- **後端 URL**: `https://home-inspection-gnpo.onrender.com`（使用 HTTPS）

### 前端（Vercel）
- **前端 URL**: `https://home-inspection-frontend.vercel.app/`

---

## 🔧 配置步驟

### 步驟 1: 在 Render 添加 CORS_ORIGINS

1. ✅ 已在環境變量頁面：`https://dashboard.render.com/web/srv-d4kj008gjchc73a717eg/env`
2. 查找 "Add Variable" 或 "New Variable" 按鈕
3. 添加環境變量：
   - **Key**: `CORS_ORIGINS`
   - **Value**: `https://home-inspection-frontend.vercel.app`
4. 點擊 "Save Changes"
5. Render 會自動重新部署

### 步驟 2: 在 Vercel 添加 VITE_API_URL

1. 訪問 Vercel 項目設置
2. 點擊 **Settings** → **Environment Variables**
3. 添加環境變量：
   - **Key**: `VITE_API_URL`
   - **Value**: `https://home-inspection-gnpo.onrender.com`
   - **Environment**: 選擇所有環境（Production, Preview, Development）
4. 點擊 **Save**
5. 重新部署前端

---

**正在繼續配置...** 🔧

