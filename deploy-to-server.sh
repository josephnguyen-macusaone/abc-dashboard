#!/bin/bash

# ABC Dashboard - Direct Server Deployment
# Run this ON the server after copying files

echo "🚀 ABC Dashboard Server Deployment"
echo "==================================="

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p /var/www/abc-dashboard
cd /var/www/abc-dashboard

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install Docker if not present (for backend/frontend only)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

# Install Docker Compose if not present (for backend/frontend only)
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Check if local MongoDB is accessible
echo "🔍 Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.adminCommand('ping')" localhost:27017/abc_dashboard_prod --quiet; then
        echo "✅ Local MongoDB is accessible"
    else
        echo "⚠️  WARNING: Cannot connect to local MongoDB!"
        echo "   Make sure MongoDB is installed and running."
        echo "   Install: apt-get install mongodb"
        echo "   Start: systemctl start mongodb"
        echo ""
        read -p "Press Enter to continue anyway, or Ctrl+C to cancel..."
    fi
else
    echo "⚠️  WARNING: mongosh not found. Cannot verify MongoDB connection."
    echo "   Install MongoDB tools: apt-get install mongodb-clients"
    echo ""
    read -p "Press Enter to continue anyway, or Ctrl+C to cancel..."
fi

# Install PM2 globally
echo "⚙️ Installing PM2..."
npm install -g pm2

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from production template..."
    cp backend/env/production.env .env
    echo "⚠️  IMPORTANT: Edit .env file with your actual values!"
    echo "   nano .env"
    echo ""
    echo "Required values:"
    echo "- MONGODB_ROOT_PASSWORD"
    echo "- JWT_SECRET"
    echo "- EMAIL_USER & EMAIL_PASS (optional)"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Make deployment script executable
chmod +x infrastructure/scripts/deploy.sh

# Run deployment
echo "🚀 Starting deployment..."
./infrastructure/scripts/deploy.sh production

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🌐 Your application is now running at:"
echo "   Frontend: http://155.138.245.11"
echo "   API: http://155.138.245.11/api/v1"
echo "   API Docs: http://155.138.245.11/api-docs"
echo "   Health Check: http://155.138.245.11/api/v1/health"
echo ""
echo "📊 Monitoring:"
echo "   Grafana: http://155.138.245.11:3000"
echo "   Prometheus: http://155.138.245.11:9090"
