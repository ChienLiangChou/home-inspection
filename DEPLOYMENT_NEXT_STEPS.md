# ✅ 免費方案已選擇，準備部署！

## 📋 當前狀態

1. ✅ **服務名稱：** Home Inspection
2. ✅ **倉庫 URL：** 已連接 (`https://github.com/ChienLiangChou/home-inspection.git`)
3. ✅ **語言：** Python 3
4. ✅ **Root Directory：** `apps/backend`
5. ✅ **Build Command：** `pip install -r requirements.txt`
6. ✅ **Start Command：** `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. ✅ **Plan：** Free ($0 / month)
8. ✅ **付費彈窗：** 已關閉

---

## 🚀 下一步操作

### 現在您可以：

1. **再次點擊 "Deploy web service" 按鈕**
   - 免費方案已經選擇
   - 付費彈窗已關閉
   - 這次應該可以直接部署

2. **等待部署完成**
   - 部署過程可能需要 2-5 分鐘
   - 可以在 Render Dashboard 查看部署進度和日誌

---

## ⚙️ 部署完成後需要做的

### 1. 設置環境變量

在服務部署完成後，進入服務設置頁面，添加：

```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_VISION_MODEL=gpt-4o-mini
REALTIME_MODEL=gpt-4
DEBUG=false
```

### 2. 獲取後端 URL

部署完成後，Render 會提供一個 URL，例如：
- `https://home-inspection.onrender.com`

記下這個 URL，稍後配置前端時需要。

---

## 💡 免費方案說明

- **價格：** $0 / 月
- **限制：** 服務會在 15 分鐘無活動後休眠
- **喚醒時間：** 第一次訪問需要 30-60 秒喚醒

如果需要保持服務一直運行，可以使用 UptimeRobot 免費服務定期 ping。

---

**現在應該可以成功部署了！請再次點擊 "Deploy web service" 按鈕！** 🚀

