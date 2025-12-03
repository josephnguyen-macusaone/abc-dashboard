# Operations Documentation

Documentation for deploying, monitoring, and maintaining the ABC Dashboard Backend in production environments.

## 📚 Operations Documents

| Document                                      | Description                               | Audience          |
| --------------------------------------------- | ----------------------------------------- | ----------------- |
| **[Deployment Guide](./deployment-guide.md)** | Complete production deployment procedures | DevOps, SysAdmins |

## 🚀 Deployment Options

### Docker Compose (Recommended)

```bash
# Production deployment
docker-compose up -d

# Development with local services
docker-compose --profile dev up -d
```

### Single Container

```bash
# Build and run
docker build -t abc-dashboard-backend .
docker run -p 5000:5000 \
  -e MONGODB_URI=mongodb://your-host \
  -e JWT_SECRET=your-secret \
  abc-dashboard-backend
```

### PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor processes
pm2 monit
```

## 📊 Monitoring & Health Checks

### Health Endpoints

```bash
# System health
curl http://localhost:5000/api/v1/health

# Email service health
curl http://localhost:5000/api/v1/health/email
```

### Key Metrics to Monitor

- **API Response Times**: P95 response time < 500ms
- **Error Rates**: < 1% of total requests
- **Database Connections**: Monitor connection pool usage
- **Email Delivery Rates**: Track bounce rates and delivery success
- **Memory Usage**: Monitor for memory leaks
- **CPU Usage**: Scale based on load

### Logging

```bash
# View application logs
pm2 logs abc-dashboard-backend

# View logs with follow
pm2 logs abc-dashboard-backend --lines 100 -f

# Check error logs
tail -f logs/error.log
```

## 🔧 Maintenance Tasks

### Database Maintenance

```bash
# Run migrations
npm run migrate

# Seed test data (development only)
npm run seed

# Backup database
mongodump --db abc_dashboard --out backup/$(date +%Y%m%d_%H%M%S)
```

### Email Service Maintenance

```bash
# Test email configuration
npm run test:email-config

# Test email sending
npm run test:email:send

# Check email service health
npm run test:email:health
```

### Security Updates

```bash
# Update dependencies
npm audit
npm audit fix

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

## 🚨 Troubleshooting

### Common Issues

#### Application Not Starting

```bash
# Check environment variables
cat .env

# Check logs
pm2 logs

# Test database connection
npm run test:db
```

#### Email Not Sending

```bash
# Test email configuration
npm run test:email-config

# Check email service logs
tail -f logs/app.log | grep email

# Verify credentials
# SendGrid: Check API key format
# Google Workspace: Verify app password
```

#### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart application
pm2 restart abc-dashboard-backend

# Check for memory leaks
npm run test:memory
```

### Performance Tuning

#### Database Optimization

- **Indexes**: Ensure proper indexes on frequently queried fields
- **Connection Pool**: Configure appropriate connection pool size
- **Query Optimization**: Use MongoDB explain() for slow queries

#### Application Optimization

- **Caching**: Implement Redis for session and data caching
- **Rate Limiting**: Configure appropriate rate limits
- **Compression**: Enable gzip compression for API responses

## 🔗 Related Documentation

- [Getting Started](../getting-started/README.md) - Quick start guide
- [Architecture](../architecture/README.md) - System design
- [API Reference](../api-reference/README.md) - API documentation
- [Guides](../guides/README.md) - Specific setup guides
