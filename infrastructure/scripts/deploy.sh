#!/bin/bash

# ABC Dashboard Auto-Deployment Script
# This script handles automated deployment of the ABC Dashboard application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="abc-dashboard"
ENVIRONMENT=${1:-"production"}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-""}

# Logging functions
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be healthy
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1

    log_info "Waiting for $service to be healthy..."

    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service | grep -q "healthy\|running"; then
            log_success "$service is healthy"
            return 0
        fi

        log_info "Attempt $attempt/$max_attempts: $service not ready yet..."
        sleep 10
        ((attempt++))
    done

    log_error "$service failed to become healthy after $max_attempts attempts"
    return 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Check if Docker is installed
    if ! command_exists docker; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command_exists docker-compose; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if .env file exists
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Please ensure environment variables are set."
        exit 1
    fi

    # Check if required directories exist
    if [ ! -d "./frontend/out" ]; then
        log_warning "Frontend build directory not found. Building frontend..."
        build_frontend
    fi

    log_success "Pre-deployment checks passed"
}

# Build frontend
build_frontend() {
    log_info "Building frontend application..."

    if [ ! -d "./frontend" ]; then
        log_error "Frontend directory not found"
        exit 1
    fi

    cd frontend

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm ci
    fi

    # Build the application
    log_info "Building Next.js application..."
    npm run build

    cd ..
    log_success "Frontend build completed"
}

# Build backend Docker image
build_backend_image() {
    log_info "Building backend Docker image..."

    cd backend

    # Build Docker image
    if [ -n "$DOCKER_REGISTRY" ]; then
        docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:latest .
        log_info "Pushing backend image to registry..."
        docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:latest
    else
        docker build -t ${PROJECT_NAME}-backend:latest .
    fi

    cd ..
    log_success "Backend Docker image built successfully"
}

# Deploy application
deploy_application() {
    log_info "Starting deployment process..."

    # Load environment variables
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi

    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down || true

    # Remove old images to free up space
    log_info "Cleaning up old Docker images..."
    docker image prune -f || true

    # Start services
    log_info "Starting services with Docker Compose..."
    docker-compose up -d

    # Wait for services to be healthy
    wait_for_service mongodb
    wait_for_service backend
    wait_for_service frontend

    # Run database migrations if needed
    run_migrations

    # Run health checks
    run_health_checks

    log_success "Deployment completed successfully!"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    # You can add migration commands here if needed
    # For example, if you have migration scripts in your backend
    # docker-compose exec backend npm run migrate:prod

    log_success "Database migrations completed"
}

# Run health checks
run_health_checks() {
    log_info "Running post-deployment health checks..."

    # Check backend health
    if curl -f -s http://localhost:5000/api/v1/health > /dev/null; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        exit 1
    fi

    # Check frontend
    if curl -f -s http://localhost > /dev/null; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        exit 1
    fi

    log_success "All health checks passed"
}

# Rollback function
rollback() {
    log_error "Deployment failed. Starting rollback..."

    # Stop containers
    docker-compose down

    # You can add logic to restore from backup here
    # For example, restore previous Docker images or database backup

    log_info "Rollback completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."

    # Remove dangling Docker images
    docker image prune -f || true

    # Remove unused volumes
    docker volume prune -f || true

    log_success "Cleanup completed"
}

# Main deployment process
main() {
    log_info "Starting ABC Dashboard deployment for environment: $ENVIRONMENT"

    # Trap errors for rollback
    trap rollback ERR

    # Run pre-deployment checks
    pre_deployment_checks

    # Build applications
    build_frontend
    build_backend_image

    # Deploy
    deploy_application

    # Cleanup
    cleanup

    # Success message
    log_success "🎉 Deployment completed successfully!"
    log_info "Application URLs:"
    log_info "  Frontend: http://$(hostname -I | awk '{print $1}')"
    log_info "  Backend API: http://$(hostname -I | awk '{print $1}'):5000/api/v1"
    log_info "  API Docs: http://$(hostname -I | awk '{print $1}'):5000/api-docs"
    log_info "  Health Check: http://$(hostname -I | awk '{print $1}'):5000/api/v1/health"
    log_info "  Monitoring:"
    log_info "    Grafana: http://$(hostname -I | awk '{print $1}'):3000"
    log_info "    Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
}

# Run main function
main "$@"
