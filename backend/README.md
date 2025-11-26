# ABC Dashboard Backend API

**Backend API Documentation Only**

A comprehensive **Node.js/Express backend API** for the ABC Dashboard application with advanced features including JWT authentication, email verification, profile management, in-memory caching, API monitoring, and database migrations.


## Architecture

This backend is built using **Clean Architecture** principles, providing excellent maintainability, testability, and scalability:

### **Clean Architecture Layers**
```
src/
├── domain/                    # Business Logic Layer
│   ├── entities/              # Domain Entities (User, File)
│   └── repositories/          # Repository Interfaces (contracts)
├── application/               # Application Layer
│   └── use-cases/             # Use Cases / Application Services
├── infrastructure/            # Infrastructure Layer
│   ├── controllers/           # HTTP Controllers
│   ├── routes/                # Route Definitions
│   ├── middleware/            # HTTP Middleware
│   └── repositories/          # Repository Implementations
└── shared/                    # Shared Kernel
    ├── kernel/                # Cross-cutting concerns
    └── services/              # Shared Services
```

### **Benefits**
- **Dependency Inversion**: Domain doesn't depend on frameworks
- **Testability**: Each layer can be unit tested independently
- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy to add features without affecting existing code
- **Technology Agnostic**: Business logic is framework-independent

## Features

### Core Features
- **RESTful API** with versioning (`/api/v1/`)
- **JWT Authentication** with role-based authorization
- **Email Verification** and password reset flows
- **In-Memory Caching** for performance optimization
- **API Monitoring** and metrics collection
- **Database Migrations** and seeding
- **Swagger Documentation** for all endpoints

### Security Features
- Rate limiting and DDoS protection
- Input validation and sanitization
- CSRF protection
- Helmet security headers
- Correlation ID tracking
- Secure password hashing (bcrypt)

## Prerequisites

- Node.js 18+
- MongoDB
- In-memory caching (built-in, no external dependencies)

## Installation

```bash
# Install dependencies
npm install

# Configure environment (optional - uses env/development.env by default)
# Edit env/development.env with your settings if needed
```

**Note for Windows PowerShell users:** This project uses `cross-env` to ensure cross-platform compatibility for environment variables. All npm scripts are configured to work on Windows, macOS, and Linux.

## Project Structure

```
backend/
├── src/                          # Clean Architecture source code
│   ├── domain/                   # Business Logic Layer
│   │   ├── entities/             # Domain Entities
│   │   └── repositories/         # Repository Interfaces
│   ├── application/              # Application Layer
│   │   └── use-cases/            # Use Cases / Application Services
│   ├── infrastructure/           # Infrastructure Layer
│   │   ├── config/               # Configuration files
│   │   ├── controllers/          # HTTP Controllers
│   │   ├── models/               # MongoDB models
│   │   ├── routes/               # Route Definitions
│   │   ├── middleware/           # HTTP Middleware
│   │   └── repositories/         # Repository Implementations
│   └── shared/                   # Shared Kernel
│       ├── kernel/               # Dependency Injection
│       ├── services/             # Shared Services
│       └── utils/                # Utility functions
├── middleware/                   # HTTP middleware (shared, root level)
├── scripts/                      # Database scripts (root level)
├── migrations/                   # Database migrations (root level)
├── seeds/                        # Database seeds (root level)
├── env/                          # Environment files (root level)
├── server.js                     # Main server file
├── package.json                  # Dependencies & scripts
└── README.md                     # This file
```

## Environment Configuration

The application supports **multiple environments** with dedicated configuration files:

### **Environment Files Structure**
```
env/
├── development.env    # Local development
├── staging.env        # Staging/testing environment
└── production.env     # Production deployment
```

### **Quick Setup**

1. **Choose your environment:**
   ```bash
   # Development (default)
   NODE_ENV=development npm run dev

   # Staging
   NODE_ENV=staging npm run dev:staging

   # Production
   NODE_ENV=production npm start
   ```

2. **Configure environment variables** in the appropriate `env/*.env` file

### **Environment Structure**

```
env/
├── development.env    # Local development
├── staging.env        # Testing/staging environment
└── production.env     # Production deployment
```

