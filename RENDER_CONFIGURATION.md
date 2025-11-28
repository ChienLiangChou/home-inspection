# 🚀 Render Web Service 配置指南

## 📋 當前狀態

我已經為您打開了 Render 創建 Web Service 頁面。由於 `home-inspection` 倉庫可能還沒有出現在 Render 的倉庫列表中（可能需要幾秒鐘同步），請按照以下步驟配置：

---

## 🔧 配置步驟

### 1. 選擇倉庫

在 **"Search"** 框中，如果 `home-inspection` 還沒有出現：

**選項 A：** 等待幾秒鐘，倉庫應該會出現在列表中，然後點擊 `ChienLiangChou / home-inspection`

**選項 B：** 如果沒有出現，先選擇其他倉庫完成表單配置，稍後可以在服務設置中更改倉庫。

---

### 2. 填寫服務名稱

**Name：** `home-inspection-backend`

---

### 3. 選擇運行環境

**Language：** 從 "Node" 改為 **"Python"**

---

### 4. 分支設置

**Branch：** `main` (應該已經默認選擇)

---

### 5. Root Directory（重要！）

**Root Directory：** `apps/backend`

這是關鍵設置，因為我們的後端代碼在 `apps/backend` 目錄中。

---

### 6. Build Command

**Build Command：**
```bash
pip install -r requirements.txt
```

---

### 7. Start Command

**Start Command：**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

### 8. 計劃選擇

**Instance Type：** 選擇 **"Free"** ($0/month)

---

### 9. 區域選擇

**Region：** `Oregon (US West)` (應該已經默認選擇)

---

## ✅ 完成後

點擊 **"Create Web Service"** 按鈕

---

## ⚙️ 部署後需要設置的環境變量

在服務創建完成後，需要在 Render Dashboard 的服務設置中添加：

```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_VISION_MODEL=gpt-4o-mini
REALTIME_MODEL=gpt-4
DEBUG=false
```

---

**告訴我您是否看到 `home-inspection` 倉庫在列表中，或者是否需要我幫您手動填寫其他配置！** 🚀

