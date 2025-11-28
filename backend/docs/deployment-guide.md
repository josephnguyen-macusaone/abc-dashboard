# Deployment Guide

This guide provides comprehensive instructions for deploying the ABC Dashboard backend in various environments, from local development to production.

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        LoadBalancer[Load Balancer<br/>Nginx/HAProxy]
        AppServers[Application Servers<br/>PM2/Node.js]
        Database[(MongoDB<br/>Replica Set)]
        Cache[(Redis<br/>Cluster)]
        Email[Email Service<br/>SMTP/SendGrid]
        Monitoring[Monitoring<br/>Prometheus/Grafana]
    end

    subgraph "Development Environment"
        DevServer[Dev Server<br/>Node.js --watch]
        DevDB[(Local MongoDB)]
        DevCache[(Local Redis)]
        MailHog[MailHog<br/>Email Testing]
    end

    subgraph "CI/CD Pipeline"
        Git[Git Repository]
        CI[CI Server<br/>GitHub Actions]
        Tests[Automated Tests]
        Build[Docker Build]
        Deploy[Deploy to Environment]
    end

    Client[Frontend Client] --> LoadBalancer
    LoadBalancer --> AppServers
    AppServers --> Database
    AppServers --> Cache
    AppServers --> Email
    AppServers --> Monitoring

    Developer[Developer] --> DevServer
    DevServer --> DevDB
    DevServer --> DevCache
    DevServer --> MailHog

    Git --> CI
    CI --> Tests
    Tests --> Build
    Build --> Deploy
    Deploy --> LoadBalancer

    classDef prod fill:#e8f5e8,stroke:#2e7d32
    classDef dev fill:#e3f2fd,stroke:#1565c0
    classDef cicd fill:#fff3e0,stroke:#ef6c00

    class LoadBalancer,AppServers,Database,Cache,Email,Monitoring prod
    class DevServer,DevDB,DevCache,MailHog dev
    class Git,CI,Tests,Build,Deploy cicd
```

## Environment Configuration

### Environment Variables

The application supports multiple environments with specific configuration files:

```mermaid
graph TD
    subgraph "Environment Files"
        Dev[.env.development]
        Test[.env.test]
        Staging[.env.staging]
        Prod[.env.production]
    end

    subgraph "Configuration Loading"
        EnvLoader[env.js]
        Config[config.js]
        Validation[Joi Validation]
    end

    subgraph "Environment Variables"
        NodeEnv[NODE_ENV]
        Port[PORT]
        Database[MONGODB_URI]
        JWT[JWT_SECRET]
        Email[EMAIL_*]
        Cache[CACHE_*]
    end

    Dev --> EnvLoader
    Test --> EnvLoader
    Staging --> EnvLoader
    Prod --> EnvLoader

    EnvLoader --> Config
    Config --> Validation

    Validation --> NodeEnv
    Validation --> Port
    Validation --> Database
    Validation --> JWT
    Validation --> Email
    Validation --> Cache

    classDef files fill:#e3f2fd,stroke:#1565c0
    classDef loader fill:#e8f5e8,stroke:#2e7d32
    classDef vars fill:#fff3e0,stroke:#ef6c00

    class Dev,Test,Staging,Prod files
    class EnvLoader,Config,Validation loader
    class NodeEnv,Port,Database,JWT,Email,Cache vars
```

### Configuration Files

#### Development Configuration (`env/development.env`)

```bash
# Application
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/abc_dashboard_dev

# JWT
JWT_SECRET=abc_dashboard_dev
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
JWT_EMAIL_VERIFICATION_EXPIRES_IN=24h
JWT_PASSWORD_RESET_EXPIRES_IN=10m

# Email (MailHog)
EMAIL_SERVICE=mailhog
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_FROM=noreply@abc-dashboard.local

# Security
BCRYPT_ROUNDS=12

# Caching
CACHE_USER_DATA_TTL=1800
CACHE_API_RESPONSE_TTL=300
```

#### Production Configuration (`env/production.env`)

```bash
# Application
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/abc_dashboard_prod

# JWT (Use strong secrets!)
JWT_SECRET=your-production-jwt-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_EMAIL_VERIFICATION_EXPIRES_IN=24h
JWT_PASSWORD_RESET_EXPIRES_IN=10m

# Email (Production service)
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-sendgrid-user
EMAIL_PASS=your-sendgrid-password
EMAIL_FROM=noreply@yourdomain.com

# Redis Cache
REDIS_URL=redis://your-redis-instance:6379

# Security
BCRYPT_ROUNDS=12

