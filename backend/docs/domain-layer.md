# Domain Layer

The Domain Layer contains the core business logic and represents the heart of the application. It defines business entities, business rules, and contracts for data access.

## Domain Entities

### User Entity

The User entity represents the core business concept of a system user with authentication and authorization capabilities.

```mermaid
classDiagram
    class User {
        +String id
        +String username
        +String hashedPassword
        +String email
        +String displayName
        +String role
        +String avatarUrl?
        +String phone?
        +Boolean isActive
        +Boolean isFirstLogin
        +String langKey
        +Date createdAt
        +Date updatedAt
        +String createdBy?
        +String lastModifiedBy?

        +validate()
        +getProfile(): Object
        +updateProfile(updates): DomainEvent
        +updateAvatar(avatarUrl): DomainEvent
        +changePassword(newHashedPassword): DomainEvent
        +activate(): DomainEvent
    }

    class DomainEvent {
        +String type
        +Object payload
        +Date occurredAt
    }

    User ..> DomainEvent : emits
```

**Key Business Rules:**
- Email must be valid format
- Username must be 3+ characters, alphanumeric + underscore only
- Display name is required
- Role must be one of predefined values (ADMIN, MANAGER, STAFF)
- Language key validation

**Domain Events:**
- `UserProfileUpdated`: Profile information changed
- `UserAvatarUpdated`: Avatar URL updated
- `UserPasswordChanged`: Password changed
- `UserActivated`: Account activated after email verification

### UserProfile Entity

The UserProfile entity represents extended, optional profile information that complements the core User entity.

```mermaid
classDiagram
    class UserProfile {
        +String id
        +String userId
        +String bio?
        +Boolean emailVerified
        +Date lastLoginAt?
        +Date lastActivityAt?
        +Date emailVerifiedAt?
        +Date createdAt
        +Date updatedAt

        +validate()
        +getProfile(): Object
        +updateProfile(updates): DomainEvent
        +recordLogin(): DomainEvent
        +recordActivity(): DomainEvent
        +verifyEmail(): DomainEvent
    }

    UserProfile ..> DomainEvent : emits
```

**Key Business Rules:**
- UserId is required and must reference existing User
- Bio cannot exceed 500 characters
- Email verification timestamp required when email is verified
- Email cannot be marked verified without verification timestamp

**Domain Events:**
- `UserProfileUpdated`: Profile information updated
- `UserLoginRecorded`: User login activity tracked
- `UserActivityRecorded`: User activity tracked
- `UserEmailVerified`: Email verification completed

## Entity Relationships

```mermaid
erDiagram
    User ||--o| UserProfile : "has optional"
    User {
        string id PK
        string username UK
        string email UK
        string displayName
        string role
        boolean isActive
        string langKey
        datetime createdAt
        datetime updatedAt
    }
    UserProfile {
        string id PK
        string userId FK,UK
        string bio
        boolean emailVerified
        datetime lastLoginAt
        datetime lastActivityAt
        datetime emailVerifiedAt
        datetime createdAt
        datetime updatedAt
    }
```

## Repository Interfaces

### IUserRepository

Defines the contract for user data operations in the domain layer.

```mermaid
classDiagram
    class IUserRepository {
        <<interface>>
        +findById(id: string): Promise~User|null~
        +findByEmail(email: string): Promise~User|null~
        +findByUsername(username: string): Promise~User|null~
        +findByEmailVerificationToken(token: string): Promise~User|null~
        +updateEmailVerification(userId: string, data: Object): Promise~User~
        +findUsers(options: Object): Promise~PaginatedResult~
        +save(user: User): Promise~User~
        +update(id: string, updates: Object): Promise~User~
        +delete(id: string): Promise~boolean~
        +emailExists(email: string, excludeId?: string): Promise~boolean~
        +getUserStats(): Promise~Object~
    }

    class PaginatedResult {
        +User[] users
        +number total
        +number page
        +number totalPages
    }

    IUserRepository ..> User
    IUserRepository ..> PaginatedResult
```

**Key Operations:**
- **Identity Queries**: `findById`, `findByEmail`, `findByUsername`
- **Verification**: `findByEmailVerificationToken`, `updateEmailVerification`
- **CRUD Operations**: `save`, `update`, `delete`
- **Bulk Queries**: `findUsers` with pagination and filtering
- **Business Checks**: `emailExists`
- **Analytics**: `getUserStats`

### IUserProfileRepository

Defines the contract for user profile data operations.

