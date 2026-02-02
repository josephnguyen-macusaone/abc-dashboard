#!/bin/bash

# =================================================================
# OPTIMIZED Docker Build Script for 1GB RAM Servers
# =================================================================
# Emergency survival mode for resource-constrained environments
# Key optimizations:
# - Sequential builds (no parallel, saves memory)
# - Memory monitoring and cleanup
# - Swap optimization
# - BuildKit cache persistence
# - Progress tracking to prevent connection timeouts

set -e  # Exit on error

echo "======================================"
echo "ABC License - Low-Memory Build Mode"
echo "======================================"
echo ""
echo "⚠️  OPTIMIZED FOR 1GB RAM SERVERS"
echo ""

# =================================================================
# MEMORY MANAGEMENT FUNCTIONS
# =================================================================

# Display current memory status
show_memory_status() {
    echo "📊 Memory Status:"
    free -h | grep -E "Mem|Swap"
    echo ""
}

# Clean system caches to free memory
cleanup_memory() {
    echo "🧹 Cleaning memory caches..."

    # Drop caches (requires root, will fail gracefully if not root)
    sync
    echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || echo "  ⚠ Cannot drop caches (non-root)"

    # Clean Docker build cache if it's too large
    local cache_size=$(docker system df --format '{{.BuildCache}}' | grep -oE '[0-9.]+' | head -1)
    if [ -n "$cache_size" ]; then
        # Keep only last 2GB of cache
        docker builder prune -af --keep-storage=2GB 2>/dev/null || true
    fi

    echo "✓ Memory cleanup complete"
    echo ""
}

# Monitor memory during build
check_memory_pressure() {
    local available=$(free -m | awk '/^Mem:/ {print $7}')
    local swap_used=$(free -m | awk '/^Swap:/ {print $3}')

    echo "💾 Available RAM: ${available}MB | Swap Used: ${swap_used}MB"

    # Warn if memory is critically low
    if [ "$available" -lt 100 ]; then
        echo "⚠️  WARNING: Low memory! Available: ${available}MB"
        echo "   Consider stopping other services temporarily"
    fi

    # Warn if swap is heavily used
    if [ "$swap_used" -gt 1000 ]; then
        echo "⚠️  WARNING: High swap usage! Swap: ${swap_used}MB"
        echo "   Build may be slow due to disk I/O"
    fi
}

# =================================================================
# SYSTEM OPTIMIZATIONS
# =================================================================

echo "🔧 Applying system optimizations..."

# Reduce swappiness for better performance (reduce swap thrashing)
current_swappiness=$(cat /proc/sys/vm/swappiness)
if [ "$current_swappiness" -gt 10 ]; then
    echo "  - Reducing swappiness from $current_swappiness to 10..."
    sysctl -w vm.swappiness=10 2>/dev/null || echo "    ⚠ Cannot set swappiness (non-root)"
fi

# Enable Docker BuildKit for better caching
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

# Memory optimizations
export BUILDKIT_STEP_LOG_MAX_SIZE=5242880  # 5MB (reduced from 10MB)
export BUILDKIT_STEP_LOG_MAX_SPEED=5000000  # 5MB/s

# Enable inline cache for better layer reuse
export BUILDKIT_INLINE_CACHE=1

# Disable parallel operations (save memory)
export BUILDKIT_MULTI_PLATFORM=0
export BUILDKIT_CONTEXT_KEEP_GIT_DIR=0

echo "✓ System optimizations applied"
echo ""

# =================================================================
# PRE-BUILD CHECKS
# =================================================================

show_memory_status

# Check .env file
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "  Please create .env file with required variables"
    exit 1
fi

echo "✓ Environment file found"
echo ""

# Parse command line arguments
BUILD_TYPE="${1:-all}"
NO_CACHE="${2}"

# Performance monitoring
START_TIME=$(date +%s)

# =================================================================
# MEMORY CLEANUP BEFORE BUILD
# =================================================================

echo "🧹 Pre-build cleanup..."
cleanup_memory
check_memory_pressure
echo ""

# =================================================================
# BUILD FUNCTIONS
# =================================================================

build_backend() {
    echo "=============================================="
    echo "🔧 Building Backend (1/2)"
    echo "=============================================="
    echo ""
    echo "📦 Backend optimizations:"
    echo "  - BuildKit cache mounts (npm)"
    echo "  - Sequential build (memory safe)"
    echo "  - Production dependencies only"
    echo ""

    check_memory_pressure

    if [ "$NO_CACHE" = "--no-cache" ]; then
        echo "🔄 Clean build (no cache)..."
        time docker compose build --no-cache backend
    else
        echo "⚡ Cached build with BuildKit..."
        time docker compose build backend
    fi

    echo ""
    echo "✅ Backend build complete!"
    docker images abc-dashboard-backend:latest --format "📦 Size: {{.Size}}"
    echo ""

    # Clean up after backend build
    cleanup_memory
}

