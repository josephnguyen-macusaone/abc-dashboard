# ABC Dashboard - Development Environment

This directory contains the Docker Compose configuration for the ABC Dashboard development environment.

## Quick Start

1. **Start the development environment:**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Seed the database with test data:**

   ```bash
   ./seed-db.sh
   ```

3. **Access the applications:**
   - **Frontend:** <http://localhost:3000>
   - **Backend API:** <http://localhost:5000>
   - **API Documentation:** <http://localhost:5000/api-docs>
   - **MailHog (Email Testing):** <http://localhost:8025>

## Services

- **MongoDB** (port 27017) - Database
- **Redis** (port 6379) - Cache
- **Backend** (port 5000) - API server with hot reload
- **Frontend** (port 3000) - Next.js app with hot reload
- **MailHog** (ports 1025/8025) - Email testing tool

## Database Seeding

The `./seed-db.sh` script populates the database with a hierarchical user management system:

### User Accounts Created

#### 👑 Administrator

- **Email:** `admin@example.com`
- **Password:** `Admin123!`
- **Role:** System Admin (full access)

#### 👨‍💼 Department Managers

- **HR Manager:** `hr.manager@example.com` / `Manager123!`
- **Sales Manager:** `sales.manager@example.com` / `Manager123!`
- **Technical Manager:** `tech.manager@example.com` / `Manager123!`

#### 👥 Staff Members (7 total)

**HR Department** (managed by HR Manager):

- `hr.staff1@example.com` - HR Specialist
- `hr.staff2@example.com` - HR Coordinator

**Sales Department** (managed by Sales Manager):

- `sales.staff1@example.com` - Sales Representative
- `sales.staff2@example.com` - Sales Associate

**Technical Department** (managed by Technical Manager):

- `tech.staff1@example.com` - Software Developer
- `tech.staff2@example.com` - DevOps Engineer
- `tech.staff3@example.com` - QA Tester

### All Staff Passwords

- **Managers:** `Manager123!`
- **Staff:** `Staff123!`

## Development Workflow

1. **Start services:** `docker-compose -f docker-compose.dev.yml up -d`
2. **Seed database:** `./seed-db.sh` (only needed once, or after resetting DB)
3. **Develop:** Code changes are hot-reloaded automatically
4. **Test emails:** Use MailHog at <http://localhost:8025>
5. **Stop services:** `docker-compose -f docker-compose.dev.yml down`

## Troubleshooting

### Port Conflicts

If you get port binding errors, check what's using the ports:

```bash
lsof -i :5000  # Backend port
lsof -i :3000  # Frontend port
lsof -i :27017 # MongoDB port
```

### Reset Database

To completely reset the database:

```bash
# Stop services
docker-compose -f docker-compose.dev.yml down

# Remove database volumes
docker volume rm abc-dashboard_mongodb_data abc-dashboard_redis_data

# Restart and reseed
docker-compose -f docker-compose.dev.yml up -d
./seed-db.sh
```

### Manual Seeding

If the script doesn't work, you can seed manually:

```bash
docker exec abc-dashboard-backend-dev npm run seed
```
