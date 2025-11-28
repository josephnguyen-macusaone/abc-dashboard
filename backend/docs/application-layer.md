# Application Layer

The Application Layer contains use cases that orchestrate business operations, DTOs for data transfer, and validators for input validation. This layer acts as the bridge between the domain layer and infrastructure concerns.

## Use Cases Overview

Use cases represent application-specific business operations that coordinate domain entities and services. Each use case encapsulates a complete business workflow.

```mermaid
classDiagram
    class UseCase {
        <<abstract>>
        +execute(input): Promise~Result~
    }

    UseCase <|-- AuthUseCases
    UseCase <|-- UserManagementUseCases
    UseCase <|-- ProfileManagementUseCases

    class AuthUseCases {
        LoginUseCase
        RegisterUseCase
        RefreshTokenUseCase
        ChangePasswordUseCase
        RequestPasswordResetUseCase
        ResetPasswordUseCase
        VerifyEmailUseCase
        UpdateProfileUseCase
    }

    class UserManagementUseCases {
        GetUsersUseCase
        CreateUserUseCase
        UpdateUserUseCase
        DeleteUserUseCase
        GetUserStatsUseCase
    }

    class ProfileManagementUseCases {
        GetProfileUseCase
        UpdateProfileUseCase
        RecordLoginUseCase
        MarkEmailVerifiedUseCase
    }
```

## Authentication Use Cases

### Login Use Case Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant LoginUseCase
    participant UserRepository
    participant AuthService
    participant TokenService

    Client->>Controller: POST /auth/login {email, password}
    Controller->>LoginUseCase: execute({email, password})

    LoginUseCase->>LoginUseCase: validate input
    LoginUseCase->>UserRepository: findByEmail(email)
    UserRepository-->>LoginUseCase: User entity

    alt User not found
        LoginUseCase-->>Controller: InvalidCredentialsException
        Controller-->>Client: 401 Unauthorized
    end

    LoginUseCase->>LoginUseCase: check user.isActive

    alt User not active
        LoginUseCase-->>Controller: ValidationException
        Controller-->>Client: 400 Bad Request
    end

    LoginUseCase->>AuthService: verifyPassword(password, user.hashedPassword)
    AuthService-->>LoginUseCase: isValid: boolean

    alt Password invalid
        LoginUseCase-->>Controller: InvalidCredentialsException
        Controller-->>Client: 401 Unauthorized
    end

    LoginUseCase->>TokenService: generateAccessToken(userId, email, requiresPasswordChange)
    TokenService-->>LoginUseCase: accessToken

    LoginUseCase->>TokenService: generateRefreshToken(userId)
    TokenService-->>LoginUseCase: refreshToken

    LoginUseCase-->>Controller: LoginResponseDto{user, tokens, requiresPasswordChange}
    Controller-->>Client: 200 OK + response
```

### Registration Use Case Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant RegisterUseCase
    participant UserRepository
    participant AuthService
    participant TokenService
    participant EmailService

    Client->>Controller: POST /auth/register {username, email, password}
    Controller->>RegisterUseCase: execute(input)

    RegisterUseCase->>RegisterUseCase: validate input
    RegisterUseCase->>UserRepository: emailExists(email)

    alt Email exists
        RegisterUseCase-->>Controller: EmailAlreadyExistsException
        Controller-->>Client: 409 Conflict
    end

    RegisterUseCase->>AuthService: hashPassword(password)
    AuthService-->>RegisterUseCase: hashedPassword

    RegisterUseCase->>RegisterUseCase: create User entity
    RegisterUseCase->>UserRepository: save(user)
    UserRepository-->>RegisterUseCase: savedUser

    RegisterUseCase->>TokenService: generateEmailVerificationToken(userId)
    TokenService-->>RegisterUseCase: verificationToken

    RegisterUseCase->>UserRepository: updateEmailVerification(userId, {verificationToken})
    UserRepository-->>RegisterUseCase: updatedUser

    RegisterUseCase->>EmailService: sendVerificationEmail(email, verificationToken)
    EmailService-->>RegisterUseCase: emailSent

    RegisterUseCase-->>Controller: RegisterResponseDto{user, message}
    Controller-->>Client: 201 Created + response
```

## User Management Use Cases