```mermaid
classDiagram
    class IUserProfileRepository {
        <<interface>>
        +findById(id: string): Promise~UserProfile|null~
        +findByUserId(userId: string): Promise~UserProfile|null~
        +save(userProfile: UserProfile): Promise~UserProfile~
        +update(id: string, updates: Object): Promise~UserProfile~
        +updateByUserId(userId: string, updates: Object): Promise~UserProfile~
        +delete(id: string): Promise~boolean~
        +deleteByUserId(userId: string): Promise~boolean~
        +recordLogin(userId: string): Promise~UserProfile~
        +recordActivity(userId: string): Promise~UserProfile~
        +verifyEmail(userId: string): Promise~UserProfile~
    }

    IUserProfileRepository ..> UserProfile
```

**Key Operations:**
- **Identity Queries**: `findById`, `findByUserId`
- **CRUD Operations**: `save`, `update`, `delete`
- **Activity Tracking**: `recordLogin`, `recordActivity`
- **Email Verification**: `verifyEmail`

## Domain Exceptions

The domain layer defines specific exception types for different categories of business rule violations.

```mermaid
classDiagram
    DomainException <|-- AuthenticationException
    DomainException <|-- AuthorizationException
    DomainException <|-- ValidationException
    DomainException <|-- ResourceException
    DomainException <|-- BusinessLogicException
    DomainException <|-- InfrastructureException
    DomainException <|-- SecurityException

    class DomainException {
        +String errorKey
        +Number statusCode
        +String category
        +Object additionalData
        +toResponse(): Object
    }

    class AuthenticationException {
        InvalidCredentialsException
        AccountDeactivatedException
        AccountLockedException
        TokenExpiredException
        InvalidTokenException
    }

    class AuthorizationException {
        InsufficientPermissionsException
    }

    class ValidationException {
        ValidationException
        RequiredFieldMissingException
        InvalidFieldValueException
        EmailAlreadyExistsException
        InvalidEmailFormatException
        PasswordTooWeakException
    }

    class ResourceException {
        ResourceNotFoundException
        ResourceAlreadyExistsException
    }

    class BusinessLogicException {
        BusinessRuleViolationException
    }

    class InfrastructureException {
        NetworkTimeoutException
        ExternalServiceUnavailableException
        ConcurrentModificationException
    }

    class SecurityException {
        SecurityViolationException
        RateLimitExceededException
    }
```

### Exception Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Authentication** | Login/credential issues | Invalid credentials, account locked |
| **Authorization** | Permission/access issues | Insufficient permissions |
| **Validation** | Input/data validation | Required fields, invalid formats |
| **Resource** | Entity existence issues | Not found, already exists |
| **Business Logic** | Business rule violations | Domain-specific constraints |
| **Infrastructure** | External system issues | Network timeouts, service unavailable |
| **Security** | Security violations | Rate limiting, injection attempts |

## Business Rules Summary

### User Entity Rules
1. **Email Validation**: Must be valid email format
2. **Username Constraints**: 3+ chars, alphanumeric + underscore only
3. **Display Name**: Required field
4. **Role Validation**: Must be predefined role (ADMIN, MANAGER, STAFF)
5. **Language Support**: Optional language key for internationalization

### UserProfile Entity Rules
1. **User Association**: Must reference valid User entity
2. **Bio Length**: Maximum 500 characters
3. **Email Verification Logic**: Timestamp required when verified
4. **Activity Tracking**: Login and activity timestamps

### Cross-Entity Rules
1. **Email Uniqueness**: Email addresses must be unique across users
2. **Profile Completeness**: UserProfile is optional extension of User
3. **Activation Flow**: User must be activated before full access
4. **Email Verification**: Separate verification process with tokens

## Domain Event Flow

```mermaid
stateDiagram-v2
    [*] --> UserCreated
    UserCreated --> UserProfileCreated : Optional

    UserProfileCreated --> EmailVerificationRequested : Registration
    EmailVerificationRequested --> EmailVerified : User verifies
    EmailVerified --> UserActivated : Account activated

    UserActivated --> UserLoggedIn : First login
    UserLoggedIn --> ProfileUpdated : User edits profile
    ProfileUpdated --> PasswordChanged : Security update
    PasswordChanged --> [*]

    UserLoggedIn --> LoginRecorded : Activity tracking
    LoginRecorded --> ActivityRecorded : Usage tracking
```

## Design Principles

### 1. Entity Purity
- Entities contain only business logic and validation
- No infrastructure concerns (database, HTTP, external services)
- Self-validating with domain rules

### 2. Repository Abstraction
- Domain defines what data operations are needed
- Infrastructure implements how they're performed
- Enables database flexibility and testing

### 3. Exception Hierarchy
- Structured exception types for different error categories
- Consistent error handling across application layers
- HTTP status code mapping in infrastructure layer

### 4. Domain Events
- Entities emit events for important state changes
- Enables event-driven architecture possibilities
- Audit trail and business process tracking

### 5. Business Rule Encapsulation
- Validation logic encapsulated within entities
- Business rules clearly expressed in code
- Self-documenting validation methods
