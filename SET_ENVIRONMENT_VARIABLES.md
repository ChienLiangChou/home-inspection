# 🔧 設置環境變量 - 詳細步驟

## 📍 第一步的位置

### 在哪裡設置環境變量？

**位置：** Render Dashboard → `home-inspection` 服務 → **Environment** 標籤

**具體步驟：**

1. **打開服務頁面**
   - URL: `https://dashboard.render.com/web/srv-d4kj008gjchc73a717eg`
   - 或者從 Dashboard 點擊 `home-inspection` 服務

2. **點擊左側導航欄的 "Environment" 鏈接**
   - 在左側菜單中，找到並點擊 **"Environment"**
   - 它位於 "Log" 和 "Metric" 下方

3. **添加環境變量**
   - 點擊 **"Add Environment Variable"** 按鈕
   - 或使用 **"Add from file"** 選項批量添加

---

## 📋 需要添加的環境變量

### 必填變量：

1. **OPENAI_API_KEY**
   - Key: `OPENAI_API_KEY`
   - Value: `your_openai_api_key_here`（替換為您的實際 API Key）

2. **OPENAI_VISION_MODEL**
   - Key: `OPENAI_VISION_MODEL`
   - Value: `gpt-4o-mini`

3. **REALTIME_MODEL**
   - Key: `REALTIME_MODEL`
   - Value: `gpt-4`

4. **DEBUG**
   - Key: `DEBUG`
   - Value: `false`

---

## 📝 添加步驟詳解

### 方法 1：逐個添加

1. 點擊 **"Add Environment Variable"** 按鈕
2. 在 "Key" 輸入框中輸入變量名（例如：`OPENAI_API_KEY`）
3. 在 "Value" 輸入框中輸入變量值（例如：您的 API Key）
4. 點擊 **"Save Changes"** 或 **"Add"**
5. 重複以上步驟添加其他變量

### 方法 2：批量添加（推薦）

1. 點擊 **"Add from file"** 或使用批量編輯功能
2. 一次性添加所有變量：

```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_VISION_MODEL=gpt-4o-mini
REALTIME_MODEL=gpt-4
DEBUG=false
```

---

## ⚠️ 重要提示

1. **OPENAI_API_KEY 是必需的**
   - 沒有這個 Key，後端無法調用 OpenAI API
   - 請確保輸入正確的 API Key

2. **保存後會自動重新部署**
   - Render 會在保存環境變量後自動觸發重新部署
   - 部署過程可以在 "Log" 標籤中查看

3. **安全性**
   - 環境變量是加密存儲的
   - 不要在代碼中硬編碼 API Key

---

## ✅ 完成後

設置完環境變量後：
1. 等待自動重新部署完成
2. 檢查 "Log" 標籤確認部署成功
3. 測試後端 API 是否正常工作

---

**現在我已經為您打開了 Environment 頁面，您可以在那裡添加環境變量！** 🔧