### Get Users Use Case Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant GetUsersUseCase
    participant UserRepository

    Client->>Controller: GET /users?page=1&limit=10&role=STAFF
    Controller->>GetUsersUseCase: execute({page, limit, filters, sortBy, sortOrder})

    GetUsersUseCase->>UserRepository: findUsers(options)
    UserRepository-->>GetUsersUseCase: {users, total, page, totalPages}

    GetUsersUseCase-->>Controller: UsersResponseDto{users, pagination}
    Controller-->>Client: 200 OK + paginated users
```

## Profile Management Use Cases

### Update Profile Use Case Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant UpdateProfileUseCase
    participant UserProfileRepository

    Client->>Controller: PUT /profile {displayName, bio, phone}
    Controller->>UpdateProfileUseCase: execute(userId, updates)

    UpdateProfileUseCase->>UserProfileRepository: updateByUserId(userId, updates)
    UserProfileRepository-->>UpdateProfileUseCase: updatedProfile

    UpdateProfileUseCase-->>Controller: ProfileResponseDto{profile}
    Controller-->>Client: 200 OK + updated profile
```

## Data Transfer Objects (DTOs)

DTOs define the structure of data exchanged between layers and external systems.

### Authentication DTOs

```mermaid
classDiagram
    class BaseDto {
        <<abstract>>
        +constructor(data)
        +validate()
    }

    BaseDto <|-- AuthDto
    BaseDto <|-- UserDto
    BaseDto <|-- TokenDto

    class AuthDto {
        LoginRequestDto
        LoginResponseDto
        RegisterRequestDto
        RegisterResponseDto
        TokensDto
        UserAuthDto
    }

    class UserDto {
        CreateUserRequestDto
        UpdateUserRequestDto
        UserResponseDto
        UsersListResponseDto
    }

    class TokenDto {
        RefreshTokenRequestDto
        ChangePasswordRequestDto
    }

    class LoginRequestDto {
        +String email*
        +String password*
    }

    class LoginResponseDto {
        +UserAuthDto user
        +TokensDto tokens
        +Boolean requiresPasswordChange
    }

    class TokensDto {
        +String accessToken
        +String refreshToken
    }

    class UserAuthDto {
        +String id
        +String username
        +String email
        +String displayName
        +String role
        +String avatarUrl?
        +String phone?
        +Boolean isActive
        +Boolean isFirstLogin
        +String langKey
    }
```

### DTO Structure Examples

```javascript
// Login Request DTO
{
  email: "user@example.com",    // required
  password: "userpassword"      // required
}

// Login Response DTO
{
  user: {
    id: "user123",
    username: "johndoe",
    email: "john@example.com",
    displayName: "John Doe",
    role: "STAFF",
    avatarUrl: null,
    phone: null,
    isActive: true,
    isFirstLogin: true,
    langKey: "en"
  },
  tokens: {
    accessToken: "eyJhbGciOiJIUzI1NiIs...",
    refreshToken: "eyJhbGciOiJIUzI1NiIs..."
  },
  requiresPasswordChange: true
}
```

## Input Validation

Validators ensure data integrity before processing in use cases.

### Validation Architecture

```mermaid
graph TD
    A[HTTP Request] --> B[Controller]
    B --> C[Use Case]
    C --> D[Domain Entity]

    C --> E{Input Valid?}
    E -->|Yes| D
    E -->|No| F[ValidationException]

    F --> G[Error Handler]
    G --> H[HTTP Response]

    I[Validator Classes] --> E
    I --> J[Joi Schemas]
    I --> K[Custom Rules]
```

### Auth Validator Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| **email** | Required, valid email format | "Email is required" / "Invalid email format" |
| **password** | Required, 8+ chars, uppercase, lowercase, number | "Password is required" / specific strength requirements |
| **username** | Required, 3-30 chars, alphanumeric + underscore | "Username is required" / length/format constraints |
| **currentPassword** | Required for password changes | "Current password is required" |
| **newPassword** | Must differ from current password | "New password must be different from current password" |
| **refreshToken** | Required for token refresh | "Refresh token is required" |

### Password Strength Requirements

```javascript
const passwordRules = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false  // Optional enhancement
};
```

## Service Interfaces

Application layer defines contracts for external services.

### IAuthService Interface

