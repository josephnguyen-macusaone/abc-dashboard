# ABC Dashboard API Documentation

## Overview

The ABC Dashboard API provides comprehensive license management functionality including CRUD operations, lifecycle management, analytics, and external API integration.

**Base URL:** `http://localhost:5000/api/v1`

**Authentication:** Bearer Token (JWT)

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    },
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

## License Management

### Core CRUD Operations

#### List Licenses

```http
GET /licenses?page=1&limit=10&status=active&dba=Business&sortBy=created_at&sortOrder=desc
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 10, max: 100): Items per page
- `status` (string): Filter by status
- `dba` (string): Filter by business name (case-insensitive partial match)
- `license_type` (string): Filter by license type
- `startDate` (string): Filter licenses starting from date (ISO format)
- `endDate` (string): Filter licenses ending before date (ISO format)
- `sortBy` (string): Sort field (created_at, expires_at, etc.)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "message": "Licenses retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "key": "LIC-001",
      "product": "Software Product",
      "plan": "Basic",
      "status": "active",
      "term": "monthly",
      "seatsTotal": 10,
      "seatsUsed": 5,
      "startsAt": "2026-01-01T00:00:00.000Z",
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "utilizationPercent": 50,
      "availableSeats": 5,
      "isActive": true,
      "isExpired": false,
      "isExpiringSoon": false
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get License by ID

```http
GET /licenses/{id}
Authorization: Bearer <token>
```

**Response:** Single license object as shown above.

#### Create License

```http
POST /licenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "key": "LIC-001",
  "product": "Software Product",
  "plan": "Basic",
  "status": "active",
  "term": "monthly",
  "seatsTotal": 10,
  "startsAt": "2026-01-01T00:00:00Z",
  "expiresAt": "2026-12-31T23:59:59Z",
  "dba": "Business Name",
  "zip": "12345",
  "emailLicense": "license@example.com",
  "pass": "password123"
}
```

#### Update License

```http
PUT /licenses/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "suspended",
  "notes": "Updated license details"
}
```

#### Delete License (Soft Delete)

```http
DELETE /licenses/{id}
Authorization: Bearer <token>
```

### License Operations by Identifier

#### Get License by Email

```http
GET /licenses/email/{email}
Authorization: Bearer <token>
```

#### Update License by Email

```http
PUT /licenses/email/{email}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active",
  "seatsTotal": 20
}
```

#### Delete License by Email

```http
DELETE /licenses/email/{email}
Authorization: Bearer <token>
```

#### Get License by Count ID

```http
GET /licenses/countid/{countid}
Authorization: Bearer <token>
```

#### Update License by Count ID

```http
PUT /licenses/countid/{countid}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "expired",
  "suspensionReason": "Non-payment"
}
```

### Bulk Operations

#### Bulk Update Licenses

```http
PATCH /licenses/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "identifiers": {
    "appids": ["APP001", "APP002"],
    "emails": ["license1@example.com"],
    "countids": [123, 456]
  },
  "updates": {
    "status": "suspended",
    "suspensionReason": "Account suspended"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk update completed",
  "data": {
    "updated": 3,
    "failed": 0,
    "results": [...]
  }
}
```

#### Bulk Create Licenses

```http
POST /licenses/bulk
Authorization: Bearer <token>
Content-Type: application/json

