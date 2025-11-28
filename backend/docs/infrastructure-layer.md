# Infrastructure Layer

The Infrastructure Layer handles external concerns including HTTP communication, data persistence, external services, and cross-cutting concerns. It implements the interfaces defined by the Application and Domain layers.

## HTTP Layer Architecture

### Controllers Overview

Controllers handle HTTP requests and responses, acting as adapters between the web framework and use cases.

```mermaid
classDiagram
    class BaseController {
        <<abstract>>
        +executeUseCase(useCase, input): Promise~Result~
        +handleSuccess(res, data, message?, status?): void
        +handleError(error, req, res): void
        +getPaginationData(req): Object
    }

    BaseController <|-- AuthController
    BaseController <|-- UserController
    BaseController <|-- ProfileController

    class AuthController {
        +loginUseCase
        +registerUseCase
        +refreshTokenUseCase
        +verifyEmailUseCase
        +changePasswordUseCase
        +requestPasswordResetUseCase
        +resetPasswordUseCase

        +register(req, res)
        +login(req, res)
        +refreshToken(req, res)
        +verifyEmail(req, res)
        +changePassword(req, res)
        +requestPasswordReset(req, res)
        +resetPassword(req, res)
    }

    class UserController {
        +getUsersUseCase
        +createUserUseCase
        +updateUserUseCase
        +deleteUserUseCase
        +getUserStatsUseCase

        +getUsers(req, res)
        +createUser(req, res)
        +updateUser(req, res)
        +deleteUser(req, res)
        +getStats(req, res)
    }

    class ProfileController {
        +getProfileUseCase
        +updateProfileUseCase
        +recordLoginUseCase

        +getProfile(req, res)
        +updateProfile(req, res)
    }
```

### Controller Pattern

Controllers follow a consistent pattern for handling requests:

```javascript
class AuthController extends BaseController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Input validation
      AuthValidator.validateLogin({ email, password });

      // Execute use case
      const result = await this.executeUseCase(
        this.loginUseCase,
        { email, password }
      );

      // Return success response
      this.handleSuccess(res, result, 'Login successful');
    } catch (error) {
      // Handle errors consistently
      this.handleError(error, req, res);
    }
  }
}
```

### Base Controller Features

```mermaid
classDiagram
    class BaseController {
        +executeUseCase(useCase, input): Promise
        +handleSuccess(res, data, message?, status?): void
        +handleError(error, req, res): void
        +getPaginationData(req): Object
    }

    BaseController --> UseCase : executes
    BaseController --> Response : formats
    BaseController --> Logger : logs errors

    class UseCase {
        +execute(input): Promise~Result~
    }

    class Response {
        +json(data): Response
        +status(code): Response
    }

    class Logger {
        +error(message, meta): void
        +warn(message, meta): void
    }
```

## Routing Architecture

### Route Organization

Routes are organized by feature and include middleware composition.

```mermaid
graph TD
    subgraph "Route Modules"
        AuthRoutes[auth-routes.js]
        UserRoutes[user-routes.js]
        ProfileRoutes[profile-routes.js]
    end

    subgraph "Middleware Stack"
        AuthM[Authentication]
        ValidationM[Validation]
        RateLimitM[Rate Limiting]
        CorsM[CORS]
        SecurityM[Security Headers]
    end

    subgraph "API Versions"
        V1Routes[v1/]
        V2Routes[v2/]:::future
    end

    AuthRoutes --> AuthM
    UserRoutes --> AuthM
    ProfileRoutes --> AuthM

    AuthRoutes --> ValidationM
    UserRoutes --> ValidationM
    ProfileRoutes --> ValidationM

    V1Routes --> AuthRoutes
    V1Routes --> UserRoutes
    V1Routes --> ProfileRoutes

    V1Routes --> RateLimitM
    V1Routes --> CorsM
    V1Routes --> SecurityM

    classDef future fill:#ffebee,stroke:#f44336
```

### Route Definitions

Routes combine HTTP methods, paths, middleware, and controller actions:

```javascript
export function createAuthRoutes(authController) {
  const router = express.Router();

  // POST /auth/register
  router.post(
    '/register',
    validateRequest(authSchemas.register),
    authController.register.bind(authController)
  );

  // POST /auth/login
  router.post(
    '/login',
    validateRequest(authSchemas.login),
    authController.login.bind(authController)
  );

  return router;
}
```

## Middleware Stack

### Security Middleware

