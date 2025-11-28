# 🚀 Home Inspection System - Complete Deployment Guide

This guide covers all deployment options for the Home Inspection System.

## 📋 Table of Contents

1. [Quick Start (Local Development)](#quick-start-local-development)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Cloud Deployment Options](#cloud-deployment-options)
5. [Environment Configuration](#environment-configuration)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start (Local Development)

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and **npm 9+**
- **OpenAI API Key** (for AI features)

### Automated Setup

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment script
./deploy.sh

# Select option 1: Local Development
```

### Manual Setup

#### 1. Backend Setup

```bash
cd apps/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
DB_URL=sqlite:///./data/home_inspection.db
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_VISION_MODEL=gpt-4o-mini
REALTIME_MODEL=gpt-4
EOF

# Create data directory
mkdir -p data

# Start backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: **http://localhost:8000**
API Documentation: **http://localhost:8000/docs**

#### 2. Frontend Setup

```bash
cd apps/frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
EOF

# Start development server
npm run dev
```

Frontend will be available at: **http://localhost:3000**

---

## Docker Deployment

### Prerequisites

- **Docker** 20.10+
- **Docker Compose** 2.0+

### Quick Start

```bash
# Using deployment script
./deploy.sh
# Select option 2: Local Docker Deployment

# Or manually
cd infra/docker
docker compose up -d --build
```

### Services

After deployment, the following services will be available:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Qdrant**: http://localhost:6333
- **Redis**: localhost:6379

### Docker Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild and restart
docker compose up -d --build

# Remove all containers and volumes
docker compose down -v
```

---

## Production Deployment

### Option 1: VPS Deployment (Recommended for Full Control)

#### Server Requirements

- Ubuntu 20.04+ or Debian 11+
- 2GB+ RAM
- 20GB+ storage
- Public IP address
- Domain name (optional but recommended)

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### Step 2: Deploy Backend

```bash
# Clone repository
cd /opt
sudo git clone <your-repo-url> home-inspection
cd home-inspection/apps/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
sudo nano .env
# Add your configuration (see Environment Configuration section)

# Create systemd service
sudo nano /etc/systemd/system/home-inspection-backend.service
```

**Service file content:**

```ini
[Unit]
Description=Home Inspection Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/home-inspection/apps/backend
Environment="PATH=/opt/home-inspection/apps/backend/venv/bin"
ExecStart=/opt/home-inspection/apps/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable home-inspection-backend
sudo systemctl start home-inspection-backend
sudo systemctl status home-inspection-backend
```

#### Step 3: Deploy Frontend

```bash
cd /opt/home-inspection/apps/frontend

# Install dependencies
npm install

# Create production .env
cat > .env.production << EOF
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
EOF

# Build for production
npm run build

# Copy to web directory
sudo mkdir -p /var/www/home-inspection
sudo cp -r dist/* /var/www/home-inspection/
sudo chown -R www-data:www-data /var/www/home-inspection
```

#### Step 4: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/home-inspection
```

**Nginx configuration:**

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    root /var/www/home-inspection;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /api/ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/home-inspection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
```

---

## Cloud Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel

```bash
cd apps/frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_API_URL production
# Enter: https://your-backend.railway.app
```

#### Backend on Railway

```bash
cd apps/backend

# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables
railway variables set OPENAI_API_KEY=your_key
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app
railway variables set DB_URL=postgresql://...
```

### Option 2: Render (Full Stack)

1. **Connect GitHub repository** to Render
2. **Create Web Service** for backend:
   - Build Command: `cd apps/backend && pip install -r requirements.txt`
   - Start Command: `cd apps/backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
3. **Create Static Site** for frontend:
   - Build Command: `cd apps/frontend && npm install && npm run build`
   - Publish Directory: `apps/frontend/dist`

### Option 3: AWS / Google Cloud / Azure

See cloud provider-specific documentation for containerized deployment.

---

## Environment Configuration

### Backend Environment Variables

Create `apps/backend/.env`:

```env
# Database
DB_URL=sqlite:///./data/home_inspection.db
# Or PostgreSQL: postgresql://user:password@localhost:5432/home_inspection

# API Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=false

# CORS (comma-separated list of allowed origins)
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# OpenAI API (Required)
OPENAI_API_KEY=sk-...
OPENAI_VISION_MODEL=gpt-4o-mini  # or gpt-4o for higher accuracy
REALTIME_MODEL=gpt-4

# Qdrant (Optional, for RAG system)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Redis (Optional, for caching)
REDIS_URL=redis://localhost:6379
```

### Frontend Environment Variables

Create `apps/frontend/.env.local` (development) or `.env.production` (production):

```env
# Backend API URL
VITE_API_URL=http://localhost:8000

# WebSocket URL
VITE_WS_URL=ws://localhost:8000
```

---

## Troubleshooting

### Backend Issues

**Problem: Port 8000 already in use**
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process or change port in .env
```

**Problem: Database connection error**
```bash
# Check database file permissions
ls -la apps/backend/data/
# Ensure directory exists and is writable
mkdir -p apps/backend/data
```

**Problem: OpenAI API errors**
- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Verify network connectivity

### Frontend Issues

**Problem: Cannot connect to backend**
- Check `VITE_API_URL` in `.env.local`
- Verify backend is running
- Check CORS settings in backend

**Problem: iPhone camera not working**
- Requires HTTPS (not HTTP)
- Use ngrok for testing: `ngrok http 3000`
- Or deploy with SSL certificate

### Docker Issues

**Problem: Containers won't start**
```bash
# Check logs
docker compose logs

# Rebuild containers
docker compose down
docker compose up -d --build
```

**Problem: Port conflicts**
- Change ports in `docker-compose.yml`
- Or stop conflicting services

---

## Security Checklist

- [ ] Set `DEBUG=false` in production
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Keep API keys secure (never commit to git)
- [ ] Use environment variables for secrets
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor logs for suspicious activity

---

## Next Steps

1. **Set up monitoring** (e.g., Sentry, DataDog)
2. **Configure backups** for database
3. **Set up CI/CD** pipeline
4. **Enable logging** aggregation
5. **Configure rate limiting**
6. **Set up health checks**

---

## Support

For issues and questions:
- Check logs: `docker compose logs` or systemd logs
- Review test results
- Check GitHub issues
- Consult documentation in component READMEs

---

**Happy Deploying! 🚀**



