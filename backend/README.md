# ABC Dashboard Backend

**Node.js/Express API** with JWT authentication, Clean Architecture, and comprehensive testing.

## Architecture

Built with **Clean Architecture** for maintainability and testability.

```txt
src/
├── domain/              # Business Logic Layer
│   ├── entities/        # Domain entities (User, UserProfile)
│   ├── exceptions/      # Domain-specific exceptions
│   └── repositories/    # Repository interfaces/contracts
├── application/         # Application Layer
│   ├── dto/             # Data Transfer Objects
│   ├── interfaces/      # Service interfaces
│   ├── services/        # Application services
│   ├── use-cases/       # Business use cases
│   └── validators/      # Input validation
├── infrastructure/      # Infrastructure Layer
│   ├── controllers/     # HTTP request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── config/           # Configuration
│   ├── middleware/      # HTTP middleware
│   └── repositories/    # Repository implementations
└── shared/              # Shared Kernel
    ├── kernel/          # Dependency injection container
    ├── services/        # Core services (Auth, Token, Email)
    ├── http/            # HTTP utilities
    └── utils/           # Utility functions
```

**Key Benefits**: Framework-independent business logic, dependency inversion, independent testing, scalable architecture, clear separation of concerns.

## Features

- ✅ **JWT Authentication** with role-based access
- ✅ **Email verification** and password reset
- ✅ **RESTful API** with OpenAPI documentation
- ✅ **Database migrations** and seeding
- ✅ **Input validation** and security middleware
- ✅ **In-memory caching** and API monitoring
- ✅ **161 tests** with Jest (unit + integration)
- ✅ **0 security vulnerabilities**

## Quick Start

**Prerequisites**: Node.js 18+, MongoDB 6+, npm 8+

```bash
npm install
cp env/development.env .env
npm run migrate
npm run seed
npm run dev
```

**URLs**:

- API: <http://localhost:5000>
- Docs: <http://localhost:5000/api-docs>
- Health: <http://localhost:5000/api/v1/health>

## Scripts

```bash
npm run dev          # Development server
npm start            # Production server
npm test             # Run all tests (161 tests)
npm run lint         # Code linting
npm run format       # Code formatting
npm run migrate      # Database migrations
npm run seed         # Seed test data
```

## Environment

Copy `env/development.env` and configure:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/abc_dashboard
JWT_SECRET=your-secure-secret
```

## Test Accounts

After running `npm run seed`, these accounts are available:

| Role        | Email                 | Username | Password      |
| ----------- | --------------------- | -------- | ------------- |
| **Admin**   | <admin@example.com>   | admin    | `Admin123!`   |
| **Manager** | <manager@example.com> | manager  | `Manager123!` |
| **Staff**   | <staff@example.com>   | staff    | `Staff123!`   |

## API

**Interactive docs**: <http://localhost:5000/api-docs>

## Additional Features

- **User Roles**: admin, manager, staff with different permissions
- **Database Indexes**: Optimized for common query patterns
- **API Monitoring**: Response times, error rates, cache performance
- **Email Testing**: Use MailHog at <http://localhost:8025>

## Deployment

### Docker Compose (Recommended)

All services are configured in `docker-compose.yml`:

- **MongoDB**: Database service with persistent storage
- **Redis**: Cache service (optional)
- **MailHog**: Email testing service
- **API**: Backend application with health checks

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Single Container

For running only the backend API (requires external MongoDB/Redis):

```bash
docker build -t abc-dashboard-backend .
docker run -p 5000:5000 \
  -e MONGODB_URI=mongodb://your-mongodb-host:27017/abc_dashboard \
  -e JWT_SECRET=your-production-secret \
  abc-dashboard-backend
```

**Production Setup**:

- Update `JWT_SECRET` in docker-compose.yml
- Configure production MongoDB/Redis URLs
- Set up proper logging and monitoring
- Use secrets management for sensitive data

## Contributing

1. Fork the repository
2. Create feature branch
3. Run `npm run lint:fix` and `npm test`
4. Open a Pull Request

## Support

- [API Documentation](http://localhost:5000/api-docs)
- Server logs with correlation IDs

---

**v1.0.0** | ISC License
