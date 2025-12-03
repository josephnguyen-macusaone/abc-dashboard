# API Reference Documentation

Complete API documentation for the ABC Dashboard Backend, including endpoints, request/response formats, and interactive documentation.

## 📚 API Documentation

| Document/Resource                           | Description                               | Format   |
| ------------------------------------------- | ----------------------------------------- | -------- |
| **[Interactive API Docs](./index.html)**    | Swagger/ReDoc interactive documentation   | HTML     |
| **[API Endpoints](./api-endpoints.md)**     | Complete endpoint reference with examples | Markdown |
| **[OpenAPI Specification](./openapi.json)** | Machine-readable API specification        | JSON     |

## 🚀 API Overview

- **Base URL**: `http://localhost:5000/api/v1`
- **Authentication**: JWT Bearer tokens
- **Content Type**: `application/json`
- **Rate Limiting**: 100 requests per minute per IP

## 🔑 Authentication

All API endpoints (except authentication endpoints) require a valid JWT token:

```txt
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

| Method | Endpoint                       | Description            |
| ------ | ------------------------------ | ---------------------- |
| POST   | `/auth/register`               | User registration      |
| POST   | `/auth/login`                  | User login             |
| POST   | `/auth/refresh-token`          | Refresh access token   |
| GET    | `/auth/verify-email`           | Email verification     |
| POST   | `/auth/change-password`        | Change password        |
| POST   | `/auth/request-password-reset` | Request password reset |
| POST   | `/auth/reset-password`         | Reset password         |
| POST   | `/auth/logout`                 | User logout            |

## 👥 User Management Endpoints

| Method | Endpoint       | Description      | Roles          |
| ------ | -------------- | ---------------- | -------------- |
| GET    | `/users`       | List users       | admin, manager |
| POST   | `/users`       | Create user      | admin, manager |
| GET    | `/users/:id`   | Get user details | admin, manager |
| PATCH  | `/users/:id`   | Update user      | admin, manager |
| DELETE | `/users/:id`   | Delete user      | admin          |
| GET    | `/users/stats` | User statistics  | admin, manager |

## 👤 Profile Endpoints

| Method | Endpoint   | Description         | Roles |
| ------ | ---------- | ------------------- | ----- |
| GET    | `/profile` | Get user profile    | all   |
| PATCH  | `/profile` | Update user profile | all   |

## 🏥 Health & Monitoring

| Method | Endpoint        | Description          |
| ------ | --------------- | -------------------- |
| GET    | `/health`       | System health check  |
| GET    | `/health/email` | Email service health |

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## 🔗 Related Documentation

- [Getting Started](../getting-started/README.md) - Quick start guide
- [Architecture](../architecture/README.md) - System design
- [Operations](../operations/README.md) - Deployment and operations
- [Guides](../guides/README.md) - Specific setup guides

## 🛠️ Development

### Local Development

- API URL: `http://localhost:5000`
- Interactive Docs: `http://localhost:5000/api-docs`
- Health Check: `http://localhost:5000/api/v1/health`

### Test Accounts

```txt
Admin: admin@example.com / Admin123!
Manager: manager@example.com / Manager123!
Staff: staff@example.com / Staff123!
```
