# 📍 第一步：設置環境變量的位置

## 🎯 答案：在哪裡設置環境變量？

### 位置說明

**第一步（設置環境變量）在 Render Dashboard 的 Environment 頁面**

---

## 📍 具體位置

### 方法 1：從服務主頁導航

1. **打開服務頁面**
   - 訪問：`https://dashboard.render.com/web/srv-d4kj008gjchc73a717eg`
   - 或者在 Dashboard 主頁點擊 `home-inspection` 服務

2. **點擊左側導航欄**
   - 在左側菜單中，找到並點擊 **"Environment"** 鏈接
   - 它位於以下位置：
     - Dashboard（主頁）
     - Event
     - Settings
     - Log
     - Metric
     - **Environment** ← 點擊這裡！
     - Shell
     - Scaling
     - Preview
     - Disk
     - Job

3. **進入環境變量頁面**
   - URL 會變成：`https://dashboard.render.com/web/srv-d4kj008gjchc73a717eg/env`

---

### 方法 2：直接訪問

直接訪問 Environment 頁面 URL：
```
https://dashboard.render.com/web/srv-d4kj008gjchc73a717eg/env
```

---

## 🔧 在 Environment 頁面上

### 您會看到：

1. **現有環境變量列表**（如果有的話）
2. **"Add" 或 "Add Environment Variable" 按鈕**
3. **環境變量表格**，包含：
   - Key（變量名）
   - Value（變量值）
   - Actions（編輯/刪除按鈕）

### 如何添加環境變量：

1. **點擊 "Add" 或 "Add Environment Variable" 按鈕**
   - 通常位於頁面右上角或環境變量列表上方

2. **填寫環境變量**
   - **Key**: 輸入變量名（例如：`OPENAI_API_KEY`）
   - **Value**: 輸入變量值（例如：您的 API Key）

3. **保存**
   - 點擊 **"Save Changes"** 或 **"Add"** 按鈕
   - Render 會自動觸發重新部署

---

## 📋 需要添加的環境變量

### 必填變量列表：

| Key | Value | 說明 |
|-----|-------|------|
| `OPENAI_API_KEY` | `your_openai_api_key_here` | OpenAI API Key（必需） |
| `OPENAI_VISION_MODEL` | `gpt-4o-mini` | 視覺模型 |
| `REALTIME_MODEL` | `gpt-4` | 實時模型 |
| `DEBUG` | `false` | 調試模式 |

---

## 💡 提示

1. **我已經為您打開了 Environment 頁面**
   - 當前 URL: `https://dashboard.render.com/web/srv-d4kj008gjchc73a717eg/env`
   - 您應該已經在這個頁面上了

2. **添加環境變量後**
   - Render 會自動保存並觸發重新部署
   - 可以在 "Log" 標籤查看部署進度

3. **安全性**
   - 環境變量是加密存儲的
   - 不會在代碼或日誌中顯示實際值

---

**現在您應該在 Environment 頁面上了，可以開始添加環境變量！** ✅