# Caching
CACHE_USER_DATA_TTL=3600
CACHE_API_RESPONSE_TTL=600
```

## Docker Deployment

### Docker Architecture

```mermaid
graph TB
    subgraph "Docker Compose Stack"
        API[API Container<br/>Node.js App]
        MongoDB[MongoDB Container<br/>Database]
        Redis[Redis Container<br/>Cache]
        MailHog[MailHog Container<br/>Email Testing]
    end

    subgraph "Docker Images"
        BaseImage[Base Image<br/>node:18-alpine]
        AppImage[App Image<br/>abc-dashboard-backend]
        MongoImage[Mongo Image<br/>mongo:6]
        RedisImage[Redis Image<br/>redis:7-alpine]
    end

    subgraph "Volumes"
        MongoData[mongodb_data<br/>Database Persistence]
        RedisData[redis_data<br/>Cache Persistence]
    end

    API --> MongoDB
    API --> Redis
    API --> MailHog

    AppImage --> BaseImage
    MongoDB --> MongoImage
    Redis --> RedisImage

    MongoDB --> MongoData
    Redis --> RedisData

    classDef containers fill:#e3f2fd,stroke:#1565c0
    classDef images fill:#e8f5e8,stroke:#2e7d32
    classDef volumes fill:#fff3e0,stroke:#ef6c00

    class API,MongoDB,Redis,MailHog containers
    class BaseImage,AppImage,MongoImage,RedisImage images
    class MongoData,RedisData volumes
```

### Building Docker Images

```bash
# Build the application image
docker build -t abc-dashboard-backend .

# Or build with specific target
docker build --target production -t abc-dashboard-backend:prod .
```

### Docker Compose Setup

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: abc_dashboard
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog
    ports:
      - '1025:1025'  # SMTP
      - '8025:8025'  # Web UI

  api:
    build: .
    ports:
      - '5000:5000'
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGODB_URI: mongodb://mongodb:27017/abc_dashboard
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-production-secret
      EMAIL_SERVICE: smtp
      EMAIL_HOST: mailhog
      EMAIL_PORT: 1025
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
      mailhog:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  mongodb_data:
  redis_data:
```

### Running with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build api

# Scale the API service
docker-compose up -d --scale api=3
```

## Local Development Setup

### Prerequisites

```bash
# Required software
Node.js >= 18
MongoDB >= 6
Redis (optional)
Git

# Install dependencies
npm install

# Copy environment file
cp env/development.env .env

# Start MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:6

# Start Redis (optional)
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Start MailHog for email testing
docker run -d -p 1025:1025 -p 8025:8025 --name mailhog mailhog/mailhog
```

### Development Workflow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as Git
    participant Local as Local Environment
    participant Docker as Docker Services

    Dev->>Git: Clone repository
    Git-->>Dev: Repository cloned

    Dev->>Local: npm install
    Local-->>Dev: Dependencies installed

    Dev->>Docker: docker-compose up -d mongodb redis mailhog
    Docker-->>Dev: Services started

    Dev->>Local: npm run dev
    Local-->>Dev: Server started on port 5000

    Dev->>Local: Make changes
    Local-->>Local: Hot reload

    Dev->>Local: npm test
    Local-->>Dev: Tests pass

    Dev->>Git: git commit & push
    Git-->>Dev: Changes committed
```

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Start with debugging
npm run dev:debug

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Run linting
npm run lint

# Format code
npm run format

# Run database migrations (if applicable)
npm run migrate
```

## Production Deployment

### PM2 Process Management

```mermaid
graph TD
    subgraph "PM2 Process Manager"
        PM2[PM2 Master]
        Worker1[Worker 1<br/>Node.js]
        Worker2[Worker 2<br/>Node.js]
        Worker3[Worker 3<br/>Node.js]
    end

    subgraph "Load Balancing"
        Nginx[Nginx Reverse Proxy]
        SSL[SSL Termination]
        Health[Health Checks]
    end

    subgraph "Infrastructure"
        Server[Application Server]
        Database[(MongoDB)]
        Cache[(Redis)]
        Email[Email Service]
    end

    Nginx --> PM2
    PM2 --> Worker1
    PM2 --> Worker2
    PM2 --> Worker3

    Worker1 --> Database
    Worker2 --> Database
    Worker3 --> Database

    Worker1 --> Cache
    Worker2 --> Cache
    Worker3 --> Cache

    Worker1 --> Email
    Worker2 --> Email
    Worker3 --> Email

    classDef pm2 fill:#e3f2fd,stroke:#1565c0
    classDef nginx fill:#e8f5e8,stroke:#2e7d32
    classDef infra fill:#fff3e0,stroke:#ef6c00

    class PM2,Worker1,Worker2,Worker3 pm2
    class Nginx,SSL,Health nginx
    class Server,Database,Cache,Email infra
