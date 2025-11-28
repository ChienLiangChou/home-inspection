# 快速部署指南 - 5分钟让系统在外网可用

## 当前问题

❌ **现在只能在本地网络使用**
- 在家里：iPhone 和电脑在同一 WiFi，可以使用 `https://10.0.0.33:3000`
- 在外面：使用移动数据时，无法访问本地 IP 地址

## 解决方案：使用 ngrok（最简单）

### 步骤 1：安装 ngrok

```bash
# macOS
brew install ngrok

# 或访问 https://ngrok.com/download 下载
```

### 步骤 2：启动后端

```bash
cd "/Users/kevinchou/Home Inspection/apps/backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 步骤 3：为后端创建 ngrok 隧道

**新开一个终端窗口：**
```bash
ngrok http 8000
```

**您会看到类似这样的输出：**
```
Forwarding  https://abc123-def456.ngrok.io -> http://localhost:8000
```

**复制这个 HTTPS URL**（例如：`https://abc123-def456.ngrok.io`）

### 步骤 4：更新后端 CORS 配置

编辑 `apps/backend/main.py`，在 CORS_ORIGINS 中添加您的 ngrok URL：

```python
allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,...,https://abc123-def456.ngrok.io").split(","),
```

**或者使用环境变量：**
```bash
cd apps/backend
echo "CORS_ORIGINS=http://localhost:3000,https://abc123-def456.ngrok.io" >> .env
```

### 步骤 5：启动前端

**新开一个终端窗口：**
```bash
cd "/Users/kevinchou/Home Inspection/apps/frontend"

# 创建环境变量文件
echo "VITE_API_URL=https://abc123-def456.ngrok.io" > .env.local

# 启动前端
npm run dev
```

### 步骤 6：为前端创建 ngrok 隧道

**再开一个终端窗口：**
```bash
ngrok http 3000
```

**复制前端的 ngrok URL**（例如：`https://xyz789-uvw012.ngrok.io`）

### 步骤 7：在 iPhone 上访问

1. 打开 iPhone Safari
2. 访问前端的 ngrok URL：`https://xyz789-uvw012.ngrok.io`
3. 首次访问会显示警告（ngrok 的证书），点击"继续访问"
4. 现在可以在外网使用移动数据访问了！

## 注意事项

### ngrok 免费版限制
- ⚠️ URL 每次重启都会变化
- ⚠️ 有连接数限制
- ✅ 但完全免费，适合测试

### ngrok 付费版（可选）
- 固定域名（不会变）
- 更多连接数
- 约 $8/月

### 更持久的解决方案
如果经常使用，建议部署到：
- **Vercel**（前端，免费）
- **Railway**（后端，免费套餐）
- 详见 `DEPLOYMENT.md`

## 测试检查清单

- [ ] 后端 ngrok 隧道运行中
- [ ] 前端 ngrok 隧道运行中
- [ ] 后端 CORS 已更新
- [ ] 前端环境变量已设置
- [ ] iPhone 可以访问前端 ngrok URL
- [ ] 相机功能可以正常使用
- [ ] 在外网（移动数据）可以正常使用

## 常见问题

**Q: ngrok URL 每次重启都变？**
A: 免费版会变。可以：
1. 使用 ngrok 付费版获得固定域名
2. 或部署到云服务（Vercel + Railway）

**Q: 连接很慢？**
A: ngrok 免费版有速度限制，付费版会更快

**Q: 想永久部署？**
A: 查看 `DEPLOYMENT.md` 了解云服务部署方案





