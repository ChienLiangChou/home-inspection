# 🚀 快速配置步驟

## ✅ 已找到的信息

### 後端（Render）
- **URL**: `https://home-inspection-gnpo.onrender.com`

### 前端（Vercel）
- **URL**: `https://home-inspection-frontend.vercel.app/`

---

## 🔧 快速配置（5 分鐘）

### 步驟 1: 在 Render 添加 CORS_ORIGINS

1. 訪問：https://dashboard.render.com/web/srv-d4kj008gjchc73a717eg/env
2. 點擊 **"Add"** 按鈕
3. 填寫：
   - **Key**: `CORS_ORIGINS`
   - **Value**: `https://home-inspection-frontend.vercel.app`
4. 點擊 **"Save Changes"**
5. Render 會自動重新部署

---

### 步驟 2: 在 Vercel 添加 VITE_API_URL

1. 訪問：https://vercel.com/skc-realty-teams-projects/home-inspection-frontend/settings/environment-variables
2. 點擊 **"Add New"** 或 **"Add"** 按鈕
3. 填寫：
   - **Key**: `VITE_API_URL`
   - **Value**: `https://home-inspection-gnpo.onrender.com`
   - **Environment**: 選擇 `Production`, `Preview`, `Development`（或全部）
4. 點擊 **"Save"**
5. 重新部署前端（Vercel Dashboard → Deployments → 選擇最新部署 → Redeploy）

---

## ✅ 完成後

配置完成後，系統就可以完全使用了！

**測試**:
1. 訪問前端：https://home-inspection-frontend.vercel.app/
2. 測試功能（如 Dashboard）
3. 查看瀏覽器控制台是否有錯誤

---

**配置完成後，告訴我，我可以幫您驗證！** 🎉

