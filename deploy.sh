#!/bin/bash

# Home Inspection System Deployment Script
# This script helps deploy the system locally or to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main menu
show_menu() {
    echo ""
    echo "=========================================="
    echo "  Home Inspection System Deployment"
    echo "=========================================="
    echo ""
    echo "1. Local Development (Manual)"
    echo "2. Local Docker Deployment"
    echo "3. Production Build (Frontend)"
    echo "4. Check System Requirements"
    echo "5. Setup Environment Variables"
    echo "6. Exit"
    echo ""
    read -p "Select an option (1-6): " choice
}

# Check system requirements
check_requirements() {
    print_info "Checking system requirements..."
    
    local missing=0
    
    # Check Python
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        print_info "Python: $PYTHON_VERSION ✓"
    else
        print_error "Python 3.11+ is required but not installed"
        missing=1
    fi
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_info "Node.js: $NODE_VERSION ✓"
    else
        print_error "Node.js 18+ is required but not installed"
        missing=1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_info "npm: $NPM_VERSION ✓"
    else
        print_error "npm is required but not installed"
        missing=1
    fi
    
    # Check Docker (optional)
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_info "Docker: $DOCKER_VERSION ✓"
    else
        print_warn "Docker is not installed (optional for local deployment)"
    fi
    
    # Check Docker Compose (optional)
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        print_info "Docker Compose: ✓"
    else
        print_warn "Docker Compose is not installed (optional for local deployment)"
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "Some requirements are missing. Please install them first."
        return 1
    else
        print_info "All required dependencies are installed!"
        return 0
    fi
}

# Setup environment variables
setup_env() {
    print_info "Setting up environment variables..."
    
    # Backend .env
    if [ ! -f "apps/backend/.env" ]; then
        print_info "Creating backend .env file..."
        cat > apps/backend/.env << EOF
# Database
DB_URL=sqlite:///./data/home_inspection.db

# API Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=true

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,https://localhost:3000,https://10.0.0.33:3000,http://10.0.0.33:3000

# OpenAI (Required for AI features)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_VISION_MODEL=gpt-4o-mini
REALTIME_MODEL=gpt-4

# Qdrant (Optional, for RAG system)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
EOF
        print_warn "Please edit apps/backend/.env and add your OPENAI_API_KEY"
    else
        print_info "Backend .env already exists"
    fi
    
    # Frontend .env.local
    if [ ! -f "apps/frontend/.env.local" ]; then
        print_info "Creating frontend .env.local file..."
        cat > apps/frontend/.env.local << EOF
# Backend API URL
VITE_API_URL=http://localhost:8000

# WebSocket URL
VITE_WS_URL=ws://localhost:8000
EOF
        print_info "Frontend .env.local created"
    else
        print_info "Frontend .env.local already exists"
    fi
}

# Local development deployment
deploy_local() {
    print_info "Starting local development deployment..."
    
    # Setup environment
    setup_env
    
    # Check if .env has API key
    if grep -q "your_openai_api_key_here" apps/backend/.env 2>/dev/null; then
        print_warn "Please set OPENAI_API_KEY in apps/backend/.env before starting"
        read -p "Continue anyway? (y/n): " continue_anyway
        if [ "$continue_anyway" != "y" ]; then
            return 1
        fi
    fi
    
    # Start backend
    print_info "Starting backend server..."
    cd apps/backend
    
    # Install Python dependencies
    if [ ! -d "venv" ]; then
        print_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    print_info "Installing Python dependencies..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    
    # Create data directory
    mkdir -p data
    
    # Start backend in background
    print_info "Starting backend on http://localhost:8000"
    print_info "API docs available at http://localhost:8000/docs"
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo $BACKEND_PID > /tmp/home_inspection_backend.pid
    
    cd ../..
    
    # Wait a bit for backend to start
    sleep 3
    
    # Start frontend
    print_info "Starting frontend server..."
    cd apps/frontend
    
    # Install Node dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node.js dependencies..."
        npm install
    fi
    
    # Start frontend
    print_info "Starting frontend on http://localhost:3000"
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /tmp/home_inspection_frontend.pid
    
    cd ../..
    
    print_info ""
    print_info "=========================================="
    print_info "  Deployment Complete!"
    print_info "=========================================="
    print_info "Backend:  http://localhost:8000"
    print_info "Frontend: http://localhost:3000"
    print_info "API Docs: http://localhost:8000/docs"
    print_info ""
    print_info "To stop services:"
    print_info "  kill \$(cat /tmp/home_inspection_backend.pid)"
    print_info "  kill \$(cat /tmp/home_inspection_frontend.pid)"
    print_info ""
}

# Docker deployment
deploy_docker() {
    print_info "Starting Docker deployment..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        return 1
    fi
    
    if ! docker compose version >/dev/null 2>&1 && ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        return 1
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "infra/docker/docker-compose.yml" ]; then
        print_error "docker-compose.yml not found at infra/docker/docker-compose.yml"
        return 1
    fi
    
    # Create .env files if needed
    setup_env
    
    # Build and start containers
    print_info "Building and starting Docker containers..."
    cd infra/docker
    
    if docker compose version >/dev/null 2>&1; then
        docker compose up -d --build
    else
        docker-compose up -d --build
    fi
    
    cd ../..
    
    print_info ""
    print_info "=========================================="
    print_info "  Docker Deployment Complete!"
    print_info "=========================================="
    print_info "Waiting for services to start..."
    sleep 5
    
    print_info ""
    print_info "Services:"
    print_info "  Backend:  http://localhost:8000"
    print_info "  Frontend: http://localhost:3000"
    print_info "  API Docs: http://localhost:8000/docs"
    print_info ""
    print_info "To view logs:"
    print_info "  cd infra/docker && docker compose logs -f"
    print_info ""
    print_info "To stop services:"
    print_info "  cd infra/docker && docker compose down"
    print_info ""
}

# Production build
build_production() {
    print_info "Building production frontend..."
    
    cd apps/frontend
    
    # Check for production .env
    if [ ! -f ".env.production" ]; then
        print_warn "Creating .env.production file..."
        read -p "Enter backend API URL (e.g., https://api.example.com): " api_url
        cat > .env.production << EOF
VITE_API_URL=${api_url:-http://localhost:8000}
VITE_WS_URL=${api_url/https/ws/ws/ws}
EOF
    fi
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi
    
    # Build
    print_info "Building production bundle..."
    npm run build
    
    print_info ""
    print_info "=========================================="
    print_info "  Production Build Complete!"
    print_info "=========================================="
    print_info "Build output: apps/frontend/dist"
    print_info ""
    print_info "To deploy:"
    print_info "  1. Copy dist/ to your web server"
    print_info "  2. Configure Nginx/Apache to serve the files"
    print_info "  3. Set up SSL certificate (required for iPhone camera)"
    print_info ""
    
    cd ../..
}

# Main execution
main() {
    while true; do
        show_menu
        
        case $choice in
            1)
                deploy_local
                ;;
            2)
                deploy_docker
                ;;
            3)
                build_production
                ;;
            4)
                check_requirements
                ;;
            5)
                setup_env
                ;;
            6)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-6."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main