```mermaid
graph TD
    A[HTTP Request] --> B[Helmet]
    B --> C[CORS]
    C --> D[Rate Limiting]
    D --> E[Request Size Limit]
    E --> F[Injection Protection]
    F --> G[Request Logging]
    G --> H[Correlation ID]
    H --> I[Authentication]
    I --> J[Authorization]
    J --> K[Controller]

    B --> L[Security Headers]
    D --> M[Rate Limit Headers]

    classDef security fill:#e8f5e8,stroke:#2e7d32
    classDef logging fill:#fff3e0,stroke:#ef6c00
    classDef auth fill:#e3f2fd,stroke:#1565c0

    class B,C,D,E,F security
    class G,H logging
    class I,J auth
```

### Authentication Middleware

```mermaid
sequenceDiagram
    participant Client
    participant AuthMiddleware
    participant TokenService
    participant UserRepository

    Client->>AuthMiddleware: Request with Bearer token
    AuthMiddleware->>AuthMiddleware: Extract token from header

    alt No token
        AuthMiddleware-->>Client: 401 Unauthorized
    end

    AuthMiddleware->>TokenService: verifyToken(token)
    TokenService-->>AuthMiddleware: decoded payload

    alt Invalid token
        AuthMiddleware-->>Client: 401 Unauthorized
    end

    AuthMiddleware->>UserRepository: findById(userId)
    UserRepository-->>AuthMiddleware: user entity

    alt User not found
        AuthMiddleware-->>Client: 401 Unauthorized
    end

    AuthMiddleware->>AuthMiddleware: Attach user to req.user
    AuthMiddleware-->>Client: Proceed to next middleware
```

### Authorization Middleware

```mermaid
classDiagram
    class AuthMiddleware {
        +authenticate(req, res, next)
        +authorizeSelf(req, res, next)
        +authorizeRole(roles)(req, res, next)
        +optionalAuth(req, res, next)
    }

    AuthMiddleware --> User : validates against
    AuthMiddleware --> ROLES : checks permissions

    class User {
        +String role
        +String id
    }

    class ROLES {
        +ADMIN
        +MANAGER
        +STAFF
    }
```

## Data Access Layer

### Repository Implementations

Infrastructure repositories implement domain interfaces using MongoDB/Mongoose.

```mermaid
classDiagram
    class IUserRepository {
        <<interface>>
        +findById(id)
        +findByEmail(email)
        +save(user)
        +update(id, updates)
        +delete(id)
    }

    class UserRepository {
        +UserModel
        +findById(id)
        +findByEmail(email)
        +save(user)
        +update(id, updates)
        +delete(id)
    }

    class IUserProfileRepository {
        <<interface>>
        +findByUserId(userId)
        +save(userProfile)
        +updateByUserId(userId, updates)
    }

    class UserProfileRepository {
        +UserProfileModel
        +findByUserId(userId)
        +save(userProfile)
        +updateByUserId(userId, updates)
    }

    IUserRepository <|.. UserRepository : implements
    IUserProfileRepository <|.. UserProfileRepository : implements

    UserRepository --> UserModel : uses
    UserProfileRepository --> UserProfileModel : uses
```

### MongoDB Models

Mongoose models define schema and provide query methods.

```javascript
// User Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  hashedPassword: { type: String, required: true },
  displayName: { type: String, required: true },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.STAFF
  },
  // ... other fields
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
```

## External Services

### Service Implementations

Infrastructure provides concrete implementations of service interfaces.

```mermaid
classDiagram
    class IAuthService {
        <<interface>>
        +hashPassword(password): Promise~string~
        +verifyPassword(password, hash): Promise~boolean~
    }

    class AuthService {
        +bcrypt
        +hashPassword(password): Promise~string~
        +verifyPassword(password, hash): Promise~boolean~
    }

    class ITokenService {
        <<interface>>
        +generateAccessToken(payload): string
        +verifyAccessToken(token): Object
    }

    class TokenService {
        +jwt
        +generateAccessToken(payload): string
        +verifyAccessToken(token): Object
    }

    class IEmailService {
        <<interface>>
        +sendVerificationEmail(email, token): Promise~void~
    }

    class EmailService {
        +nodemailer
        +sendVerificationEmail(email, token): Promise~void~
    }

    IAuthService <|.. AuthService : implements
    ITokenService <|.. TokenService : implements
    IEmailService <|.. EmailService : implements
```

### Email Service Flow

```mermaid
sequenceDiagram
    participant UseCase
    participant EmailService
    participant Nodemailer
    participant SMTP

    UseCase->>EmailService: sendVerificationEmail(email, token)
    EmailService->>EmailService: Build email template

    EmailService->>Nodemailer: createTransporter()
    Nodemailer->>EmailService: transporter

    EmailService->>Nodemailer: sendMail(options)
    Nodemailer->>SMTP: Send email
    SMTP-->>Nodemailer: Success/Failure

    Nodemailer-->>EmailService: Result
    EmailService-->>UseCase: Success/Error
```

