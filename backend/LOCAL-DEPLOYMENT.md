# Local Deployment Guide for Testing

This guide will help you deploy the ABC Dashboard backend locally for testing using Docker Compose.

## Quick Start

```bash
# Navigate to backend directory
cd backend

# Start all services
docker-compose -f docker-compose.dev.yml up -d --build

# Wait for services to be ready, then run migrations
docker-compose -f docker-compose.dev.yml exec api npm run migrate

# Optional: Seed test data
docker-compose -f docker-compose.dev.yml exec api npm run seed
```

## What Gets Deployed

The local deployment includes:

- **MongoDB 6**: Database on port `27017`
- **Redis 7**: Cache on port `6379`
- **MailHog**: Email testing on ports `1025` (SMTP) and `8025` (Web UI)
- **Backend API**: Node.js application on port `5000`

## Service URLs

Once deployed, access:

- **API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/api/v1/health
- **MailHog UI**: http://localhost:8025

## Common Commands

### Start Services

```bash
# Start all services in detached mode
docker-compose -f docker-compose.dev.yml up -d

# Start and rebuild images
docker-compose -f docker-compose.dev.yml up -d --build

# Start and view logs
docker-compose -f docker-compose.dev.yml up
```

### Stop Services

```bash
# Stop services (keeps data)
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose -f docker-compose.dev.yml down -v
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f mongodb
docker-compose -f docker-compose.dev.yml logs -f redis
docker-compose -f docker-compose.dev.yml logs -f mailhog

# Last 100 lines
docker-compose -f docker-compose.dev.yml logs --tail=100 api
```

### Check Status

```bash
# Check all services
docker-compose -f docker-compose.dev.yml ps

# Check API health endpoint
curl http://localhost:5000/api/v1/health
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.dev.yml restart

# Restart specific service
docker-compose -f docker-compose.dev.yml restart api
```

## Database Management

### Run Migrations

```bash
docker-compose -f docker-compose.dev.yml exec api npm run migrate
```

### Seed Test Data

```bash
docker-compose -f docker-compose.dev.yml exec api npm run seed
```

### Check Migration Status

```bash
docker-compose -f docker-compose.dev.yml exec api npm run db:status
```

### Access MongoDB

```bash
# Connect to MongoDB shell
docker-compose -f docker-compose.dev.yml exec mongodb mongosh abc_dashboard_dev

# Or from host machine (if MongoDB client is installed)
mongosh mongodb://localhost:27017/abc_dashboard_dev
```

### Access Redis

```bash
# Connect to Redis CLI
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

## Monitoring & Debugging

### Check Service Health

```bash
# Check all services status
docker-compose -f docker-compose.dev.yml ps

# Check API health endpoint
curl http://localhost:5000/api/v1/health

# Check MongoDB
docker-compose -f docker-compose.dev.yml exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check Redis
docker-compose -f docker-compose.dev.yml exec redis redis-cli ping
```

### Execute Commands in Containers

```bash
# Open shell in API container
docker-compose -f docker-compose.dev.yml exec api sh

# Run npm commands
docker-compose -f docker-compose.dev.yml exec api npm test
docker-compose -f docker-compose.dev.yml exec api npm run lint
```

## Troubleshooting

### Services Won't Start

1. **Check Docker is running:**
   ```bash
   docker info
   ```

2. **Check port conflicts:**
   - Port 5000: API
   - Port 27017: MongoDB
   - Port 6379: Redis
   - Port 8025: MailHog UI
   - Port 1025: MailHog SMTP

3. **View error logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs
   ```

### API Can't Connect to MongoDB

1. **Check MongoDB is healthy:**
   ```bash
   docker-compose -f docker-compose.dev.yml ps mongodb
   ```

2. **Check MongoDB logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs mongodb
   ```

3. **Verify connection string:**
   - Should be: `mongodb://mongodb:27017/abc_dashboard_dev`
   - Check in `docker-compose.dev.yml`

### API Container Exits Immediately

1. **Check API logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs api
   ```

2. **Common issues:**
   - Missing environment variables
   - MongoDB not ready
   - Port already in use

3. **Start API interactively to see errors:**
   ```bash
   docker-compose -f docker-compose.dev.yml up api
   ```

### Migration Errors

1. **Ensure MongoDB is running:**
   ```bash
   docker-compose -f docker-compose.dev.yml ps mongodb
   ```

2. **Check migration status:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec api npm run db:status
   ```

3. **Run migrations manually:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec api npm run migrate
   ```

## Environment Configuration

The local deployment uses `docker-compose.dev.yml` which sets:

- `NODE_ENV=development`
- `MONGODB_URI=mongodb://mongodb:27017/abc_dashboard_dev`
- `EMAIL_HOST=mailhog` (Docker service name)
- `LOG_LEVEL=debug`

These override the values in `env/development.env` when running in Docker.

## Clean Up

### Stop Services

```bash
# Stop but keep data
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose -f docker-compose.dev.yml down -v
```

### Remove Everything

```bash
# Stop, remove containers, networks, and volumes
docker-compose -f docker-compose.dev.yml down -v --rmi local
```

## Development Workflow

1. **Start services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

2. **Run migrations:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec api npm run migrate
   ```

3. **Make code changes** (if using volume mounts)

4. **Restart API to apply changes:**
   ```bash
   docker-compose -f docker-compose.dev.yml restart api
   ```

5. **View logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f api
   ```

6. **Test API:**
   - Open http://localhost:5000/api-docs
   - Test endpoints using Swagger UI

## Test Accounts

After seeding, you can use these test accounts:

| Role    | Email              | Username | Password    |
|---------|-------------------|----------|-------------|
| Admin   | admin@example.com | admin    | Admin123!   |
| Manager | manager@example.com | manager | Manager123! |
| Staff   | staff@example.com | staff    | Staff123!   |

## Next Steps

- Review API documentation at http://localhost:5000/api-docs
- Check email in MailHog at http://localhost:8025
- Monitor logs for debugging
- Run tests: `docker-compose -f docker-compose.dev.yml exec api npm test`

---

**Note**: This is for local testing only. For production deployment, use `docker-compose.yml` and follow the production deployment guide.
