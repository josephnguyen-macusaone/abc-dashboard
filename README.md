# ABC Dashboard

A full-stack dashboard application with modern frontend and enterprise-grade backend API.

## 🚀 Quick Start

### Option 1: OpenLiteSpeed Deployment (Recommended)

**Single-command deployment to OpenLiteSpeed:**

```bash
# Prerequisites: Node.js, Docker, OpenLiteSpeed installed on Linux server

# 1. Configure environment
cp .env.example .env
nano .env  # Edit with your production values

# 3. Deploy everything automatically
./deploy/deploy.sh
```

**That's it!** The script will:

- ✅ Build frontend locally (static files)
- 🔨 Build backend Docker container
- ⚙️ Configure OpenLiteSpeed virtual host
- 📋 Copy static files to OpenLiteSpeed document root
- 🐳 Start backend services (PostgreSQL, Redis, API)
- 🌐 Set up API proxy routing
- 💚 Run comprehensive health checks

**Fully automated - no user interaction required!** 🚀

### Option 2: Docker Development

**Prerequisites:** Node.js 20+, Docker, Docker Compose

```bash
# Clone repository
git clone <repository-url>
cd abc-dashboard

# Configure environment
cp .env.example .env
cp frontend/.env.example frontend/.env

# Choose your database setup option (see Database Setup section below)
# Then initialize database (migrations and seeding)
docker-compose --profile setup up db-setup

# Build and deploy services
docker-compose up -d

# Access the application:
# - Frontend: http://localhost
# - API: http://localhost:5000
# - API Docs: http://localhost:5000/api-docs
# - MailHog (email testing): http://localhost:8025
```

**Database Commands:**
- **Initialize/seed database:** `docker-compose --profile setup up db-setup`
- **Run migrations only:** `docker-compose run --rm backend npm run migrate:prod`
- **Run seeding only:** `docker-compose run --rm backend npm run seed:prod`

#### Database Setup Options

Choose one of the following database setup methods:

**Option A: Docker PostgreSQL (Recommended)**
```bash
# Start only PostgreSQL container (avoids port conflicts with local PostgreSQL)
docker-compose up -d postgres

# PostgreSQL will be available at localhost:5433 (external) / postgres:5432 (internal)
# The container automatically creates the abc_user and abc_dashboard database
```

**Option B: Local PostgreSQL**
```bash
# If you have PostgreSQL installed locally, run the setup script
./setup-database.sh

# This creates the abc_user and abc_dashboard database in your local PostgreSQL
# Then run migrations from the backend directory
cd backend && npm run migrate
```

**Option C: Full Docker Stack**
```bash
# Start all services including PostgreSQL
docker-compose up -d

# Everything runs in Docker with proper networking
```

### Option 3: Local Development

**Prerequisites:** Node.js 20+, PostgreSQL, Redis (optional)

```bash
# Database setup (choose one option)
# Option 1: Use local PostgreSQL
./setup-database.sh

# Option 2: Use Docker PostgreSQL (run in another terminal)
docker-compose up -d postgres

# Backend setup (detailed in backend/README.md)
cd backend
npm install
cp env/development.env .env  # Configure database connection
npm run migrate  # Run database migrations
npm run dev

# Frontend setup (in another terminal)
cd ../frontend
npm install
cp .env.example .env  # Configure API URL
npm run dev
```

## 📚 Documentation Links

- **[📚 Backend API](./backend/README.md)** - Complete API documentation and architecture
- **[🎨 Frontend App](./frontend/README.md)** - React application guide and development
- **[🚀 Deployment Guide](./deploy/README.md)** - Complete deployment documentation with architecture diagrams

## 🌐 Production URLs

After deployment, your application will be available at:

- **Frontend:** `http://your-server`
- **API:** `http://your-server/api/v1`
- **API Docs:** `http://your-server/api-docs`
- **Health Check:** `http://your-server/api/v1/health`

## 🏗️ Architecture Overview

### Backend (Node.js/Express)

- **Clean Architecture** with dependency injection
- **PostgreSQL** with Knex.js ORM
- **Redis** caching (optional)
- **JWT** authentication
- **Role-based** access control
- **Swagger** API documentation

### Frontend (Next.js/React)

- **TypeScript** for type safety
- **Tailwind CSS v4** for styling
- **Custom Contexts** for theme/error management
- **Zustand** for authentication state
- **React Hook Form** with Zod validation
- **Shadcn-UI** component library
- **Clean Architecture** with atomic design

### Deployment Options

- **Docker:** Containerized deployment with Docker Compose
- **OpenLiteSpeed:** Traditional server deployment with PM2
- **SSL/TLS:** Automatic HTTPS with Let's Encrypt
- **Load Balancing:** Nginx reverse proxy
- **Monitoring:** Health checks and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---