### **Environment Variables by Environment**

#### **Development** (`env/development.env`)
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000  # Frontend URL for CORS
MONGODB_URI=mongodb://localhost:27017/abc_dashboard_dev
EMAIL_SERVICE=mailhog
EMAIL_HOST=localhost
EMAIL_PORT=1025
```

#### **Staging** (`env/staging.env`)
```env
NODE_ENV=staging
PORT=5000
CLIENT_URL=https://staging.yourdomain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/abc_dashboard_staging
EMAIL_SERVICE=gmail
# ... (see env/staging.env for complete configuration)
```

#### **Production** (`env/production.env`)
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/abc_dashboard_prod
EMAIL_SERVICE=gmail
# ... (see env/production.env for complete configuration)
```

### **Environment Setup**

Before running the application, copy the appropriate environment file:

```bash
# For development
cp env/development.env .env

# For staging
cp env/staging.env .env

# For production
cp env/production.env .env
```

**⚠️ IMPORTANT:** Always customize the environment variables in your `.env` file with your actual values before deployment.

### **Environment-Specific Commands**

```bash
# Development (default)
npm run dev

# Staging
npm run dev:staging

# Production (simulated)
npm run dev:prod

# Database commands by environment
npm run migrate              # Development
npm run migrate:staging      # Staging
npm run migrate:prod         # Production
```

### **Docker Environment Setup**

```bash
# Development with all services
NODE_ENV=development docker-compose up

# Production deployment
NODE_ENV=production docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Staging deployment
NODE_ENV=staging docker-compose up -d
```

## Getting Started

### 1. Start Development Services

```bash
# Start MailHog (email testing)
docker-compose up mailhog

# Start MongoDB
docker-compose up mongodb

# Note: Redis is not required - using in-memory caching only
```

### 2. Run Database Migrations

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run db:status

# Rollback last migration
npm run migrate:rollback

# Run seed data
npm run seed
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Documentation

Access interactive API documentation at: `http://localhost:5000/api-docs`

**Features:**
- **Interactive Testing**: Try API endpoints directly from the browser
- **Authentication**: JWT token persistence for authenticated requests
- **Request/Response Examples**: Complete examples for all endpoints
- **Schema Validation**: View request/response schemas
- **Real-time Metrics**: See response times and status codes

**Features:**
- **Interactive Testing**: Try API endpoints directly from the browser
- **Authentication**: JWT token persistence for authenticated requests
- **Request/Response Examples**: Complete examples for all endpoints
- **Schema Validation**: View request/response schemas
- **Real-time Metrics**: See response times and status codes

## Email Testing with MailHog

MailHog provides a local SMTP server and web interface for testing emails:

1. **Start MailHog**: `docker-compose up mailhog`
2. **Web Interface**: Visit `http://localhost:8025`
3. **SMTP Server**: Available at `localhost:1025`
4. **View Emails**: All sent emails appear in the web interface

## Database Migrations

### Creating Migrations
```bash
# Create a new migration file
# backend/migrations/003_your_migration_name.js

export const up = async () => {
  // Migration logic here
};

export const down = async () => {
  // Rollback logic here
};
```

### Creating Seeds
```bash
# Create a new seed file
# backend/seeds/002_your_seed_name.js

export const run = async () => {
  // Seed data logic here
};
```

## Monitoring & Metrics

The API includes built-in monitoring:

- **Response Times**: Average, median, P95, P99
- **Error Rates**: Overall and per-endpoint
- **Request Counts**: Total and per-endpoint
- **Cache Performance**: Hit rates and in-memory cache stats

Access metrics at `/api/v1/metrics` (admin only).

## User Roles & Permissions

- **admin**: Full system access, user management, system monitoring
- **manager**: Extended permissions for team management
- **staff**: Standard user permissions

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
EMAIL_SERVICE=gmail
# ... (see env/production.env for complete configuration)
```

### Docker Deployment
```bash
docker build -t abc-dashboard-backend .
docker run -p 5000:5000 abc-dashboard-backend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run migrations and tests
4. Submit a pull request


## Support

For issues and questions:
- Check the Swagger documentation
- Review server logs with correlation IDs
- Test with MailHog for email issues

---