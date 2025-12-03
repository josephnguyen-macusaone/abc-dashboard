# API Endpoints

This document provides comprehensive documentation of the ABC Dashboard REST API endpoints, including request/response formats, authentication requirements, and sequence diagrams for key flows.

## API Overview

```mermaid
graph TD
    subgraph "API Structure"
        Base[/api/v1/]
        Auth[auth/]
        Users[users/]
        Profile[profile/]
    end

    subgraph "Authentication Endpoints"
        Register[POST /register]
        Login[POST /login]
        Refresh[POST /refresh-token]
        Verify[GET /verify-email]
        ChangePwd[POST /change-password]
        ResetReq[POST /request-password-reset]
        ResetPwd[POST /reset-password]
        Logout[POST /logout]
    end

    subgraph "User Management Endpoints"
        GetUsers[GET /users]
        CreateUser[POST /users]
        GetUser[GET /users/:id]
        UpdateUser[PATCH /users/:id]
        DeleteUser[DELETE /users/:id]
        GetStats[GET /users/stats]
    end

    subgraph "Profile Endpoints"
        GetProfile[GET /profile]
        UpdateProfile[PATCH /profile]
    end

    Base --> Auth
    Base --> Users
    Base --> Profile

    Auth --> Register
    Auth --> Login
    Auth --> Refresh
    Auth --> Verify
    Auth --> ChangePwd
    Auth --> ResetReq
    Auth --> ResetPwd
    Auth --> Logout

    Users --> GetUsers
    Users --> CreateUser
    Users --> GetUser
    Users --> UpdateUser
    Users --> DeleteUser
    Users --> GetStats

    Profile --> GetProfile
    Profile --> UpdateProfile

    classDef auth fill:#e3f2fd,stroke:#1565c0
    classDef user fill:#e8f5e8,stroke:#2e7d32
    classDef profile fill:#fff3e0,stroke:#ef6c00

    class Auth,Register,Login,Refresh,Verify,ChangePwd,ResetReq,ResetPwd,Logout auth
    class Users,GetUsers,CreateUser,GetUser,UpdateUser,DeleteUser,GetStats user
    class Profile,GetProfile,UpdateProfile profile
```

## Authentication Endpoints

### User Registration Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthController
    participant RegisterUseCase
    participant EmailService

    Client->>API: POST /api/v1/auth/register
    API->>AuthController: register(req, res)
    AuthController->>RegisterUseCase: execute(input)

    RegisterUseCase->>RegisterUseCase: validate input
    RegisterUseCase->>RegisterUseCase: hash password
    RegisterUseCase->>RegisterUseCase: create user entity
    RegisterUseCase->>RegisterUseCase: save to database
    RegisterUseCase->>EmailService: send verification email

    EmailService-->>RegisterUseCase: email sent
    RegisterUseCase-->>AuthController: success result
    AuthController-->>API: 201 Created + user data
    API-->>Client: 201 Created + user data
```

#### POST /api/v1/auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "role": "staff"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "user_123",
      "username": "johndoe",
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "staff",
      "isActive": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Validation Rules:**

- Email: Required, valid format, unique
- Password: 8+ chars, uppercase, lowercase, number
- First/Last Name: Required, 2-50 chars each
- Username: Optional, 3-30 chars, alphanumeric + underscore, unique
- Role: Optional, defaults to "staff" (admin, manager, staff)

### User Login Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthController
    participant LoginUseCase
    participant TokenService

    Client->>API: POST /api/v1/auth/login
    API->>AuthController: login(req, res)
    AuthController->>LoginUseCase: execute({email, password})

    LoginUseCase->>LoginUseCase: find user by email
    LoginUseCase->>LoginUseCase: verify password
    LoginUseCase->>LoginUseCase: check account active
    LoginUseCase->>TokenService: generate access token
    LoginUseCase->>TokenService: generate refresh token

    TokenService-->>LoginUseCase: tokens
    LoginUseCase-->>AuthController: login result
    AuthController-->>API: 200 OK + user & tokens
    API-->>Client: 200 OK + user & tokens
```

