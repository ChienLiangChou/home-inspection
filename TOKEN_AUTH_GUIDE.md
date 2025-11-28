# 🔐 使用 API Token 登錄（推薦方式）

## 為什麼使用 Token？

使用 API Token 比瀏覽器登錄更適合自動化部署，無需交互式操作。

---

## 📋 獲取 Token 的步驟

### Railway Token

1. **訪問 Railway Dashboard**
   - 打開：https://railway.app/account/tokens

2. **創建新 Token**
   - 點擊 "New Token"
   - 輸入名稱（例如：home-inspection-deploy）
   - 複製生成的 token

3. **設置環境變量**
   ```bash
   export RAILWAY_TOKEN=your_token_here
   ```

### Vercel Token

1. **訪問 Vercel Dashboard**
   - 打開：https://vercel.com/account/tokens

2. **創建新 Token**
   - 點擊 "Create Token"
   - 輸入名稱（例如：home-inspection-deploy）
   - 選擇範圍（Full Account）
   - 複製生成的 token

3. **使用 Token 登錄**
   ```bash
   vercel login --token your_token_here
   ```

---

## 🚀 快速設置

### 方法 1：環境變量

```bash
# Railway
export RAILWAY_TOKEN=your_railway_token_here

# Vercel
vercel login --token your_vercel_token_here
```

### 方法 2：配置文件

```bash
# Railway token
echo "your_railway_token_here" > ~/.railway-token

# Vercel token
vercel login --token your_vercel_token_here
```

---

## ⚠️ 安全提示

1. **不要將 token 提交到 Git**
2. **使用環境變量存儲**
3. **定期輪換 token**
4. **只在必要時使用**

---

## 💡 推薦流程

如果可能，請提供您的 Railway 和 Vercel API tokens，我可以直接使用它們進行部署，無需瀏覽器授權。

**或者**，您可以：
1. 手動獲取 tokens（按照上面的步驟）
2. 提供給我
3. 我將使用 tokens 完成部署