build_frontend() {
    echo "=============================================="
    echo "🚀 Building Frontend (2/2)"
    echo "=============================================="
    echo ""
    echo "📦 Frontend optimizations:"
    echo "  - BuildKit cache mounts (npm)"
    echo "  - 1GB heap limit (low-memory mode)"
    echo "  - Standalone output (minimal size)"
    echo "  - No test dependencies"
    echo ""

    check_memory_pressure

    if [ "$NO_CACHE" = "--no-cache" ]; then
        echo "🔄 Clean build (no cache)..."
        time docker compose build --no-cache frontend
    else
        echo "⚡ Cached build with BuildKit..."
        time docker compose build frontend
    fi

    echo ""
    echo "✅ Frontend build complete!"
    docker images abc-dashboard-frontend:latest --format "📦 Size: {{.Size}}"
    echo ""

    # Clean up after frontend build
    cleanup_memory
}

# =================================================================
# BUILD EXECUTION
# =================================================================

case "$BUILD_TYPE" in
    frontend)
        build_frontend
        ;;
    backend)
        build_backend
        ;;
    all)
        echo "🚀 Building all services SEQUENTIALLY (memory optimized)"
        echo "   ⚠️  Note: Sequential builds are slower but safer on 1GB RAM"
        echo ""

        # Build backend first (smaller, faster)
        build_backend

        # Brief pause between builds
        echo "⏸️  Pausing 5 seconds before frontend build..."
        sleep 5

        # Build frontend
        build_frontend

        # Show final results
        echo ""
        echo "📊 Final Build Results:"
        docker images | grep abc-dashboard | while read line; do
            echo "   $line"
        done
        ;;
    *)
        echo "Usage: $0 [frontend|backend|all] [--no-cache]"
        echo ""
        echo "Examples:"
        echo "  $0                    # Build all services (sequential, cached)"
        echo "  $0 frontend           # Build frontend only"
        echo "  $0 all --no-cache     # Clean build all services"
        echo ""
        echo "⚠️  MEMORY OPTIMIZATION NOTES:"
        echo "  - Builds are SEQUENTIAL (not parallel) to save memory"
        echo "  - First build may take 15-20 minutes on 1GB RAM"
        echo "  - Cached builds should take 3-8 minutes"
        echo "  - BuildKit cache persists across builds"
        echo "  - Swap usage is normal but causes slowdown"
        echo ""
        echo "💡 TIPS FOR FASTER BUILDS:"
        echo "  - Stop other services: docker compose stop"
        echo "  - Clear cache if needed: docker builder prune"
        echo "  - Upgrade to 2GB+ RAM for 5x faster builds"
        exit 1
        ;;
esac

# =================================================================
# POST-BUILD SUMMARY
# =================================================================

# Calculate and display total build time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "======================================"
echo "⏱️  Total build time: ${MINUTES}m ${SECONDS}s"
echo "======================================"
echo ""

show_memory_status

# Post-build verification
echo "🔍 Post-build verification..."
echo ""

# Check if images were created
if docker images | grep -q abc-dashboard; then
    echo "✅ Docker images created successfully"
    echo ""
    echo "📦 Image sizes:"
    docker images abc-dashboard --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10
    echo ""
    echo "🚀 Ready to deploy!"
    echo ""
    echo "Quick start commands:"
    echo "  docker compose up -d              # Start all services"
    echo "  docker compose logs -f            # View logs"
    echo "  curl http://localhost:3000        # Test frontend"
    echo ""
    echo "Memory management:"
    echo "  docker stats                      # Monitor container resources"
    echo "  docker system df                  # Check disk usage"
    echo "  docker builder prune              # Clean build cache"
    echo ""
    echo "⚠️  LOW-MEMORY SERVER NOTES:"
    echo "  - Services limited to 512MB RAM each"
    echo "  - Monitor with: docker stats"
    echo "  - If containers crash, increase server RAM"
else
    echo "❌ ERROR: Build failed - no images created"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check memory: free -h"
    echo "  2. Check logs above for errors"
    echo "  3. Try: docker compose build --no-cache [service]"
    echo "  4. If OOM errors, upgrade server RAM"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ Build completed successfully!"
echo "======================================"
