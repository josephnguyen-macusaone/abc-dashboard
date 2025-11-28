# ABC Dashboard Infrastructure & Deployment

This directory contains the infrastructure code for automated deployment of the ABC Dashboard application.

## Architecture Overview

The deployment uses the following components:
- **Backend**: Node.js Express API with MongoDB
- **Frontend**: Next.js application served via Nginx
- **Database**: MongoDB with persistent storage
- **Reverse Proxy**: Nginx for static file serving and API proxying
- **Monitoring**: Prometheus + Grafana stack
- **Process Management**: PM2 for Node.js processes

## Directory Structure

```
infrastructure/
├── terraform/          # Infrastructure as Code with Terraform
├── scripts/           # Deployment automation scripts
├── nginx/             # Nginx configuration
└── README.md          # This file
```

## Quick Start

### Prerequisites

1. **Server Requirements**:
   - Ubuntu 20.04+ or similar Linux distribution
   - SSH access with sudo privileges
   - At least 2GB RAM, 2 CPU cores, 20GB storage

2. **Local Requirements**:
   - Terraform 1.0+
   - Docker & Docker Compose
   - SSH key pair
   - GitHub repository with secrets configured

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd abc-dashboard
   ```

2. **Configure SSH access**:
   ```bash
   # Generate SSH key pair (if not already done)
   ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

   # Copy public key to server
   ssh-copy-id root@155.138.245.11
   ```

3. **Configure GitHub Secrets** (for CI/CD):
   - `SSH_PRIVATE_KEY`: Private SSH key content
   - `STAGING_SERVER_IP`: IP for staging environment
   - `PRODUCTION_SERVER_IP`: IP for production environment (155.138.245.11)
   - `SSH_USER`: SSH username (root)

## Deployment Methods

### Method 1: Automated (Recommended)

#### Using GitHub Actions (CI/CD)

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Monitor deployment**:
   - Go to GitHub Actions tab
   - Watch the "Deploy ABC Dashboard" workflow
   - Check deployment status and logs

#### Manual Terraform Deployment

1. **Initialize Terraform**:
   ```bash
   cd infrastructure/terraform
   terraform init
   ```

2. **Configure variables**:
   Create `terraform.tfvars`:
   ```hcl
   server_ip = "155.138.245.11"
   ssh_user = "root"
   environment = "production"
   ```

3. **Deploy**:
   ```bash
   terraform plan
   terraform apply
   ```

### Method 2: Manual Deployment

1. **Connect to server**:
   ```bash
   ssh root@155.138.245.11
   ```

2. **Clone repository**:
   ```bash
   git clone <your-repo-url> /var/www/abc-dashboard
   cd /var/www/abc-dashboard
   ```

3. **Configure environment**:
   ```bash
   cp backend/env/production.env .env
   # Edit .env with your configuration
   nano .env
   ```

4. **Run deployment script**:
   ```bash
   chmod +x infrastructure/scripts/deploy.sh
   ./infrastructure/scripts/deploy.sh production
   ```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root with:

```bash
# Database
MONGODB_URI=mongodb://mongodb:27017/abc_dashboard
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_key

# Email (for notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# Client URL
CLIENT_URL=http://155.138.245.11

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_secure_grafana_password

# Docker Registry (optional)
DOCKER_REGISTRY=ghcr.io/your-org
```

### Environment Files

- `backend/env/development.env` - Development configuration
- `backend/env/staging.env` - Staging configuration
- `backend/env/production.env` - Production configuration

## Services & Ports

After deployment, the following services will be available:

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| Frontend | 80 | 80 | http://155.138.245.11 |
| Backend API | 5000 | 5000 | http://155.138.245.11:5000 |
| API Docs | 5000 | 5000 | http://155.138.245.11:5000/api-docs |
| MongoDB | 27017 | 27017 | mongodb://155.138.245.11:27017 |
| Redis | 6379 | 6379 | redis://155.138.245.11:6379 |
| Grafana | 3000 | 3000 | http://155.138.245.11:3000 |
| Prometheus | 9090 | 9090 | http://155.138.245.11:9090 |

## Monitoring & Maintenance

### Accessing Monitoring

1. **Grafana**:
   - URL: http://155.138.245.11:3000
   - Username: admin
   - Password: (configured in .env)

2. **Prometheus**:
   - URL: http://155.138.245.11:9090
   - Metrics browser and alerting

### Health Checks

- Application Health: `http://155.138.245.11/api/v1/health`
- Container Health: Check Docker container status

### Logs

```bash
# View application logs
docker-compose logs -f backend

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend
```

### Database Backup

```bash
# Create backup
docker-compose exec mongodb mongodump --db abc_dashboard --out /backup/$(date +%Y%m%d_%H%M%S)

# Restore backup
docker-compose exec mongodb mongorestore /backup/<backup_directory>
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Check what's using the port
   lsof -i :80
   lsof -i :5000

   # Stop conflicting service
   sudo systemctl stop apache2
   ```

2. **Permission denied**:
   ```bash
   # Fix SSH permissions
   chmod 600 ~/.ssh/id_rsa
   chmod 644 ~/.ssh/id_rsa.pub
   ```

3. **Docker issues**:
   ```bash
   # Restart Docker
   sudo systemctl restart docker

   # Clean up Docker
   docker system prune -a
   ```

4. **Database connection failed**:
   - Check MongoDB container is running
   - Verify connection string in .env
   - Check MongoDB logs: `docker-compose logs mongodb`

### Rollback

If deployment fails:

```bash
# Stop all services
docker-compose down

# Restore from backup (if available)
# Then redeploy
./infrastructure/scripts/deploy.sh production
```

## Security Considerations

1. **Change default passwords** in `.env`
2. **Configure SSL/TLS** certificates for HTTPS
3. **Set up firewall** rules
4. **Regular security updates**
5. **Monitor access logs**

## Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Verify configuration files
3. Test individual services
4. Check server resources (CPU, memory, disk)

## Development

### Local Development Setup

```bash
# Start services locally
docker-compose -f docker-compose.dev.yml up -d

# Run tests
npm test

# Build for production
npm run build
```

### Adding New Features

1. Update code
2. Test locally
3. Push to feature branch
4. Create pull request
5. Merge to main (triggers deployment)