```

### PM2 Configuration (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [
    {
      name: 'abc-dashboard-backend',
      script: 'server.js',
      instances: 'max', // CPU core count
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

### PM2 Deployment Commands

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# View logs
pm2 logs abc-dashboard-backend

# Restart application
pm2 restart abc-dashboard-backend

# Stop application
pm2 stop abc-dashboard-backend

# Delete application
pm2 delete abc-dashboard-backend

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup
```

### Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/abc-dashboard

upstream abc_dashboard_backend {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # API endpoints
    location /api/ {
        proxy_pass http://abc_dashboard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://abc_dashboard_backend/api/v1/health;
        access_log off;
    }

    # API documentation
    location /api-docs {
        proxy_pass http://abc_dashboard_backend/api-docs;
    }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

```mermaid
graph TD
    subgraph "GitHub Actions Pipeline"
        Trigger[Push/PR to main]
        Checkout[Checkout Code]
        Setup[Setup Node.js]
        Install[Install Dependencies]
        Lint[Run Linting]
        Test[Run Tests]
        Build[Build Docker Image]
        Security[Security Scan]
        Deploy[Deploy to Environment]
    end

    subgraph "Environments"
        Staging[Staging Environment]
        Production[Production Environment]
    end

    subgraph "Notifications"
        Slack[Slack Notification]
        Email[Email Notification]
    end

    Trigger --> Checkout
    Checkout --> Setup
    Setup --> Install
    Install --> Lint
    Lint --> Test
    Test --> Build
    Build --> Security
    Security --> Deploy

    Deploy --> Staging
    Staging --> Production

    Test --> Slack
    Deploy --> Slack
    Security --> Email

    classDef pipeline fill:#e3f2fd,stroke:#1565c0
    classDef env fill:#e8f5e8,stroke:#2e7d32
    classDef notify fill:#fff3e0,stroke:#ef6c00

    class Trigger,Checkout,Setup,Install,Lint,Test,Build,Security,Deploy pipeline
    class Staging,Production env
    class Slack,Email notify
```

### GitHub Actions Configuration (`.github/workflows/deploy.yml`)

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build Docker image
        run: docker build -t abc-dashboard-backend .

  security:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3

      - name: Run security scan
        uses: securecodewarrior/github-action-gosec@master
        with:
          args: './...'

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Add your deployment commands here

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Add your production deployment commands here
```

## Database Management

### MongoDB Setup

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/abc_dashboard

# Create database and user (production)
use abc_dashboard
db.createUser({
  user: 'app_user',
  pwd: 'secure_password',
  roles: ['readWrite']
})

# Enable authentication
mongod --auth --dbpath /data/db

# Backup database
mongodump --db abc_dashboard --out /backup/$(date +%Y%m%d_%H%M%S)

# Restore database
mongorestore --db abc_dashboard /backup/backup_directory
```

### Database Migration Strategy

```mermaid
graph TD
    subgraph "Migration Process"
        Code[Code Changes]
        Migration[Create Migration Script]
        Test[Test Migration]
        Deploy[Deploy Migration]
        Verify[Verify Data Integrity]
    end

    subgraph "Migration Types"
        Schema[Schema Changes]
        Data[Data Migrations]
        Index[Index Creation]
    end

    Code --> Migration
    Migration --> Test
    Test --> Deploy
    Deploy --> Verify

    Migration --> Schema
    Migration --> Data
    Migration --> Index

    classDef process fill:#e3f2fd,stroke:#1565c0
    classDef types fill:#e8f5e8,stroke:#2e7d32

    class Code,Migration,Test,Deploy,Verify process
    class Schema,Data,Index types
```

## Monitoring and Logging

### Application Monitoring

```mermaid
graph TD
    subgraph "Application Metrics"
        ResponseTime[Response Time]
        ErrorRate[Error Rate]
        Throughput[Throughput]
        MemoryUsage[Memory Usage]
        CPUUsage[CPU Usage]
    end

    subgraph "Infrastructure Metrics"
        DiskUsage[Disk Usage]
        NetworkIO[Network I/O]
        DatabaseConn[DB Connections]
        CacheHitRate[Cache Hit Rate]
    end

    subgraph "Monitoring Stack"
        Prometheus[Prometheus]
        Grafana[Grafana]
        AlertManager[Alert Manager]
        NodeExporter[Node Exporter]
    end

    subgraph "Logging"
        Winston[Winston Logger]
        LogFiles[Log Files]
        ELK[ELK Stack]
    end

    ResponseTime --> Prometheus
    ErrorRate --> Prometheus
    Throughput --> Prometheus
    MemoryUsage --> Prometheus
    CPUUsage --> Prometheus

    DiskUsage --> NodeExporter
    NetworkIO --> NodeExporter
    DatabaseConn --> NodeExporter
    CacheHitRate --> NodeExporter

    NodeExporter --> Prometheus
    Prometheus --> Grafana
    Prometheus --> AlertManager

    Winston --> LogFiles
    LogFiles --> ELK

    classDef metrics fill:#e3f2fd,stroke:#1565c0
    classDef infra fill:#e8f5e8,stroke:#2e7d32
    classDef monitoring fill:#fff3e0,stroke:#ef6c00
    classDef logging fill:#ffebee,stroke:#f44336

    class ResponseTime,ErrorRate,Throughput,MemoryUsage,CPUUsage metrics
    class DiskUsage,NetworkIO,DatabaseConn,CacheHitRate infra
    class Prometheus,Grafana,AlertManager,NodeExporter monitoring
    class Winston,LogFiles,ELK logging
```

### Health Checks

```javascript
// Health check endpoint response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "memory": {
    "used": "150MB",
    "total": "512MB",
    "percentage": 29.3
  },
  "database": {
    "status": "connected",
    "responseTime": "5ms"
  },
  "services": {
    "email": "operational",
    "cache": "operational"
  }
}
```

### Log Configuration

```javascript
// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'abc-dashboard-backend' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}
```

## Security Considerations

### Production Security Checklist

- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure proper CORS settings
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Configure security headers (Helmet)
- [ ] Regular dependency updates
- [ ] Database authentication enabled
- [ ] Firewall configuration
- [ ] Regular security audits

### SSL/TLS Configuration

```nginx
# SSL Configuration for Nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Other security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
```

## Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues

```bash
# Check MongoDB connection
mongosh --eval "db.runCommand({ping: 1})"

# Check MongoDB logs
docker logs mongodb

# Reset database connection
docker-compose restart mongodb
```

#### Application Startup Issues

```bash
# Check application logs
pm2 logs abc-dashboard-backend

# Check environment variables
printenv | grep -E "(NODE_ENV|PORT|MONGO|JWT)"

# Validate configuration
node -e "require('./src/infrastructure/config/config.js')"
```

#### Memory Issues

```bash
# Check memory usage
pm2 monit

# Restart with increased memory limit
pm2 restart abc-dashboard-backend --max-memory-restart 2G

# Check for memory leaks
node --inspect server.js
```

#### Performance Issues

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:5000/api/v1/health"

# Profile application
node --prof server.js

# Check database performance
db.serverStatus().metrics
```

## Backup and Recovery

### Database Backup Strategy

```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# MongoDB backup
docker exec mongodb mongodump --db abc_dashboard --out /backup

# Compress backup
tar -czf $BACKUP_DIR/mongodb_backup.tar.gz -C /backup abc_dashboard

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/mongodb_backup.tar.gz s3://your-backup-bucket/

# Clean old backups (keep last 7 days)
find /backups -type f -name "*.tar.gz" -mtime +7 -delete
```

### Disaster Recovery

1. **Stop the application**: `pm2 stop abc-dashboard-backend`
2. **Restore database**: `mongorestore --db abc_dashboard /path/to/backup`
3. **Verify data integrity**: Run health checks and test queries
4. **Restart application**: `pm2 start abc-dashboard-backend`
5. **Monitor logs**: Check for any errors during startup

## Scaling Considerations

### Horizontal Scaling

```mermaid
graph TD
    subgraph "Load Balancer"
        LB[Load Balancer<br/>Nginx/HAProxy]
    end

    subgraph "Application Servers"
        App1[App Server 1<br/>PM2 Cluster]
        App2[App Server 2<br/>PM2 Cluster]
        App3[App Server 3<br/>PM2 Cluster]
    end

    subgraph "Shared Services"
        DB[(MongoDB<br/>Replica Set)]
        Cache[(Redis<br/>Cluster)]
        Queue[(Message Queue)]
    end

    LB --> App1
    LB --> App2
    LB --> App3

    App1 --> DB
    App2 --> DB
    App3 --> DB

    App1 --> Cache
    App2 --> Cache
    App3 --> Cache

    App1 --> Queue
    App2 --> Queue
    App3 --> Queue

    classDef lb fill:#e3f2fd,stroke:#1565c0
    classDef app fill:#e8f5e8,stroke:#2e7d32
    classDef shared fill:#fff3e0,stroke:#ef6c00

    class LB lb
    class App1,App2,App3 app
    class DB,Cache,Queue shared
```

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Implement caching strategies
- Use CDN for static assets
- Database indexing and query optimization

This deployment guide provides a comprehensive foundation for deploying the ABC Dashboard backend across different environments with proper security, monitoring, and scalability considerations.