[
  {
    "key": "LIC-001",
    "product": "Product A",
    "plan": "Basic",
    "seatsTotal": 10,
    "expiresAt": "2026-12-31T23:59:59Z",
    "dba": "Business A",
    "emailLicense": "license@example.com"
  },
  {
    "key": "LIC-002",
    "product": "Product B",
    "plan": "Premium",
    "seatsTotal": 25,
    "expiresAt": "2026-12-31T23:59:59Z",
    "dba": "Business B",
    "emailLicense": "license2@example.com"
  }
]
```

#### Bulk Delete Licenses

```http
DELETE /licenses/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "identifiers": {
    "appids": ["APP001"],
    "emails": ["license@example.com"],
    "countids": [123]
  }
}
```

### License Analytics

#### Get License Analytics

```http
GET /licenses/license-analytic?month=1&year=2026&startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer <token>
```

**Query Parameters:**
- `month` (integer, 1-12): Filter by month
- `year` (integer): Filter by year
- `startDate` (string): Start date filter (ISO format)
- `endDate` (string): End date filter (ISO format)
- `status` (string): Filter by license status
- `license_type` (string): Filter by license type

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLicenses": 150,
    "activeLicenses": 120,
    "expiredLicenses": 15,
    "suspendedLicenses": 15,
    "utilizationRate": 75.5,
    "expiringSoonCount": 8,
    "monthlyBreakdown": [...],
    "statusDistribution": {
      "active": 120,
      "expired": 15,
      "suspended": 15
    }
  }
}
```

### Dashboard Metrics

#### Get Dashboard Overview

```http
GET /licenses/dashboard/metrics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "overview": {
        "total": 150,
        "active": 120,
        "expired": 15,
        "expiringSoon": 8
      },
      "utilization": {
        "totalSeats": 1500,
        "usedSeats": 1125,
        "availableSeats": 375,
        "utilizationRate": 75.0
      },
      "alerts": {
        "expiringSoon": [
          {
            "id": "uuid",
            "key": "LIC-001",
            "expiresAt": "2026-01-25T23:59:59.000Z",
            "daysUntilExpiry": 5
          }
        ],
        "lowSeats": []
      }
    }
  }
}
```

## License Lifecycle Management

### ⚠️ Note: Some lifecycle endpoints may have routing issues and need further debugging

#### Renew License

```http
POST /licenses/{id}/renew
Authorization: Bearer <token>
Content-Type: application/json

{
  "newExpirationDate": "2027-01-01T00:00:00Z",
  "extensionDays": 365,
  "reason": "Annual renewal"
}
```

#### Get Renewal Preview

```http
GET /licenses/{id}/renew-preview?extensionDays=365
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentExpiration": "2026-01-01T00:00:00.000Z",
    "proposedExpiration": "2027-01-01T00:00:00.000Z",
    "extensionDays": 365,
    "costImpact": 0,
    "conflicts": []
  }
}
```

#### Extend License

```http
POST /licenses/{id}/extend
Authorization: Bearer <token>
Content-Type: application/json

{
  "extensionDays": 30,
  "reason": "Temporary extension"
}
```

#### Expire License

```http
POST /licenses/{id}/expire
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Manual expiration"
}
```

#### Get Expiration Preview

```http
GET /licenses/{id}/expire-preview
Authorization: Bearer <token>
```

#### Reactivate License

```http
POST /licenses/{id}/reactivate
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Payment received"
}
```

#### Get License Lifecycle Status

```http
GET /licenses/{id}/lifecycle-status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "licenseId": "uuid",
    "status": "active",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "isExpired": false,
    "isExpiringSoon": false,
    "daysUntilExpiry": 365,
    "gracePeriodDays": 30,
    "autoSuspendEnabled": false,
    "renewalRemindersSent": [],
    "lastRenewalReminder": null
  }
}
```

### Bulk Lifecycle Operations

#### Bulk Renew Licenses

```http
POST /licenses/lifecycle/bulk-renew
Authorization: Bearer <token>
Content-Type: application/json

{
  "licenseIds": ["uuid1", "uuid2"],
  "extensionDays": 365,
  "reason": "Bulk annual renewal"
}
```

#### Bulk Expire Licenses

```http
POST /licenses/lifecycle/bulk-expire
Authorization: Bearer <token>
Content-Type: application/json

{
  "licenseIds": ["uuid1", "uuid2"],
  "reason": "Bulk expiration"
}
```

#### Process Lifecycle Operations

```http
POST /licenses/lifecycle/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "operation": "expiring_reminders"
}
```

