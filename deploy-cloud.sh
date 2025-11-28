#!/bin/bash

# Home Inspection System - Cloud Deployment Script
# This script helps deploy to Railway (backend) and Vercel (frontend)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "檢查前置條件..."
    
    local missing=0
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安裝"
        missing=1
    else
        print_info "Node.js: $(node --version) ✓"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安裝"
        missing=1
    else
        print_info "npm: $(npm --version) ✓"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git 未安裝"
        missing=1
    else
        print_info "Git: $(git --version) ✓"
    fi
    
    # Check Railway CLI
    if ! command -v railway &> /dev/null; then
        print_warn "Railway CLI 未安裝，將嘗試安裝..."
        npm i -g @railway/cli || {
            print_error "無法安裝 Railway CLI"
            missing=1
        }
    else
        print_info "Railway CLI: ✓"
    fi
    
    # Check Vercel CLI
    if ! command -v vercel &> /dev/null; then
        print_warn "Vercel CLI 未安裝，將嘗試安裝..."
        npm i -g vercel || {
            print_error "無法安裝 Vercel CLI"
            missing=1
        }
    else
        print_info "Vercel CLI: ✓"
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "缺少必要的前置條件，請先安裝"
        return 1
    fi
    
    print_info "所有前置條件已滿足！"
    return 0
}

# Deploy backend to Railway
deploy_backend() {
    print_step "開始部署後端到 Railway..."
    
    cd apps/backend
    
    print_info "請確保您已登錄 Railway："
    railway login
    
    print_info "初始化 Railway 項目..."
    railway init
    
    print_warn "請在 Railway Dashboard 中設置以下環境變量："
    print_warn "  - OPENAI_API_KEY=your_key"
    print_warn "  - OPENAI_VISION_MODEL=gpt-4o-mini"
    print_warn "  - REALTIME_MODEL=gpt-4"
    print_warn "  - CORS_ORIGINS=(稍後添加前端 URL)"
    
    read -p "環境變量設置完成後按 Enter 繼續..."
    
    print_info "部署到 Railway..."
    railway up
    
    print_info "獲取後端 URL..."
    BACKEND_URL=$(railway domain | head -1)
    
    if [ -z "$BACKEND_URL" ]; then
        print_error "無法獲取後端 URL，請手動在 Railway Dashboard 查看"
        print_warn "請記錄後端 URL，稍後需要設置到前端環境變量"
        read -p "請輸入後端 URL: " BACKEND_URL
    else
        print_info "後端 URL: $BACKEND_URL"
    fi
    
    cd ../..
    
    echo "$BACKEND_URL" > /tmp/backend_url.txt
    print_info "後端 URL 已保存到 /tmp/backend_url.txt"
}

# Deploy frontend to Vercel
deploy_frontend() {
    print_step "開始部署前端到 Vercel..."
    
    if [ ! -f "/tmp/backend_url.txt" ]; then
        print_error "找不到後端 URL，請先部署後端"
        return 1
    fi
    
    BACKEND_URL=$(cat /tmp/backend_url.txt)
    
    cd apps/frontend
    
    print_info "創建生產環境配置..."
    cat > .env.production << EOF
VITE_API_URL=$BACKEND_URL
VITE_WS_URL=${BACKEND_URL/https/ws/ws/ws}
EOF
    
    print_info "構建前端..."
    npm run build
    
    print_info "請確保您已登錄 Vercel："
    vercel login
    
    print_info "部署到 Vercel..."
    vercel --prod
    
    print_info "設置環境變量..."
    vercel env add VITE_API_URL production << EOF
$BACKEND_URL
EOF
    
    vercel env add VITE_WS_URL production << EOF
${BACKEND_URL/https/ws/ws/ws}
EOF
    
    print_info "重新部署以應用環境變量..."
    vercel --prod
    
    FRONTEND_URL=$(vercel ls | grep -oP 'https://[^\s]+' | head -1)
    
    if [ -z "$FRONTEND_URL" ]; then
        print_warn "請在 Vercel Dashboard 查看前端 URL"
        read -p "請輸入前端 URL: " FRONTEND_URL
    else
        print_info "前端 URL: $FRONTEND_URL"
    fi
    
    cd ../..
    
    print_info "更新後端 CORS 設置..."
    cd apps/backend
    railway variables set CORS_ORIGINS=$FRONTEND_URL
    cd ../..
    
    print_info "✅ 部署完成！"
    print_info "後端 URL: $BACKEND_URL"
    print_info "前端 URL: $FRONTEND_URL"
}

# Main menu
main() {
    echo ""
    echo "=========================================="
    echo "  Home Inspection - 雲端部署"
    echo "=========================================="
    echo ""
    echo "1. 檢查前置條件"
    echo "2. 部署後端到 Railway"
    echo "3. 部署前端到 Vercel"
    echo "4. 完整部署（後端 + 前端）"
    echo "5. 退出"
    echo ""
    read -p "選擇選項 (1-5): " choice
    
    case $choice in
        1)
            check_prerequisites
            ;;
        2)
            check_prerequisites && deploy_backend
            ;;
        3)
            check_prerequisites && deploy_frontend
            ;;
        4)
            check_prerequisites && deploy_backend && deploy_frontend
            ;;
        5)
            print_info "退出..."
            exit 0
            ;;
        *)
            print_error "無效選項"
            ;;
    esac
}

# Run main function
main