#### POST /api/v1/auth/login

Authenticate user and return access/refresh tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_123",
      "username": "johndoe",
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "staff",
      "avatarUrl": null,
      "phone": null,
      "isActive": true,
      "isFirstLogin": false,
      "langKey": "en"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    },
    "requiresPasswordChange": false
  }
}
```

### Token Refresh Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant RefreshUseCase
    participant TokenService

    Client->>API: POST /api/v1/auth/refresh-token
    API->>RefreshUseCase: execute({refreshToken})
    RefreshUseCase->>TokenService: verify refresh token
    TokenService-->>RefreshUseCase: decoded payload
    RefreshUseCase->>RefreshUseCase: find user
    RefreshUseCase->>TokenService: generate new access token
    TokenService-->>RefreshUseCase: new access token
    RefreshUseCase-->>API: new tokens
    API-->>Client: 200 OK + new tokens
```

#### POST /api/v1/auth/refresh-token

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### Email Verification Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant VerifyEmailUseCase
    participant UserRepository

    Client->>API: GET /api/v1/auth/verify-email?token=abc123
    API->>VerifyEmailUseCase: execute({token})
    VerifyEmailUseCase->>VerifyEmailUseCase: verify token
    VerifyEmailUseCase->>UserRepository: find user by verification token
    UserRepository-->>VerifyEmailUseCase: user
    VerifyEmailUseCase->>VerifyEmailUseCase: activate user account
    VerifyEmailUseCase->>UserRepository: update user
    VerifyEmailUseCase-->>API: verification result
    API-->>Client: 200 OK + success message
```

#### GET /api/v1/auth/verify-email

Verify user email using token from registration email.

**Query Parameters:**

- `token` (string, required): Verification token from email

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in to your account.",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "isActive": true
    }
  }
}
```

## User Management Endpoints

### Get Users with Pagination

#### GET /api/v1/users

Retrieve paginated list of users with optional filtering.

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `role` (string, optional): Filter by role (admin, manager, staff)
- `search` (string, optional): Search in display name, username, email
- `sortBy` (string, optional): Sort field (default: createdAt)
- `sortOrder` (string, optional): Sort order (asc, desc, default: desc)

**Authentication:** Required (Admin/Manager only)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "user_123",
        "username": "johndoe",
        "email": "john@example.com",
        "displayName": "John Doe",
        "role": "staff",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastModifiedBy": "admin_user"
      }
    ],
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

### Create User

#### POST /api/v1/users

Create a new user (Admin only operation).

**Authentication:** Required (Admin only)

**Request Body:**

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "TempPass123",
  "displayName": "New User",
  "role": "staff",
  "phone": "+1234567890",
  "langKey": "en"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "user_456",
      "username": "newuser",
      "email": "newuser@example.com",
      "displayName": "New User",
      "role": "staff",
      "isActive": true,
      "createdBy": "admin_user",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### User Profile Endpoints

#### GET /api/v1/profile

Get current user's profile information.

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "profile": {
      "id": "profile_123",
      "userId": "user_123",
      "bio": "Software developer passionate about clean code",
      "emailVerified": true,
      "lastLoginAt": "2024-01-01T10:30:00.000Z",
      "lastActivityAt": "2024-01-01T10:45:00.000Z",
      "emailVerifiedAt": "2024-01-01T09:00:00.000Z",
      "createdAt": "2024-01-01T08:00:00.000Z",
      "updatedAt": "2024-01-01T10:30:00.000Z"
    }
  }
}
```

#### PATCH /api/v1/profile

Update current user's profile.

**Authentication:** Required

**Request Body:**

```json
{
  "displayName": "Updated Name",
  "bio": "Updated bio",
  "phone": "+1987654321",
  "langKey": "es"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profile": {
      "id": "profile_123",
      "userId": "user_123",
      "bio": "Updated bio",
      "emailVerified": true,
      "displayName": "Updated Name",
      "phone": "+1987654321",
      "langKey": "es",
      "updatedAt": "2024-01-01T11:00:00.000Z"
    }
  }
}
```

## Password Management

### Change Password Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant ChangePasswordUseCase
    participant AuthService
    participant EmailService

    Client->>API: POST /api/v1/auth/change-password
    API->>ChangePasswordUseCase: execute(input)
    ChangePasswordUseCase->>ChangePasswordUseCase: validate current password
    ChangePasswordUseCase->>AuthService: hash new password
    ChangePasswordUseCase->>ChangePasswordUseCase: update user password
    ChangePasswordUseCase->>EmailService: send password changed notification
    ChangePasswordUseCase-->>API: success
    API-->>Client: 200 OK
```

