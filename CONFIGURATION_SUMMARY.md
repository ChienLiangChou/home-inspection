# ✅ 配置總結

## 📋 找到的信息

### 後端服務（Render）
- **服務名稱**: `home-inspection`
- **後端 URL**: `http://home-inspection-gnpo.onrender.com`
- **服務 ID**: `srv-d4kj008gjchc73a717eg`

### 前端服務（Vercel）
- **前端 URL**: `https://home-inspection-frontend.vercel.app/`

---

## 🔧 需要配置的環境變量

### 1. Render 後端環境變量

需要添加/更新：
- **CORS_ORIGINS**: `https://home-inspection-frontend.vercel.app`

已在 Render 配置：
- ✅ `OPENAI_API_KEY` (已設置)
- ✅ `OPENAI_VISION_MODEL` = `gpt-4o-mini` (已設置)

可能還需要：
- `REALTIME_MODEL` = `gpt-4`
- `DEBUG` = `false`

### 2. Vercel 前端環境變量

需要添加：
- **VITE_API_URL**: `https://home-inspection-gnpo.onrender.com`（注意使用 HTTPS）

---

## 📝 配置步驟

### 步驟 1: 在 Render 配置 CORS

1. 訪問服務詳情頁面
2. 點擊 **Environment** 標籤
3. 添加環境變量：
   - Key: `CORS_ORIGINS`
   - Value: `https://home-inspection-frontend.vercel.app`
4. 點擊 **Save Changes**
5. Render 會自動重新部署

### 步驟 2: 在 Vercel 配置 API URL

1. 訪問 Vercel 項目設置
2. 點擊 **Settings** → **Environment Variables**
3. 添加環境變量：
   - Key: `VITE_API_URL`
   - Value: `https://home-inspection-gnpo.onrender.com`
   - Environment: 選擇 `Production`, `Preview`, `Development`
4. 點擊 **Save**
5. 重新部署前端

---

**配置完成後，系統就可以完全使用了！** 🎉

