# License Management System Documentation

## Overview

The ABC Dashboard implements a comprehensive **dual-license management system** that seamlessly integrates internal license management with external license synchronization. This system provides complete license lifecycle management while maintaining data integrity and business continuity.

## 🔧 Recent Critical Fixes (v2.1.0)

### Data Integrity Protection
**Issue**: System was returning external API data instead of internal database results, causing incorrect pagination and totals.

**Root Cause**: Automatic fallback to external API when internal database queries returned empty results.

**Fix Applied**:
- ✅ **Data Source Priority Enforcement**: Internal database is now ALWAYS prioritized over external API
- ✅ **Repository-Level Guards**: Added validation to prevent external API data contamination
- ✅ **Controller Validation**: Added runtime checks for data integrity violations
- ✅ **Comprehensive Logging**: Added tracing throughout the data flow pipeline
- ✅ **Auto-Correction**: Automatic correction of contaminated data for filtered queries

### Sync Process Improvements
**Enhancements**:
- ✅ **Error Recovery**: Added automatic recovery for network timeouts and API failures
- ✅ **Adaptive Batching**: Dynamic batch size adjustment based on workload
- ✅ **Health Monitoring**: Enhanced monitoring of sync operations
- ✅ **Circuit Breaker**: Protection against cascading failures

### Monitoring & Alerting
**New Features**:
- ✅ **Data Integrity Alerts**: Automatic detection and alerting for data contamination
- ✅ **Metrics Endpoint**: `/api/v1/licenses/data-integrity` for monitoring metrics
- ✅ **Violation Tracking**: Detailed logging of integrity violations by severity
- ✅ **Performance Monitoring**: Enhanced metrics for all license operations

## Documentation Structure

### 📁 [Overview](./README.md)
- System architecture and components
- Key features and capabilities
- Data flow diagrams
- Performance characteristics

### 📁 [APIs](./apis/)
- Complete API reference
- Request/response formats
- Authentication and authorization
- Rate limiting and error handling
- Performance benchmarks

### 📁 [Caching](./caching/)
- Cache architecture and implementation
- TTL strategies and invalidation patterns
- Performance characteristics
- Memory management and monitoring

### 📁 [Synchronization](./synchronization/)
- External sync strategies and approaches
- Intelligent matching algorithms
- Error handling and recovery
- Performance optimization
- Troubleshooting guide

### 📁 [Monitoring](./monitoring/)
- Metrics collection and alerting
- Health checks and dashboards
- Performance monitoring
- Logging and troubleshooting

## Quick Start

### System Architecture
```mermaid
graph TB
    UI[Frontend] --> API[License API]
    API --> CONTROLLER[Controllers]
    CONTROLLER --> USE_CASE[Use Cases]
    USE_CASE --> REPO[Repositories]
    USE_CASE --> CACHE[Cache Service]
    REPO --> DB[(Database)]
    USE_CASE --> EXT_API[External API Service]
    EXT_API --> EXT_DB[(External DB)]
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/licenses` | List licenses with pagination (unified internal + external data) |
| POST | `/licenses` | Create new license |
| PUT | `/licenses/:id` | Update existing license |
| DELETE | `/licenses/:id` | Delete license |
| POST | `/external-licenses/sync` | Sync with external system + duplicate detection |
| GET | `/licenses/dashboard/metrics` | Get dashboard metrics |

### Cache Strategy

- **License Lists**: 5-minute TTL with filter-based keys
- **Individual Licenses**: 5-minute TTL with ID-based keys
- **Statistics**: 15-minute TTL with automatic invalidation
- **Pattern Clearing**: Automatic cache invalidation on data changes

### Sync Features

- **Comprehensive Reconciliation**: Identifies all data gaps
- **Intelligent Matching**: Multi-criteria license matching
- **Bidirectional Sync**: Two-way data synchronization
- **Batch Processing**: Adaptive concurrency for performance

## Performance Characteristics

