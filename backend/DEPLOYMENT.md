# Backend Deployment Guide

## Overview

This backend application is designed to be deployed using Docker Compose with the following services:
- **MongoDB 6**: Database service with persistent storage
- **Redis 7**: Cache service (optional but recommended)
- **MailHog**: Email testing service for development/staging
- **Backend API**: Node.js/Express application

## Architecture Analysis

### Current Setup

✅ **Well-Configured Components:**
- Docker Compose with all required services
- Health checks for MongoDB and Redis
- Proper service dependencies and startup order
- Environment variable configuration
- Security middleware (Helmet, CORS, rate limiting)
- Database connection retry logic
- Graceful shutdown handling

### Service Configuration

#### MongoDB
- **Image**: `mongo:6`
- **Port**: `27017:27017`
- **Volume**: `mongodb_data:/data/db` (persistent storage)
- **Database**: `abc_dashboard`
- **Health Check**: Configured with mongosh ping

#### Redis
- **Image**: `redis:7-alpine`
- **Port**: `6379:6379`
- **Volume**: `redis_data:/data` (persistent storage)
- **Health Check**: Configured with redis-cli ping

#### MailHog
- **Image**: `mailhog/mailhog`
- **Ports**: 
  - `1025:1025` (SMTP server)
  - `8025:8025` (Web UI)
- **Purpose**: Email testing and development

#### Backend API
- **Build**: Uses Dockerfile in current directory
- **Port**: `5000:5000`
- **Dependencies**: Waits for MongoDB and Redis health checks
- **Health Check**: `/api/v1/health` endpoint

## Deployment Steps

### Prerequisites

1. **Docker & Docker Compose** installed
2. **Node.js 18+** (for local development)
3. **Git** (to clone repository)

### Quick Start

```bash
# Navigate to backend directory
cd backend

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Check service status
docker-compose ps

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Initial Setup

1. **Start Services:**
   ```bash
   docker-compose up -d
   ```

2. **Wait for Services to be Healthy:**
   ```bash
   # Check health status
   docker-compose ps
   
   # Wait until all services show "healthy" or "Up"
   ```

3. **Run Database Migrations:**
   ```bash
   # Execute migrations inside the API container
   docker-compose exec api npm run migrate:prod
   ```

4. **Seed Initial Data (Optional):**
   ```bash
   # Seed test data
   docker-compose exec api npm run seed:prod
   ```

5. **Verify Deployment:**
   ```bash
   # Check health endpoint
   curl http://localhost:5000/api/v1/health
   
   # Access API documentation
   # Open browser: http://localhost:5000/api-docs
   
   # Access MailHog UI
   # Open browser: http://localhost:8025
   ```

## Environment Configuration

### Docker Compose Environment Variables

The `docker-compose.yml` file sets these environment variables for the API service:

```yaml
NODE_ENV: production
PORT: 5000
MONGODB_URI: mongodb://mongodb:27017/abc_dashboard
REDIS_URL: redis://redis:6379
JWT_SECRET: your-production-secret  # ⚠️ CHANGE THIS!
EMAIL_SERVICE: smtp
EMAIL_HOST: mailhog
EMAIL_PORT: 1025
```

### Important Security Notes

⚠️ **Before deploying to production:**

1. **Change JWT_SECRET** in `docker-compose.yml`:
   ```yaml
   JWT_SECRET: your-strong-random-secret-here
   ```
   Generate a secure secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update CLIENT_URL** if different from default
3. **Review CORS settings** in `server.js`
4. **Set up proper email service** (replace MailHog in production)

## Service URLs

After deployment, access:

- **API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/api/v1/health
- **MailHog UI**: http://localhost:8025
- **MongoDB**: mongodb://localhost:27017
- **Redis**: redis://localhost:6379

## Database Management

### Run Migrations

```bash
# Production
docker-compose exec api npm run migrate:prod

# Check migration status
docker-compose exec api npm run db:status:prod
```

### Backup MongoDB

```bash
# Create backup
docker-compose exec mongodb mongodump --out /data/backup

# Copy backup from container
docker cp $(docker-compose ps -q mongodb):/data/backup ./backup
```

### Restore MongoDB

```bash
# Copy backup to container
docker cp ./backup $(docker-compose ps -q mongodb):/data/backup

# Restore
docker-compose exec mongodb mongorestore /data/backup
```

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100 api
```

### Health Checks

```bash
# Check API health
curl http://localhost:5000/api/v1/health

# Check service status
docker-compose ps

# Check container health
docker inspect $(docker-compose ps -q api) | grep -A 10 Health
```

## Troubleshooting

### MongoDB Connection Issues

**Problem**: API can't connect to MongoDB

**Solutions**:
1. Check MongoDB is running: `docker-compose ps mongodb`
2. Verify MongoDB health: `docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"`
3. Check connection string in docker-compose.yml
4. Review API logs: `docker-compose logs api`

### API Won't Start

**Problem**: API container exits immediately

**Solutions**:
1. Check logs: `docker-compose logs api`
2. Verify MongoDB is healthy before API starts
3. Check environment variables
4. Ensure JWT_SECRET is set

### Port Already in Use

**Problem**: Port 5000, 27017, or 8025 already in use

**Solutions**:
1. Change ports in docker-compose.yml:
   ```yaml
   ports:
     - '5001:5000'  # Use 5001 instead of 5000
   ```
2. Stop conflicting services
3. Check what's using the port:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # Linux/Mac
   lsof -i :5000
   ```

### Database Migration Issues

**Problem**: Migrations fail

**Solutions**:
1. Ensure MongoDB is running and healthy
2. Check database connection: `docker-compose exec api npm run db:status:prod`
3. Review migration logs
4. Manually connect to MongoDB to verify:
   ```bash
   docker-compose exec mongodb mongosh abc_dashboard
   ```

## Production Deployment Considerations

### Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Update CLIENT_URL to production domain
- [ ] Configure proper CORS origins
- [ ] Set up real email service (not MailHog)
- [ ] Enable HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Configure rate limiting appropriately
- [ ] Set up log rotation
- [ ] Configure backup strategy
- [ ] Review and update all secrets

### Performance Optimization

1. **Database Indexes**: Already configured in migrations
2. **Caching**: Redis is configured for caching
3. **Connection Pooling**: MongoDB connection pool size: 10
4. **Rate Limiting**: Configured (100 requests per 15 minutes)

### Scaling

For horizontal scaling:

1. **API Service**: Can run multiple instances behind a load balancer
2. **MongoDB**: Consider MongoDB replica set for production
3. **Redis**: Can be clustered for high availability

### Backup Strategy

1. **MongoDB**: Regular automated backups
2. **Redis**: Persistence enabled (AOF/RDB)
3. **Application Logs**: External log aggregation service

## Environment Files

The application uses environment-specific configuration files:

- `env/development.env` - Local development
- `env/staging.env` - Staging environment
- `env/production.env` - Production defaults (overridden by docker-compose.yml)

**Note**: Docker Compose environment variables take precedence over .env files.

## Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations if needed
docker-compose exec api npm run migrate:prod
```

### Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (⚠️ deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review API documentation: http://localhost:5000/api-docs
- Check health endpoint: http://localhost:5000/api/v1/health

---

**Last Updated**: 2024
**Version**: 1.0.0

