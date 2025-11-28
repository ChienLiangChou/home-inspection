# 🚀 設置 GitHub 倉庫並部署到 Render

## 步驟 1：創建 GitHub 倉庫

### 1.1 訪問 GitHub 創建新倉庫

1. **打開瀏覽器，訪問：** https://github.com/new

2. **填寫倉庫信息：**
   - **Repository name:** `home-inspection`
   - **Description:** `Home Inspection System with AI-powered analysis`
   - **Visibility:** 選擇 **Public** 或 **Private**（根據您的需要）
   - ⚠️ **重要：不要勾選** "Add a README file"、"Add .gitignore" 或 "Choose a license"
   - 直接點擊 **"Create repository"**

3. **創建完成後，GitHub 會顯示設置說明頁面**（暫時關閉即可）

---

## 步驟 2：推送代碼到 GitHub

創建倉庫後，在終端執行：

```bash
cd "/Users/kevinchou/Home Inspection"

# 添加遠程倉庫
git remote add origin https://github.com/ChienLiangChou/home-inspection.git

# 確保分支名稱是 main
git branch -M main

# 推送代碼到 GitHub
git push -u origin main
```

**注意：** 如果提示需要認證，GitHub 現在使用 Personal Access Token。可以在 https://github.com/settings/tokens 創建一個 token（需要 `repo` 權限）。

---

## 步驟 3：登錄 Render

1. **訪問：** https://render.com
2. **點擊 "Get Started for Free"** 或 **"Sign In"**
3. **選擇 "Log in with GitHub"**
4. **授權 Render** 訪問您的 GitHub 帳號

---

## 步驟 4：在 Render 創建 Web Service

登錄後：

1. **點擊 Dashboard 右上角的 "New +"**
2. **選擇 "Web Service"**
3. **連接 GitHub 倉庫：**
   - 如果第一次使用，點擊 "Connect GitHub" 並授權
   - 選擇倉庫：`ChienLiangChou/home-inspection`
4. **配置服務設置：**
   - **Name:** `home-inspection-backend`
   - **Region:** 選擇離您最近的（如 `Oregon (US West)`）
   - **Branch:** `main`
   - **Root Directory:** `apps/backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** 選擇 **Free**
5. **點擊 "Create Web Service"**

---

## 步驟 5：設置環境變量

在 Render Dashboard 的服務頁面：

1. **點擊左側 "Environment"** 標籤
2. **添加以下環境變量：**

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_VISION_MODEL=gpt-4o-mini
   REALTIME_MODEL=gpt-4
   DEBUG=false
   ```

   **注意：** 將 `your_openai_api_key_here` 替換為您的實際 OpenAI API Key

3. **保存設置**（Render 會自動重新部署）

---

## 步驟 6：獲取後端 URL

部署完成後（可能需要幾分鐘）：

1. 在 Render Dashboard 的服務頁面，您會看到一個 URL，例如：
   ```
   https://home-inspection-backend.onrender.com
   ```

2. **記下這個 URL**，稍後需要配置前端

---

## 步驟 7：設置 CORS（等前端部署後）

前端部署到 Vercel 後，回到 Render Dashboard：

1. 添加環境變量：
   ```
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```

---

## ✅ 檢查清單

- [ ] GitHub 倉庫已創建
- [ ] 代碼已推送到 GitHub
- [ ] 已登錄 Render（使用 GitHub）
- [ ] Web Service 已在 Render 創建
- [ ] 環境變量已設置
- [ ] 後端 URL 已獲取

---

## 🎯 下一步

完成後端部署後，我們將：
1. 部署前端到 Vercel
2. 配置前端環境變量
3. 更新後端 CORS 設置
4. 測試完整系統