| Component | Response Time | Cache Hit Rate | Availability |
|-----------|---------------|----------------|--------------|
| License List API | <200ms (cached) | 85-95% | 99.9% |
| Individual License API | <100ms (cached) | 90-98% | 99.9% |
| Dashboard Metrics | <1s | 95-99% | 99.9% |
| External Sync | 30-120s | N/A | 99.5% |

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/license_db

# External API
EXTERNAL_LICENSE_API_URL=https://api.external-system.com
EXTERNAL_LICENSE_API_KEY=your-api-key

# Cache (optional)
REDIS_URL=redis://localhost:6379

# Monitoring
PROMETHEUS_ENABLED=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/...
```

### Key Configuration Files

- `config/license-sync-config.js` - Sync behavior settings
- `config/cache-service.js` - Cache configuration
- `config/monitoring.js` - Monitoring and alerting
- `config/database.js` - Database connection settings

## Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository>
   cd backend
   npm install
   ```

2. **Set up database**
   ```bash
   npm run migrate
   npm run seed
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Run initial sync**
   ```bash
   curl -X POST http://localhost:5001/api/v1/external-licenses/sync \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Monitoring & Health Checks

### Health Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status
- `GET /external-licenses/sync/status` - Sync operation status

### Key Metrics to Monitor

- **Cache Hit Rate**: Should be >80%
- **Sync Success Rate**: Should be >95%
- **API Response Time**: Should be <2s (p95)
- **Error Rate**: Should be <1%

### Alert Conditions

- External API unreachable for >5 minutes
- Sync failure rate >10%
- Cache hit rate <80% for >15 minutes
- Memory usage >85%

## Troubleshooting

### Common Issues

1. **Sync Failures**
   - Check external API connectivity
   - Verify API credentials
   - Review sync logs for error details

2. **Performance Issues**
   - Check cache hit rates
   - Monitor database query performance
   - Review memory usage

3. **Data Inconsistencies**
   - Run comprehensive sync reconciliation
   - Check data mapping configurations
   - Review conflict resolution logs

### Debug Commands

```bash
# Test external API connectivity
curl -H "x-api-key: YOUR_KEY" "https://external-api.com/api/v1/licenses?page=1&limit=1"

# Check cache statistics
curl http://localhost:5001/debug/cache/stats

# View sync status
curl http://localhost:5001/api/v1/external-licenses/sync/status

# Force cache clear (development only)
curl http://localhost:5001/debug/cache/clear
```

## Security Considerations

- **API Authentication**: Bearer token required for all endpoints
- **Rate Limiting**: Configurable limits on API usage
- **Data Encryption**: Sensitive data encrypted in transit and at rest
- **Audit Logging**: Complete operation tracking with user attribution
- **Field-Level Permissions**: Granular access control for sensitive data

## Contributing

### Code Organization

```
backend/src/
├── application/          # Use cases and business logic
├── domain/              # Entities and business rules
├── infrastructure/      # Controllers, routes, repositories
├── shared/              # Common services and utilities
└── docs/                # Documentation
```

### Development Guidelines

- Use TypeScript interfaces for type safety
- Implement comprehensive error handling
- Add unit and integration tests
- Follow established caching patterns
- Document API changes in OpenAPI spec

### Testing

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run all tests
npm run test

# Run with coverage
npm run test:coverage
```

## Support & Resources

### Documentation Links

- [API Documentation](./apis/README.md)
- [Caching Guide](./caching/README.md)
- [Sync Manual](./synchronization/README.md)
- [Monitoring Guide](./monitoring/README.md)

### Additional Resources

- [Architecture Overview](../../docs/architecture/)
- [Database Schema](../../docs/database/)
- [Deployment Guide](../../docs/operations/deployment-guide.md)
- [Security Audit](../../docs/security-audit-report.md)

---

This documentation provides comprehensive coverage of the license management system. For specific implementation details, refer to the individual section documentation.