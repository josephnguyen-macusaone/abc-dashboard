#!/bin/bash

# =============================================================================
# ABC Dashboard - OpenLiteSpeed Deployment Script
# =============================================================================
# This script automates the complete deployment of ABC Dashboard to OpenLiteSpeed
# Features:
# - Builds frontend and backend
# - Deploys with Docker Compose
# - Configures OpenLiteSpeed virtual host
# - Runs health checks
# =============================================================================

set -e  # Exit on any error

# =============================================================================
# Configuration
# =============================================================================

PROJECT_NAME="abc-dashboard"
DOMAIN_NAME=${DOMAIN_NAME:-"localhost"}
SERVER_IP=${SERVER_IP:-"127.0.0.1"}
OPENLITESPEED_CONFIG_DIR="/usr/local/lsws/conf"
VIRTUAL_HOST_CONFIG="$OPENLITESPEED_CONFIG_DIR/vhosts/$PROJECT_NAME.conf"
DEPLOYMENT_DIR="/var/www/$PROJECT_NAME"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Deploy ABC Dashboard to OpenLiteSpeed"
            echo ""
            echo "Options:"
            echo "  --help, -h               Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Helper Functions
# =============================================================================

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if running as root or sudo
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root - this is not recommended for production"
    fi

    # Check Node.js
    if ! command_exists node; then
        log_error "Node.js is not installed. Installing..."
        install_nodejs
    else
        log_success "Node.js found: $(node --version)"
    fi

    # Check npm
    if ! command_exists npm; then
        log_error "npm is not installed"
        exit 1
    else
        log_success "npm found: $(npm --version)"
    fi

    # Check Docker
    if ! command_exists docker; then
        log_error "Docker is not installed. Installing..."
        install_docker
    else
        log_success "Docker found: $(docker --version)"
    fi

    # Check Docker Compose
    if ! command_exists docker-compose; then
        log_error "Docker Compose is not installed. Installing..."
        install_docker_compose
    else
        log_success "Docker Compose found: $(docker-compose --version)"
    fi

    # Check OpenLiteSpeed
    if ! command_exists lswsctrl && [ ! -f "/usr/local/lsws/bin/lswsctrl" ]; then
        log_error "OpenLiteSpeed is not installed. Please install OpenLiteSpeed first."
        exit 1
    else
        log_success "OpenLiteSpeed found"
        # Add OpenLiteSpeed bin to PATH if not already there
        if [[ ":$PATH:" != *":/usr/local/lsws/bin:"* ]]; then
            export PATH="$PATH:/usr/local/lsws/bin"
        fi
    fi

    log_success "Prerequisites check completed"
}

install_nodejs() {
    log_info "Installing Node.js 20 (LTS)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    log_success "Node.js installed: $(node --version)"
}

install_docker() {
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
    usermod -aG docker $USER
    log_success "Docker installed"
}

install_docker_compose() {
    log_info "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installed"
}

create_deployment_directory() {
    log_info "Setting up deployment directory: $DEPLOYMENT_DIR"

    # Check if directory exists and has content
    if [ -d "$DEPLOYMENT_DIR" ] && [ "$(ls -A $DEPLOYMENT_DIR 2>/dev/null)" ]; then
        log_warning "Deployment directory already exists with content - files will be overwritten"
    fi

    mkdir -p "$DEPLOYMENT_DIR"
    log_success "Deployment directory ready"
}

copy_project_files() {
    log_info "Copying project files..."

    # Get the directory where this script is located
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

    # Change to deployment directory
    cd "$DEPLOYMENT_DIR"

    # Copy necessary files
    cp "$PROJECT_ROOT/docker-compose.yml" .
    cp "$PROJECT_ROOT/.env" .
    cp -r "$PROJECT_ROOT/backend" .
    cp -r "$PROJECT_ROOT/frontend" .

    log_success "Project files copied"
}

build_frontend() {
    log_info "Building frontend..."

    cd frontend

    # Install dependencies and ensure package-lock.json exists
    log_info "Installing frontend dependencies..."
    if [ -f package-lock.json ]; then
        npm ci
    else
        log_info "No package-lock.json found, running npm install to generate it..."
        npm install
    fi

    # Build the application (with static export due to output: 'export' in next.config.ts)
    log_info "Building Next.js application with static export..."
    npm run build

    cd ..
    log_success "Frontend built successfully"
}