#### POST /api/v1/auth/change-password

Change current user's password.

**Authentication:** Required

**Request Body:**

```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass123"
}
```

### Password Reset Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant RequestResetUseCase
    participant EmailService

    Client->>API: POST /api/v1/auth/request-password-reset
    API->>RequestResetUseCase: execute({email})
    RequestResetUseCase->>RequestResetUseCase: find user by email
    RequestResetUseCase->>RequestResetUseCase: generate reset token
    RequestResetUseCase->>RequestResetUseCase: save reset token
    RequestResetUseCase->>EmailService: send reset email
    RequestResetUseCase-->>API: success
    API-->>Client: 200 OK

    Note over Client,API: User receives email with reset link

    Client->>API: POST /api/v1/auth/reset-password
    API->>ResetPasswordUseCase: execute({token, newPassword})
    ResetPasswordUseCase->>ResetPasswordUseCase: verify token
    ResetPasswordUseCase->>ResetPasswordUseCase: update password
    ResetPasswordUseCase-->>API: success
    API-->>Client: 200 OK
```

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": 400,
    "message": "Detailed error message",
    "category": "VALIDATION",
    "details": {
      "field": "specific field error"
    }
  },
  "correlationId": "req_123456"
}
```

## Common HTTP Status Codes

| Code | Meaning               | Common Usage                                       |
| ---- | --------------------- | -------------------------------------------------- |
| 200  | OK                    | Successful GET/PUT/POST operations                 |
| 201  | Created               | Resource creation (registration, user creation)    |
| 204  | No Content            | Successful DELETE operations                       |
| 400  | Bad Request           | Validation errors, malformed requests              |
| 401  | Unauthorized          | Missing/invalid authentication                     |
| 403  | Forbidden             | Insufficient permissions                           |
| 404  | Not Found             | Resource not found                                 |
| 409  | Conflict              | Resource already exists (duplicate email/username) |
| 422  | Unprocessable Entity  | Business rule violations                           |
| 429  | Too Many Requests     | Rate limit exceeded                                |
| 500  | Internal Server Error | Server errors                                      |

## Authentication & Authorization

### Authentication Methods

1. **Bearer Token**: `Authorization: Bearer <access_token>`
2. **Cookie**: `accessToken` and `refreshToken` cookies
3. **Optional Auth**: Some endpoints allow unauthenticated access

### Role-Based Access Control

| Role        | Permissions                                              |
| ----------- | -------------------------------------------------------- |
| **admin**   | Full access to all endpoints and users                   |
| **manager** | User management, profile access, limited admin functions |
| **staff**   | Profile management, own user data access                 |

### Authorization Headers

```javascript
// Example authenticated request
fetch('/api/v1/users', {
  method: 'GET',
  headers: {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIs...',
    'Content-Type': 'application/json',
  },
});
```

## Rate Limiting

API endpoints are protected by rate limiting:

- **General**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per minute per IP
- **Password reset**: 3 requests per hour per email

Rate limit headers are included in responses:

```txt
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Content Types

- **Request**: `application/json`
- **Response**: `application/json`
- **File Uploads**: `multipart/form-data` (future feature)

## CORS Configuration

- **Development**: Allows all localhost ports
- **Production**: Restricted to configured client URL
- **Credentials**: Enabled for cookie-based auth

## API Versioning

Current API version: **v1**

- Base path: `/api/v1/`
- Version specified in URL path
- Breaking changes will introduce new versions
- Old versions maintained for backwards compatibility
