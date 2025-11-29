#!/bin/bash

# Setup Local MongoDB for ABC Dashboard
echo "🐘 Setting up MongoDB for ABC Dashboard"

# Install MongoDB
echo "📦 Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org

# Start MongoDB
echo "🚀 Starting MongoDB..."
systemctl start mongod
systemctl enable mongod

# Wait for MongoDB to start
sleep 5

# Create database and user
echo "👤 Creating database and user..."
mongosh << EOF
use abc_dashboard_prod
db.createUser({
  user: "abc_user",
  pwd: "your_secure_password_here",
  roles: ["readWrite"]
})
EOF

echo "✅ MongoDB setup complete!"
echo "🔍 Test connection: mongosh localhost:27017/abc_dashboard_prod"
echo "🔐 Update your .env file with the correct MongoDB URI"
