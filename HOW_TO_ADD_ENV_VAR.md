# ✅ 如何添加環境變量 - 步驟說明

## 🎯 選擇 "New Variable"

當您點擊 "Add" 按鈕後，會看到以下選項：

### 選項列表：

1. ✅ **New variable** ← **選擇這個！**
   - 用於添加自定義環境變量
   - 可以輸入任意的 Key 和 Value

2. ❌ **Datastore URL**
   - 用於連接數據庫（PostgreSQL、Redis 等）
   - 我們暫時不需要，使用默認的 SQLite

3. ❌ **Generated Secret**
   - 用於生成隨機密鑰
   - 我們不需要

4. ⚠️ **Import from .env**
   - 可以從 .env 文件批量導入環境變量
   - 可選，稍後可以使用

---

## 📝 選擇 "New variable" 後的步驟

1. **點擊 "New variable"**

2. **填寫環境變量表單**
   - 會顯示一個表格，包含 "Key" 和 "Value" 兩列
   - 第一行是新添加的空行，可以輸入

3. **填寫第一個環境變量**
   - **Key**: 輸入 `OPENAI_API_KEY`
   - **Value**: 輸入您的實際 OpenAI API Key

4. **保存**
   - 點擊表格外的 "Add" 或 "Save Changes" 按鈕

5. **重複添加其他變量**
   - 再次點擊 "Add" → "New variable"
   - 添加其他變量：
     - `OPENAI_VISION_MODEL` = `gpt-4o-mini`
     - `REALTIME_MODEL` = `gpt-4`
     - `DEBUG` = `false`

---

## 💡 提示

- **Key** 是大寫字母和下劃線的組合
- **Value** 如果是 API Key，請確保輸入正確
- 保存後 Render 會自動重新部署

---

**現在您知道要選擇 "New variable" 了！** ✅

