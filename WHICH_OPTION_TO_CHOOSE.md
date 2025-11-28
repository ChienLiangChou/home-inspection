# ✅ 選擇哪個選項？

## 🎯 答案：選擇 "New Variable"

當您點擊 "Add" 按鈕後，會看到幾個選項：

### 選項說明：

1. ✅ **New Variable** ← **選擇這個！**
   - 用途：添加自定義環境變量
   - 適用於：`OPENAI_API_KEY`、`DEBUG` 等

2. ❌ **Datastore URL...**
   - 用途：連接數據庫（PostgreSQL、Redis 等）
   - 暫時不需要，我們使用 SQLite（默認）

3. 其他選項（如果有）
   - 可能是其他預設的環境變量類型
   - 我們不需要

---

## 📝 選擇 "New Variable" 後的步驟

1. **選擇 "New Variable"**

2. **填寫環境變量**
   - **Key**: `OPENAI_API_KEY`
   - **Value**: 您的實際 OpenAI API Key

3. **點擊 "Add" 或 "Save"**

4. **重複添加其他變量**
   - `OPENAI_VISION_MODEL` = `gpt-4o-mini`
   - `REALTIME_MODEL` = `gpt-4`
   - `DEBUG` = `false`

---

## 💡 提示

- **"New Variable"** 是最靈活的選項，可以添加任何環境變量
- 每次添加一個變量，重複步驟添加其他變量
- 保存後 Render 會自動重新部署

---

**請選擇 "New Variable" 並開始添加環境變量！** ✅

