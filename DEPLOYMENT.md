# 部署指南 - 让系统可以在外网使用

## 当前状态

**目前系统只能在本地网络使用：**
- ✅ 在家里：iPhone 和电脑在同一 WiFi 网络，可以使用
- ❌ 在外面：使用移动数据时，无法访问 `10.0.0.33` 这个本地 IP 地址

## 部署选项

### 选项 1：云服务器部署（推荐，永久解决方案）

#### 1.1 选择云服务提供商
- **Vercel**（前端）+ **Railway/Render**（后端）- 免费套餐可用
- **AWS EC2** / **Google Cloud** / **Azure** - 需要付费但更灵活
- **DigitalOcean** / **Linode** - 性价比高，约 $5-10/月

#### 1.2 部署步骤（以 Vercel + Railway 为例）

**前端部署到 Vercel：**
```bash
cd apps/frontend
npm run build

# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 设置环境变量
vercel env add VITE_API_URL
# 输入：https://your-backend.railway.app
```

**后端部署到 Railway：**
```bash
cd apps/backend

# 安装 Railway CLI
npm i -g @railway/cli

# 登录并部署
railway login
railway init
railway up

# 设置环境变量
railway variables set OPENAI_API_KEY=your_key
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app
```

#### 1.3 更新配置

**前端 `.env.production`：**
```env
VITE_API_URL=https://your-backend.railway.app
```

**后端环境变量：**
```env
CORS_ORIGINS=https://your-frontend.vercel.app,https://your-frontend.vercel.app
OPENAI_API_KEY=your_key
```

### 选项 2：内网穿透（快速测试，临时方案）

#### 2.1 使用 ngrok（最简单）

**安装 ngrok：**
```bash
# macOS
brew install ngrok

# 或下载：https://ngrok.com/download
```

**启动后端：**
```bash
cd apps/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**创建 ngrok 隧道：**
```bash
# 免费版（每次重启会变URL）
ngrok http 8000

# 或使用固定域名（需要付费）
ngrok http 8000 --domain=your-fixed-domain.ngrok.io
```

**启动前端：**
```bash
cd apps/frontend
npm run dev
```

**创建前端隧道：**
```bash
# 新终端窗口
ngrok http 3000
```

**更新配置：**
- 将 ngrok 提供的 HTTPS URL 添加到后端 CORS
- 在 iPhone 上访问前端 ngrok URL

#### 2.2 使用 Cloudflare Tunnel（免费，更稳定）

```bash
# 安装 cloudflared
brew install cloudflared

# 创建隧道
cloudflared tunnel create home-inspection

# 启动隧道（后端）
cloudflared tunnel --url http://localhost:8000

# 启动隧道（前端）
cloudflared tunnel --url http://localhost:3000
```

### 选项 3：自建服务器（完全控制）

#### 3.1 使用 VPS（如 DigitalOcean）

**服务器要求：**
- Ubuntu 20.04+
- 至少 1GB RAM
- 公网 IP 地址

**部署步骤：**

1. **安装依赖：**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Python
sudo apt install -y python3 python3-pip python3-venv

# 安装 Nginx（反向代理）
sudo apt install -y nginx

# 安装 Certbot（SSL 证书）
sudo apt install -y certbot python3-certbot-nginx
```

2. **部署后端：**
```bash
cd /opt
sudo git clone your-repo-url home-inspection
cd home-inspection/apps/backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 创建 systemd 服务
sudo nano /etc/systemd/system/home-inspection-backend.service
```

**服务文件内容：**
```ini
[Unit]
Description=Home Inspection Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/home-inspection/apps/backend
Environment="PATH=/opt/home-inspection/apps/backend/venv/bin"
ExecStart=/opt/home-inspection/apps/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable home-inspection-backend
sudo systemctl start home-inspection-backend
```

3. **部署前端：**
```bash
cd /opt/home-inspection/apps/frontend
npm install
npm run build

# 复制到 Nginx 目录
sudo cp -r dist/* /var/www/home-inspection/
```

4. **配置 Nginx：**
```bash
sudo nano /etc/nginx/sites-available/home-inspection
```

**Nginx 配置：**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        root /var/www/home-inspection;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/home-inspection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com
```

## 快速测试方案（推荐先用这个）

### 使用 ngrok 快速测试

1. **启动后端：**
```bash
cd apps/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

2. **新终端，启动 ngrok：**
```bash
ngrok http 8000
```

3. **复制 ngrok 提供的 HTTPS URL**（例如：`https://abc123.ngrok.io`）

4. **更新后端 CORS：**
```bash
# 编辑 apps/backend/main.py
# 在 CORS_ORIGINS 中添加你的 ngrok URL
```

5. **启动前端：**
```bash
cd apps/frontend
# 创建 .env.local
echo "VITE_API_URL=https://abc123.ngrok.io" > .env.local
npm run dev
```

6. **新终端，为前端创建 ngrok：**
```bash
ngrok http 3000
```

7. **在 iPhone 上访问前端 ngrok URL**

## 注意事项

### HTTPS 要求
- iPhone 相机功能需要 HTTPS
- ngrok 自动提供 HTTPS
- 云服务通常也提供 HTTPS

### 环境变量
部署时需要设置：
- `OPENAI_API_KEY` - OpenAI API 密钥
- `CORS_ORIGINS` - 允许的前端域名
- `VITE_API_URL` - 前端需要知道后端地址

### 数据库
- 当前使用 SQLite（本地文件）
- 生产环境建议使用 PostgreSQL 或 MySQL
- 云服务通常提供托管数据库

## 推荐方案

**快速测试：** ngrok（5分钟设置）
**长期使用：** Vercel（前端）+ Railway（后端）（免费套餐可用）
**完全控制：** 自建 VPS + Nginx + Let's Encrypt SSL

## 下一步

1. 选择部署方案
2. 按照对应方案部署
3. 更新 iPhone 上的访问地址
4. 测试在外网使用移动数据访问





