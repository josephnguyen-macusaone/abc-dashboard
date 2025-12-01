#!/bin/bash

# Database Seeding Script for ABC Dashboard Development Environment
# This script seeds the MongoDB database with initial test data

set -e

echo "🌱 Starting database seeding process..."

# Check if the backend container is running
if ! docker ps --format "{{.Names}}" | grep -q "abc-dashboard-backend-dev"; then
    echo "❌ Backend container is not running. Please start the development environment first:"
    echo "   cd deploy/docker && docker-compose -f docker-compose.dev.yml up -d"
    exit 1
fi

# Check if backend is healthy
echo "⏳ Waiting for backend to be healthy..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker exec abc-dashboard-backend-dev curl -f http://localhost:5000/api/v1/health >/dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    fi

    echo "⏳ Backend not ready yet (attempt $attempt/$max_attempts)..."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Backend failed to become healthy within timeout"
    exit 1
fi

# Run the seeding
echo "🚀 Running database seed..."
docker exec abc-dashboard-backend-dev npm run seed

echo "✅ Database seeding completed successfully!"
echo ""
echo "📊 Created users:"
echo "👑 Admin: admin@example.com / Admin123!"
echo "👨‍💼 Managers: [department].manager@example.com / Manager123!"
echo "👥 Staff: [department].staff[number]@example.com / Staff123!"
echo ""
echo "🔗 You can now login to your application!"