```mermaid
classDiagram
    class IAuthService {
        <<interface>>
        +hashPassword(password: string): Promise~string~
        +verifyPassword(password: string, hash: string): Promise~boolean~
        +generateOtp(length?: number): string
        +validatePasswordStrength(password: string): {isValid, errors}
    }

    class ITokenService {
        <<interface>>
        +generateAccessToken(payload: Object): string
        +generateRefreshToken(payload: Object): string
        +generateEmailVerificationToken(userId: string): string
        +generatePasswordResetToken(userId: string): string
        +verifyAccessToken(token: string): Object
        +verifyRefreshToken(token: string): Object
        +verifyEmailToken(token: string): Object
        +verifyPasswordResetToken(token: string): Object
    }

    class IEmailService {
        <<interface>>
        +sendVerificationEmail(email: string, token: string): Promise~void~
        +sendPasswordResetEmail(email: string, token: string): Promise~void~
        +sendWelcomeEmail(email: string, username: string): Promise~void~
        +sendPasswordChangedEmail(email: string): Promise~void~
    }
```

## Use Case Patterns

### 1. Command Pattern
Most use cases follow the Command pattern - they encapsulate a request as an object.

```javascript
class LoginUseCase {
  constructor(userRepository, authService, tokenService) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.tokenService = tokenService;
  }

  async execute(input) {
    // Orchestrate domain operations
    // Return structured result
  }
}
```

### 2. Result Pattern
Use cases return structured results, not raw entities.

```javascript
class LoginUseCase {
  async execute(input) {
    // ... business logic ...

    return new LoginResponseDto({
      user: UserAuthDto.fromEntity(user),
      tokens: new TokensDto({ accessToken, refreshToken }),
      requiresPasswordChange
    });
  }
}
```

### 3. Validation First
Input validation occurs before business logic.

```javascript
class LoginUseCase {
  async execute({ email, password }) {
    // Validate input first
    if (!email || !password) {
      throw new ValidationException('Email and password are required');
    }

    // Then proceed with business logic
    // ...
  }
}
```

### 4. Error Handling Strategy
- Domain exceptions are re-thrown as-is
- Unexpected errors are wrapped with context
- Validation errors are thrown immediately

```javascript
class LoginUseCase {
  async execute(input) {
    try {
      // Business logic
    } catch (error) {
      // Re-throw domain exceptions
      if (error instanceof ValidationException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Login failed: ${error.message}`);
    }
  }
}
```

## Use Case Dependencies

```mermaid
graph TD
    subgraph "Use Cases"
        LoginUC[LoginUseCase]
        RegisterUC[RegisterUseCase]
        GetUsersUC[GetUsersUseCase]
        UpdateProfileUC[UpdateProfileUseCase]
    end

    subgraph "Domain"
        UserRepo[IUserRepository]
        UserProfileRepo[IUserProfileRepository]
    end

    subgraph "Services"
        AuthSvc[IAuthService]
        TokenSvc[ITokenService]
        EmailSvc[IEmailService]
    end

    LoginUC --> UserRepo
    LoginUC --> AuthSvc
    LoginUC --> TokenSvc

    RegisterUC --> UserRepo
    RegisterUC --> AuthSvc
    RegisterUC --> TokenSvc
    RegisterUC --> EmailSvc

    GetUsersUC --> UserRepo

    UpdateProfileUC --> UserProfileRepo
```

## Testing Strategy

### Use Case Testing Focus
- **Unit Tests**: Test use case logic with mocked dependencies
- **Integration Tests**: Test with real repositories and services
- **Contract Tests**: Verify service interfaces are implemented correctly

### Test Structure
```javascript
describe('LoginUseCase', () => {
  let useCase;
  let mockUserRepository;
  let mockAuthService;
  let mockTokenService;

  beforeEach(() => {
    mockUserRepository = { findByEmail: jest.fn() };
    mockAuthService = { verifyPassword: jest.fn() };
    mockTokenService = { generateAccessToken: jest.fn(), generateRefreshToken: jest.fn() };

    useCase = new LoginUseCase(mockUserRepository, mockAuthService, mockTokenService);
  });

  it('should login user with valid credentials', async () => {
    // Arrange
    const input = { email: 'test@example.com', password: 'password' };
    const user = new User({ /* valid user data */ });

    mockUserRepository.findByEmail.mockResolvedValue(user);
    mockAuthService.verifyPassword.mockResolvedValue(true);
    mockTokenService.generateAccessToken.mockReturnValue('access-token');
    mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');

    // Act
    const result = await useCase.execute(input);

    // Assert
    expect(result.user.email).toBe(user.email);
    expect(result.tokens.accessToken).toBe('access-token');
  });
});
```