## Configuration Management

### Environment Configuration

```mermaid
graph TD
    subgraph "Configuration Sources"
        EnvFile[.env files]
        EnvVars[Environment Variables]
        Defaults[Default Values]
    end

    subgraph "Config Modules"
        Database[database.js]
        Auth[auth.js]
        Email[email.js]
        App[config.js]
    end

    subgraph "Validation"
        Joi[Joi Schemas]
        Custom[Custom Validators]
    end

    EnvFile --> App
    EnvVars --> App
    Defaults --> App

    App --> Database
    App --> Auth
    App --> Email

    App --> Joi
    Joi --> Custom

    classDef source fill:#e8f5e8,stroke:#2e7d32
    classDef config fill:#e3f2fd,stroke:#1565c0
    classDef validation fill:#fff3e0,stroke:#ef6c00

    class EnvFile,EnvVars,Defaults source
    class Database,Auth,Email,App config
    class Joi,Custom validation
```

### Configuration Structure

```javascript
// config.js - Main configuration
export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  EMAIL_CONFIG: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },
  // ... other configs
};
```

## Error Handling

### Global Error Handler

```mermaid
graph TD
    A[Error Occurs] --> B{Error Type}
    B -->|Domain Exception| C[Domain Handler]
    B -->|Validation Error| D[Validation Handler]
    B -->|Infrastructure Error| E[Infrastructure Handler]
    B -->|Unexpected Error| F[Generic Handler]

    C --> G[Format Response]
    D --> G
    E --> G
    F --> G

    G --> H[Log Error]
    H --> I[Send Response]

    classDef error fill:#ffebee,stroke:#f44336
    classDef handler fill:#e8f5e8,stroke:#2e7d32

    class A,B error
    class C,D,E,F,G,H,I handler
```

### Error Response Format

```javascript
// Success Response
{
  "success": true,
  "message": "Operation successful",
  "data": { /* result data */ },
  "correlationId": "req_123456"
}

// Error Response
{
  "success": false,
  "message": "Email already exists",
  "error": {
    "code": 409,
    "message": "Email already exists",
    "category": "VALIDATION",
    "details": {
      "email": "user@example.com"
    }
  },
  "correlationId": "req_123456"
}
```

## Monitoring and Logging

### Request Monitoring

```mermaid
graph TD
    subgraph "Request Flow"
        A[Request Start] --> B[Monitor Middleware]
        B --> C[Correlation ID]
        C --> D[Request Logger]
        D --> E[Controller]
        E --> F[Response]
    end

    subgraph "Metrics Collected"
        G[Request Count]
        H[Response Time]
        I[Error Count]
        J[Status Codes]
    end

    subgraph "Storage"
        K[Memory Store]
        L[External Metrics]
    end

    B --> G
    B --> H
    B --> I
    B --> J

    G --> K
    H --> K
    I --> K
    J --> K

    K --> L

    classDef flow fill:#e3f2fd,stroke:#1565c0
    classDef metrics fill:#e8f5e8,stroke:#2e7d32
    classDef storage fill:#fff3e0,stroke:#ef6c00

    class A,B,C,D,E,F flow
    class G,H,I,J metrics
    class K,L storage
```

### Health Checks

```javascript
// Health check endpoint response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "memory": {
    "used": "150MB",
    "total": "512MB",
    "percentage": 29.3
  },
  "database": {
    "status": "connected",
    "responseTime": "5ms"
  },
  "services": {
    "email": "operational",
    "cache": "operational"
  }
}
```

## Testing Infrastructure

### Integration Testing

```mermaid
graph TD
    subgraph "Test Setup"
        A[Test Database]
        B[Test Server]
        C[Test Client]
    end

    subgraph "Test Execution"
        D[API Requests]
        E[Database Assertions]
        F[Response Validation]
    end

    subgraph "Test Cleanup"
        G[Database Reset]
        H[Server Shutdown]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H

    classDef setup fill:#e8f5e8,stroke:#2e7d32
    classDef execution fill:#e3f2fd,stroke:#1565c0
    classDef cleanup fill:#ffebee,stroke:#f44336

    class A,B,C setup
    class D,E,F execution
    class G,H cleanup
```

### Test Structure

```javascript
describe('Auth API Integration', () => {
  let server;
  let testUser;

  beforeAll(async () => {
    // Start test server with test database
    server = await startTestServer();
  });

  afterAll(async () => {
    // Clean up
    await stopTestServer(server);
  });

  beforeEach(async () => {
    // Reset database state
    await resetTestDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });
  });
});
```