Operations:
- `expiring_reminders`: Send renewal reminders for expiring licenses
- `expiration_checks`: Process expired licenses for auto-suspension

## External License API Integration

### Get External Licenses

```http
GET /external-licenses?page=1&limit=10&status=active&dba=Business
X-API-Key: your-external-api-key
```

**Headers:**
- `X-API-Key`: External API key for authentication

**Response:** Same format as internal license API.

### Sync External Licenses

The system automatically syncs external licenses in the background. Manual sync can be triggered through:

```http
POST /license-sync/sync
Authorization: Bearer <token>
```

## SMS Payment Management

### Get SMS Payments

```http
GET /external-licenses/sms-payments?appid=APP001&startDate=2026-01-01&endDate=2026-01-31
X-API-Key: your-external-api-key
```

### Add SMS Payment

```http
POST /external-licenses/add-sms-payment
X-API-Key: your-external-api-key
Content-Type: application/json

{
  "appid": "APP001",
  "amount": 50.00,
  "paymentDate": "2026-01-15T00:00:00Z",
  "description": "SMS credit purchase"
}
```

## Health Monitoring

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "score": 100,
  "database": {
    "connected": true
  },
  "cache": {
    "connected": true
  },
  "application": {
    "activeUsers": 1,
    "endpointCount": 25
  }
}
```

## Error Responses

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Validation failed",
    "category": "validation",
    "details": "correlation-id"
  }
}
```

### Common Error Codes

- `400` - Validation Failed: Invalid input data
- `401` - Token Missing/Invalid: Authentication required
- `403` - Insufficient Permissions: User lacks required permissions
- `404` - Resource Not Found: Requested resource doesn't exist
- `409` - Resource Already Exists: Duplicate resource
- `500` - Internal Server Error: Unexpected server error

## Rate Limiting

API endpoints are protected by rate limiting:
- General: 100 requests per minute
- Auth endpoints: 5 requests per minute
- Bulk operations: 10 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Data Types

### License Status Values
- `active`: License is active and usable
- `expired`: License has expired
- `suspended`: License is temporarily suspended
- `revoked`: License has been permanently revoked
- `cancel`: License has been cancelled

### License Terms
- `monthly`: Monthly subscription
- `yearly`: Yearly subscription
- `lifetime`: Perpetual license
- `trial`: Trial period

### User Roles
- `admin`: Full system access
- `manager`: Department management access
- `staff`: Limited access to assigned resources

## SDKs and Client Libraries

### JavaScript/TypeScript Client

```javascript
import { LicenseAPI } from '@abc-dashboard/api-client';

const client = new LicenseAPI({
  baseURL: 'http://localhost:5000/api/v1',
  token: 'your-jwt-token'
});

// Get licenses with pagination
const licenses = await client.licenses.list({
  page: 1,
  limit: 20,
  status: 'active'
});

// Create new license
const newLicense = await client.licenses.create({
  key: 'LIC-001',
  product: 'Software Product',
  plan: 'Basic',
  seatsTotal: 10,
  expiresAt: '2026-12-31T23:59:59Z',
  dba: 'Business Name',
  emailLicense: 'license@example.com'
});
```

## Webhooks and Events

The system supports webhook notifications for license lifecycle events:

- `license.created`
- `license.updated`
- `license.expired`
- `license.renewed`
- `license.suspended`
- `license.reactivated`

Webhook configuration available in system settings.

## Support and Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure JWT token is valid and not expired
2. **Permission Errors**: Check user role and permissions
3. **Rate Limiting**: Wait for rate limit reset or upgrade plan
4. **Validation Errors**: Check required fields and data formats

### Getting Help

- API Documentation: `http://localhost:5000/api-docs`
- Health Check: `http://localhost:5000/api/v1/health`
- Logs: Check server logs for detailed error information

---

**Version:** 1.0.0
**Last Updated:** January 21, 2026
**Contact:** support@abc-dashboard.com