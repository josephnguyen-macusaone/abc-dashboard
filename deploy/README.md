# ABC Dashboard - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: OpenLiteSpeed (Recommended)

**Single-command deployment to OpenLiteSpeed:**

```bash
# Prerequisites: Node.js 20+, Docker, OpenLiteSpeed installed

# 1. Configure environment (single consolidated .env file)
cp .env.example .env
nano .env  # Edit with production values

# 2. Deploy everything automatically
./deploy.sh
```

### Option 2: Docker Only (Consolidated)

**Development Environment (Full Stack):**

```bash
# Run development environment with hot reload (from project root)
docker-compose --profile dev up -d

# View logs
docker-compose --profile dev logs -f

# Stop development environment
docker-compose --profile dev down
```

**Production Environment (Backend Only):**

```bash
# Run production backend with databases
docker-compose --profile prod up -d

# View logs
docker-compose --profile prod logs -f

# Stop production environment
docker-compose --profile prod down
```

**Database Setup (Production):**

```bash
# Run database migrations and seeding
docker-compose --profile setup up db-setup
```

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        User[👤 User] --> Browser[🌐 Browser]
    end

    subgraph "OpenLiteSpeed Server"
        OLS[🚀 OpenLiteSpeed<br/>Port 80/443<br/>Direct Static Serving]

        OLS --> StaticFiles[📄 Static Files<br/>HTML/JS/CSS<br/>Direct from disk]
        OLS --> APIProxy[📡 API Proxy<br/>/api/* → Backend]
        OLS --> DocsProxy[📚 API Docs Proxy<br/>/api-docs/* → Backend]
    end

    subgraph "Docker Services"
        Backend[⚙️ Backend API<br/>Node.js/Express<br/>Port 5000] --> MongoDB[(🗄️ MongoDB<br/>Database)]
        Backend --> Redis[(🔄 Redis<br/>Cache)]
        Backend --> Email[📧 Email Service<br/>SMTP/Gmail]
    end

    Browser --> OLS
    APIProxy --> Backend
    DocsProxy --> Backend

    style OLS fill:#e1f5fe
    style Backend fill:#f3e5f5
    style StaticFiles fill:#e8f5e8
    style MongoDB fill:#fff3e0
    style Redis fill:#fce4ec
```

## 📁 File Structure

```txt
abc-dashboard/
├── docker-compose.yml             Consolidated Docker deployment (all environments)
├── .env                           Consolidated environment variables (for Docker)
├── .env.example                   Consolidated environment template
├── backend/
│   ├── .env                       Local development (optional)
│   └── .env.example               Local development template
├── frontend/
│   ├── .env                       Local development (optional)
│   └── .env.example               Local development template
├── deploy/
│   ├── README.md                  This deployment guide
│   └── deploy.sh                  OpenLiteSpeed deployment script
└── infrastructure/                Infrastructure configs
    └── nginx/                     Nginx configs (legacy)
```

## ⚙️ Environment Configuration

### Environment Variable Structure

**Consolidated Approach:**
- **Root `.env`**: Single file used by Docker Compose for all services
- **Backend `.env`**: Optional, for local development without Docker
- **Frontend `.env`**: Optional, for local development without Docker

**When to use each:**
- **Docker deployment**: Only need root `.env`
- **Local development**: Use individual `.env` files in backend/frontend folders
- **Mixed setup**: Root `.env` for Docker, individual ones for local services

### Required Variables

```bash
# Essential
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database & Cache
MONGODB_URI=mongodb://mongodb:27017/abc_dashboard
REDIS_URL=redis://redis:6379

# Email (see .env.example for detailed setup)
EMAIL_FROM=noreply@yourapp.com
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_SERVICE=gmail

# Frontend (for Docker deployment)
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Email Setup

**Development (MailHog):**

```bash
# Install MailHog locally
brew install mailhog  # macOS
mailhog              # Start server
# Access: http://localhost:8025
```

**Production (Gmail):**

1. Enable 2FA on Gmail account
2. Generate App Password: <https://support.google.com/accounts/answer/185833>
3. Use App Password (not main password) in EMAIL_PASS

## 🔄 Deployment Flow

```mermaid
graph TD
    A[👨‍💻 Developer] --> B[Configure Environment]
    B --> C[Build Frontend Locally]
    C --> D[Build Backend Image]
    D --> E[Configure OpenLiteSpeed]
    E --> F[Copy Static Files]
    F --> G[Start Services]
    G --> H[Health Checks]
    H --> I[✅ Deployment Complete]

    style E fill:#c8e6c9
    style F fill:#fff3e0
```

## 🐳 Docker Services

| Service | Profile | Port | Purpose |
|---------|---------|------|---------|
| **MongoDB** | `dev`, `prod`, `setup` | 27017 | Database |
| **Redis** | `dev`, `prod`, `setup` | 6379 | Cache |
| **MailHog** | `dev`, `prod`, `setup` | 8025/1025 | Email Testing |
| **Backend (Prod)** | `prod` | 5000 | API Server (Production) |
| **Backend (Dev)** | `dev` | 5000 | API Server (Development w/ hot reload) |
| **Frontend (Dev)** | `dev` | 3000 | Web App (Development w/ hot reload) |
| **DB Setup** | `setup` | - | Database migrations & seeding |
| **Seed (Dev)** | `dev` | - | Development database seeding |

## 🔄 Handling Existing Deployments

### What happens if `/var/www/abc-dashboard/` already exists?

The deployment script handles existing installations automatically:

**Automatic Behavior:**

- ✅ **Detects existing directory** and warns about overwrites
- 🛑 **Automatically stops** any running Docker services
- 🔄 **Overwrites files** without user interaction
- 🚀 **Continues deployment** seamlessly

### Re-deployment Process

```bash
# Simply run the deployment script again
./deploy/deploy.sh

# The script will:
# 1. Detect existing installation
# 2. Stop running services automatically
# 3. Overwrite files and redeploy
# 4. Restart all services
```

**No manual intervention required!** The script handles everything automatically. 🎯

## 🔧 Management Commands

```bash
# Development Environment
docker-compose --profile dev ps                    # View dev services
docker-compose --profile dev logs -f              # View dev logs
docker-compose --profile dev logs -f backend-dev  # View backend logs
docker-compose --profile dev restart              # Restart dev services
docker-compose --profile dev down                 # Stop dev environment

# Production Environment
docker-compose --profile prod ps                  # View prod services
docker-compose --profile prod logs -f             # View prod logs
docker-compose --profile prod logs -f backend     # View backend logs
docker-compose --profile prod restart             # Restart prod services
docker-compose --profile prod down                # Stop prod environment

# Database Setup
docker-compose --profile setup up db-setup        # Run migrations & seeding

# OpenLiteSpeed commands
systemctl status lsws
systemctl restart lsws
```

## 📊 Monitoring & Health Checks

- **API Health**: `http://your-server/api/v1/health`
- **Container Status**: `docker-compose ps`
- **Logs**: `docker-compose logs -f`
- **OpenLiteSpeed**: `systemctl status lsws`

## 🛠️ Troubleshooting

### Common Issues

**Port 80/443 already in use:**

```bash
sudo netstat -tulpn | grep :80
sudo systemctl stop apache2
```

**MongoDB connection failed:**

```bash
docker-compose logs mongodb
# Check MONGODB_URI in .env
```

**Frontend not loading:**

```bash
# Check if frontend was built
ls -la frontend/out/
# Rebuild if missing
cd frontend && npm run build
```

**Email not working:**

```bash
# Test email script
cd backend && npm run test:email
# Check email credentials in .env
```

## 🔒 Security Notes

- Use strong JWT secrets in production
- Configure SSL certificates for HTTPS
- Use Gmail App Passwords (not main password)
- Regularly update Docker images
- Monitor logs for security issues

## 📚 Additional Resources

- [Backend API Documentation](./backend/README.md)
- [Frontend Development](./frontend/README.md)
- [OpenLiteSpeed Documentation](https://openlitespeed.org/)