build_backend_image() {
    log_info "Building backend Docker image..."
    docker build -t $PROJECT_NAME-backend:latest ./backend
    log_success "Backend image built"
}

build_frontend_image() {
    log_info "Frontend served directly by OpenLiteSpeed - no Docker image needed"
    log_success "Frontend will be served statically by OpenLiteSpeed"
}

configure_openlitespeed() {
    log_info "Configuring OpenLiteSpeed virtual host..."

    # Create virtual host directory structure
    mkdir -p "/usr/local/lsws/$PROJECT_NAME/html"
    mkdir -p "/usr/local/lsws/$PROJECT_NAME/logs"
    mkdir -p "/usr/local/lsws/$PROJECT_NAME/conf"

    # Create virtual host configuration file
    cat > "$VIRTUAL_HOST_CONFIG" << EOF
docRoot                   \$VH_ROOT/html
vhDomain                  $DOMAIN_NAME
vhAliases                 www.$DOMAIN_NAME
adminEmails               admin@$DOMAIN_NAME

enableGzip                1
enableBr                  1

index  {
  useServer               0
  indexFiles              index.html, index.htm
  autoIndex               0
}

# Disable directory browsing and redirects for SPA
dir  {
  autoIndex               0
  dirIndex                0
}

errorpage 404 {
  url                     /index.html
}

expires  {
  enableExpires           1
  expiresByType           image/*=A604800,text/css=A604800,application/javascript=A604800,application/x-javascript=A604800
}

accessControl  {
  allow                   *
  deny
}

realm $PROJECT_NAME {
  userDB  {
    location               conf/vhosts/\$VH_NAME/htpasswd
  }
}

context /api/ {
  location                http://localhost:5000/api/
  allowBrowse             1
  addDefaultCharset       off

  rewrite  {
    enable                  1
    rules                   ^(.*)$ \$1 break
  }
}

context /api-docs/ {
  location                http://localhost:5000/api-docs/
  allowBrowse             1
  addDefaultCharset       off
}

# Handle client-side routing for Next.js static export
# Rewrite all non-API, non-static routes to index.html for SPA routing
rewrite  {
  enable                  1
  rules                   ^/(?!api/|api-docs/|_next/|favicon\.ico|.*\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$).* /index.html [L]
}

accessLog  {
  useServer               1
  logFormat               "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\""
  logHeaders              5
  rollingSize             10M
  keepDays                30
  compressArchive         1
}
EOF

    # Add virtual host to main server configuration if not already present
    if ! grep -q "$PROJECT_NAME" "$OPENLITESPEED_CONFIG_DIR/httpd_config.conf"; then
        # Find where to insert the virtual host configuration
        sed -i "/^vhTemplate centralConfigLog/a \\
\\
virtualhost $PROJECT_NAME {\\
    vhRoot                  /usr/local/lsws/$PROJECT_NAME/\\
    configFile              conf/vhosts/$PROJECT_NAME.conf\\
    allowSymbolLink         1\\
    enableScript            1\\
    restrained              1\\
}" "$OPENLITESPEED_CONFIG_DIR/httpd_config.conf"

        # Add to listeners
        sed -i "/map                      Example */a map                      $PROJECT_NAME $DOMAIN_NAME" "$OPENLITESPEED_CONFIG_DIR/httpd_config.conf"
    fi

    log_success "OpenLiteSpeed virtual host configured"
}

stop_existing_services() {
    log_info "Checking for existing Docker services..."

    # Check if docker-compose services are running
    if docker-compose ps -q | grep -q . 2>/dev/null; then
        log_warning "Existing Docker services found - stopping them before deployment"
        docker-compose down
        log_success "Existing services stopped"
    else
        log_info "No existing Docker services found"
    fi
}

start_services() {
    log_info "Starting Docker services..."
    docker-compose up -d
    log_success "Services started"
}

wait_for_services() {
    log_info "Waiting for services to be healthy..."

    # Note: MongoDB Atlas and Redis are external services, no local checks needed

    # Wait for backend API
    log_info "Waiting for backend API..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:5000/api/v1/health >/dev/null 2>&1; then
            log_success "Backend API is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        log_error "Backend API failed to start"
        exit 1
    fi

    # Wait for frontend
    log_info "Waiting for frontend..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000/ >/dev/null 2>&1; then
            log_success "Frontend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        log_error "Frontend failed to start"
        exit 1
    fi

    log_success "All services are healthy"
}

copy_static_files() {
    log_info "Copying frontend static files to OpenLiteSpeed..."

    # Ensure the document root exists
    mkdir -p "/usr/local/lsws/$PROJECT_NAME/html/"

    # Copy built files to OpenLiteSpeed document root
    if [ -d "frontend/out" ]; then
        cp -r frontend/out/* "/usr/local/lsws/$PROJECT_NAME/html/"
        log_info "Frontend static files copied from frontend/out/"
    else
        log_error "Frontend build output not found in frontend/out/"
        log_error "Make sure to build the frontend first with: cd frontend && npm run build"
        exit 1
    fi

    # Set proper permissions
    chown -R lsadm:lsadm "/usr/local/lsws/$PROJECT_NAME/"

    log_success "Static files copied to OpenLiteSpeed document root"
}

restart_openlitespeed() {
    log_info "Restarting OpenLiteSpeed..."
    systemctl restart lsws
    sleep 5
    log_success "OpenLiteSpeed restarted"
}

run_final_checks() {
    log_info "Running final deployment checks..."

    # Check if OpenLiteSpeed is running
    if systemctl is-active --quiet lsws; then
        log_success "OpenLiteSpeed is running"
    else
        log_error "OpenLiteSpeed is not running"
        exit 1
    fi

    # Check API health
    if curl -f http://localhost:5000/api/v1/health >/dev/null 2>&1; then
        log_success "Backend API health check passed"
    else
        log_error "Backend API health check failed"
        exit 1
    fi

    # Check frontend
    if curl -f http://localhost >/dev/null 2>&1; then
        log_success "Frontend is accessible"
    else
        log_error "Frontend is not accessible"
        exit 1
    fi

    log_success "All checks passed!"
}

show_deployment_info() {
    echo ""
    echo "================================================================================"
    echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo "================================================================================"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:    http://$DOMAIN_NAME"
    echo "   API:         http://$DOMAIN_NAME/api/v1"
    echo "   API Docs:    http://$DOMAIN_NAME/api-docs"
    echo "   Health:      http://$DOMAIN_NAME/api/v1/health"
    echo ""
    echo "🚀 Services Status:"
    echo "   OpenLiteSpeed: ✅ Running (Static files + API proxy)"
    echo "   Backend API:   ✅ Running (Docker - Port 5000)"
    echo "   MongoDB:       ✅ Running (Docker - Port 27017)"
    echo "   Redis:         ✅ Running (Docker - Port 6379)"
    echo ""
    echo "📁 Key Locations:"
    echo "   Static Files:  /usr/local/lsws/$PROJECT_NAME/html/"
    echo "   OLS Config:    $VIRTUAL_HOST_CONFIG"
    echo "   Backend Logs:  docker-compose logs -f backend"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View all logs:        docker-compose logs -f"
    echo "   View backend logs:    docker-compose logs -f backend"
    echo "   Restart services:     docker-compose restart"
    echo "   Stop services:        docker-compose down"
    echo "   Restart OLS:          systemctl restart lsws"
    echo "   Check OLS status:     systemctl status lsws"
    echo ""
    echo "================================================================================"
}

# =============================================================================
# Main Deployment Process
# =============================================================================

main() {
    echo "================================================================================"
    echo "🚀 ABC Dashboard - OpenLiteSpeed Deployment"
    echo "================================================================================"
    echo ""

    # Run deployment steps
    check_prerequisites
    create_deployment_directory
    copy_project_files
    build_frontend
    build_backend_image
    configure_openlitespeed
    stop_existing_services
    start_services
    wait_for_services
    copy_static_files
    restart_openlitespeed
    run_final_checks
    show_deployment_info

    log_success "🎉 Deployment completed successfully!"
}

# =============================================================================
# Script Entry Point
# =============================================================================

# Run main function
main "$@"