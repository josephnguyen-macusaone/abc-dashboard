# Clean Architecture Implementation Guide

## Overview

This guide explains how the ABC Dashboard frontend implements Clean Architecture principles, providing a clear separation of concerns and making the codebase more maintainable, testable, and scalable.

## 🏛️ Clean Architecture Principles

### Core Principles

```mermaid
graph TD
    A[Dependency Rule] --> B[Domain Layer<br/>Independent]
    A --> C[Application Layer<br/>Depends on Domain]
    A --> D[Infrastructure Layer<br/>Depends on Application]
    A --> E[Presentation Layer<br/>Depends on Application]

    F[Inner Layers<br/>Define Interfaces] --> G[Outer Layers<br/>Implement Interfaces]

    style A fill:#e8f5e8
    style B fill:#c8e6c9
    style C fill:#a5d6a7
    style D fill:#81c784
    style E fill:#66bb6a
    style F fill:#e1f5fe
    style G fill:#b3e5fc
```

### Dependency Inversion

The architecture follows dependency inversion where:
- **Inner layers define interfaces/contracts**
- **Outer layers implement these interfaces**
- **Dependencies point inward**

## 📁 Layer Structure

### Domain Layer (`src/domain/`)

The domain layer contains business logic that is independent of any external frameworks or technologies.

#### Entities (`domain/entities/`)

```mermaid
classDiagram
    class User {
        +id: string
        +name: string
        +email: string
        +role: UserRole
        +isActive: boolean
        +hasRole(role): boolean
        +isAdmin(): boolean
        +isManagerOrHigher(): boolean
        +needsPasswordChange(): boolean
        +isEmailVerified(): boolean
        +activateAccount(): DomainEvent
        +recordFirstLogin(): DomainEvent
    }

    class AuthTokens {
        +accessToken: string
        +refreshToken?: string
        +expiresAt?: Date
        +isExpired(): boolean
        +hasRefreshToken(): boolean
    }

    class AuthResult {
        +user: User
        +tokens: AuthTokens
        +isAuthenticated: boolean
        +authenticated(user, tokens): AuthResult
        +unauthenticated(): AuthResult
    }

    class UserRole {
        <<enumeration>>
        ADMIN
        MANAGER
        STAFF
    }

    User --> UserRole
    AuthResult --> User
    AuthResult --> AuthTokens
```

**Key Characteristics:**
- Pure business logic with no external dependencies
- Domain events for important state changes
- Rich domain models with business rules
- Value objects and entities

#### Repository Interfaces (`domain/repositories/`)

```mermaid
classDiagram
    class IAuthRepository {
        <<interface>>
        +login(email: string, password: string): Promise~AuthResult~
        +register(userData: RegisterData): Promise~AuthResult~
        +logout(): Promise~void~
        +refreshToken(): Promise~AuthTokens~
        +getProfile(): Promise~User~
        +updateProfile(userData: UpdateProfileData): Promise~User~
        +changePassword(data: ChangePasswordData): Promise~void~
        +verifyEmail(token: string): Promise~void~
    }

    class IUserRepository {
        <<interface>>
        +createUser(userData: CreateUserData): Promise~User~
        +updateUser(id: string, userData: UpdateUserData): Promise~User~
        +deleteUser(id: string): Promise~void~
        +getUserById(id: string): Promise~User~
        +getUsers(params: UserQueryParams): Promise~User[]~
        +searchUsers(query: string): Promise~User[]~
        +getUserStats(): Promise~UserStats~
    }

    note for IAuthRepository "Defines contract for authentication operations"
    note for IUserRepository "Defines contract for user management operations"
```

**Purpose:**
- Define data access contracts
- Enable dependency inversion
- Make domain layer testable in isolation

#### Domain Services (`domain/services/`)

```mermaid
classDiagram
    class AuthDomainService {
        +validateEmailFormat(email: string): boolean
        +validatePasswordStrength(password: string): ValidationResult
        +validateUserAccountStatus(user: User): ValidationResult
        +generateSecurePassword(): string
        +hashPassword(password: string): Promise~string~
        +comparePasswords(plain: string, hash: string): Promise~boolean~
    }

    class UserDomainService {
        +validateUserCreation(userData: CreateUserData): ValidationResult
        +validateUserUpdate(userData: UpdateUserData): ValidationResult
        +checkUserPermissions(user: User, action: string): boolean
        +generateUserDisplayName(user: User): string
    }

    class ValidationResult {
        +isValid: boolean
        +errors: string[]
    }

    AuthDomainService --> ValidationResult
    UserDomainService --> ValidationResult
```

**Responsibilities:**
- Complex business rules that don't belong in entities
- Cross-entity business logic
- Domain-specific validations

### Application Layer (`src/application/`)

The application layer orchestrates domain objects to fulfill application-specific use cases.

#### Use Cases (`application/use-cases/`)

```mermaid
graph TD
    subgraph "Auth Use Cases"
        A1[LoginUseCase]
        A2[RegisterUseCase]
        A3[LogoutUseCase]
        A4[UpdateProfileUseCase]
        A5[GetProfileUseCase]
    end

    subgraph "User Management Use Cases"
        U1[CreateUserUseCase]
        U2[UpdateUserUseCase]
        U3[DeleteUserUseCase]
        U4[GetUsersUseCase]
        U5[SearchUsersUseCase]
    end

    subgraph "Dependencies"
        D1[IAuthRepository]
        D2[IUserRepository]
        D3[AuthDomainService]
        D4[UserDomainService]
    end

    A1 --> D1
    A2 --> D1
    A3 --> D1
    A4 --> D1
    A5 --> D1

    U1 --> D2
    U2 --> D2
    U3 --> D2
    U4 --> D2
    U5 --> D2
    U6 --> D2

    A1 --> D3
    A2 --> D3
    U1 --> D4
    U2 --> D4

    style A1 fill:#e1f5fe
    style A2 fill:#e1f5fe
    style A3 fill:#e1f5fe
    style A4 fill:#e1f5fe
    style A5 fill:#e1f5fe
    style U1 fill:#f3e5f5
    style U2 fill:#f3e5f5
    style U3 fill:#f3e5f5
    style U4 fill:#f3e5f5
    style U5 fill:#f3e5f5
    style U6 fill:#f3e5f5
    style D1 fill:#fff3e0
    style D2 fill:#fff3e0
    style D3 fill:#e8f5e8
    style D4 fill:#e8f5e8
```

**Use Case Structure:**

```mermaid
classDiagram
    class LoginUseCase {
        -authRepository: IAuthRepository
        +execute(email: string, password: string): Promise~AuthResult~
        -validateInput(email: string, password: string): void
        -validateLoginResult(result: AuthResult): void
        -handleLoginError(error: any): Error
    }

    class IAuthRepository {
        +login(email: string, password: string): Promise~AuthResult~
    }

    LoginUseCase --> IAuthRepository : depends on
```

**Key Characteristics:**
- Single responsibility principle
- Application-specific business rules
- Orchestrate domain objects
- Return domain objects or DTOs

#### Application Services (`application/services/`)

```mermaid
classDiagram
    class AuthService {
        -loginUseCase: LoginUseCase
        -registerUseCase: RegisterUseCase
        -logoutUseCase: LogoutUseCase
        -updateProfileUseCase: UpdateProfileUseCase
        -getProfileUseCase: GetProfileUseCase
        +login(email: string, password: string): Promise~AuthResult~
        +register(userData: RegisterData): Promise~AuthResult~
        +logout(): Promise~void~
        +updateProfile(userData: UpdateProfileData): Promise~User~
        +getProfile(): Promise~User~
    }

    class UserManagementService {
        -createUserUseCase: CreateUserUseCase
        -updateUserUseCase: UpdateUserUseCase
        -deleteUserUseCase: DeleteUserUseCase
        -getUsersUseCase: GetUsersUseCase
        -searchUsersUseCase: SearchUsersUseCase
        +createUser(userData: CreateUserData): Promise~User~
        +updateUser(id: string, userData: UpdateUserData): Promise~User~
        +deleteUser(id: string): Promise~void~
        +getUsers(params: UserQueryParams): Promise~User[]~
        +searchUsers(query: string): Promise~User[]~
        +getUserStats(): Promise~UserStats~
    }

    AuthService --> LoginUseCase
    AuthService --> RegisterUseCase
    UserManagementService --> CreateUserUseCase
    UserManagementService --> GetUsersUseCase
```

**Purpose:**
- Group related use cases
- Provide high-level API for presentation layer
- Handle cross-cutting concerns

#### DTOs (`application/dto/`)

```mermaid
classDiagram
    class LoginRequestDto {
        +email: string
        +password: string
    }

    class RegisterRequestDto {
        +name: string
        +email: string
        +password: string
        +confirmPassword: string
    }

    class UserResponseDto {
        +id: string
        +name: string
        +email: string
        +role: string
        +isActive: boolean
        +avatar?: string
        +lastLogin?: string
    }

    class CreateUserRequestDto {
        +name: string
        +email: string
        +role: UserRole
        +password: string
    }

    class UpdateUserRequestDto {
        +name?: string
        +email?: string
        +role?: UserRole
        +isActive?: boolean
    }
```

**Responsibilities:**
- Data transfer between layers
- API request/response formatting
- Input validation schemas

### Infrastructure Layer (`src/infrastructure/`)

The infrastructure layer implements the interfaces defined by the domain and application layers.

#### Repository Implementations (`infrastructure/repositories/`)

```mermaid
classDiagram
    class AuthRepository {
        -apiClient: AxiosInstance
        -localStorage: LocalStorageService
        -cookieService: CookieService
        +login(email: string, password: string): Promise~AuthResult~
        +register(userData: RegisterData): Promise~AuthResult~
        +logout(): Promise~void~
        +refreshToken(): Promise~AuthTokens~
        +getProfile(): Promise~User~
        +updateProfile(userData: UpdateProfileData): Promise~User~
    }

    class UserRepository {
        -apiClient: AxiosInstance
        +createUser(userData: CreateUserData): Promise~User~
        +updateUser(id: string, userData: UpdateUserData): Promise~User~
        +deleteUser(id: string): Promise~void~
        +getUserById(id: string): Promise~User~
        +getUsers(params: UserQueryParams): Promise~User[]~
        +searchUsers(query: string): Promise~User[]~
        +getUserStats(): Promise~UserStats~
    }

    class IAuthRepository {
        <<interface>>
        +login(email: string, password: string): Promise~AuthResult~
    }

    class IUserRepository {
        <<interface>>
        +createUser(userData: CreateUserData): Promise~User~
    }

    AuthRepository ..|> IAuthRepository : implements
    UserRepository ..|> IUserRepository : implements
```

**Key Responsibilities:**
- HTTP API communication
- Data transformation
- Error handling and retry logic
- Caching strategies

#### API Layer (`infrastructure/api/`)

```mermaid
graph TD
    subgraph "API Client"
        AC[Axios Client<br/>Base Configuration]
        AI[Auth Interceptors<br/>Token Management]
        EI[Error Interceptors<br/>Global Error Handling]
    end

    subgraph "API Modules"
        AA[Auth API<br/>Authentication Endpoints]
        UA[Users API<br/>User Management Endpoints]
    end

    subgraph "External Dependencies"
        HTTP[HTTP Client]
        LS[Local Storage]
        CS[Cookie Service]
    end

    AA --> AC
    UA --> AC
    AC --> HTTP
    AI --> AC
    EI --> AC
    AI --> LS
    AI --> CS

    style AC fill:#e1f5fe
    style AI fill:#e1f5fe
    style EI fill:#e1f5fe
    style AA fill:#f3e5f5
    style UA fill:#f3e5f5
    style HTTP fill:#fff3e0
    style LS fill:#e8f5e8
    style CS fill:#e8f5e8
```

#### Storage Services (`infrastructure/storage/`)

```mermaid
classDiagram
    class LocalStorageService {
        +setItem(key: string, value: any): void
        +getItem(key: string): any
        +removeItem(key: string): void
        +clear(): void
        +isAvailable(): boolean
    }

    class CookieService {
        +setCookie(name: string, value: string, options?: CookieOptions): void
        +getCookie(name: string): string | null
        +removeCookie(name: string): void
        +isAvailable(): boolean
    }

    class CookieOptions {
        +expires?: Date
        +path?: string
        +domain?: string
        +secure?: boolean
        +httpOnly?: boolean
        +sameSite?: 'strict' | 'lax' | 'none'
    }
```

#### State Stores (`infrastructure/stores/`)

```mermaid
classDiagram
    class AuthStore {
        -user: User | null
        -tokens: AuthTokens | null
        -isLoading: boolean
        -error: string | null
        +login(credentials: LoginCredentials): Promise~void~
        +logout(): void
        +refreshToken(): Promise~void~
        +setUser(user: User): void
        +setTokens(tokens: AuthTokens): void
        +setLoading(loading: boolean): void
        +setError(error: string | null): void
        +isAuthenticated: boolean
        +currentUser: User | null
        +currentTokens: AuthTokens | null
    }

    class ThemeStore {
        -theme: 'light' | 'dark' | 'system'
        +setTheme(theme: Theme): void
        +toggleTheme(): void
        +currentTheme: Theme
    }

    AuthStore --> User
    AuthStore --> AuthTokens
    ThemeStore --> Theme
```

### Presentation Layer (`src/presentation/`)

The presentation layer handles UI concerns and user interactions.

#### Components (`presentation/components/`)

Following Atomic Design principles:

```mermaid
graph TD
    subgraph "Templates"
        AT[AuthTemplate]
        DT[DashboardTemplate]
    end

    subgraph "Pages"
        AP[Auth Pages]
        DP[Dashboard Pages]
        PP[Profile Pages]
    end

    subgraph "Organisms"
        FO[Form Organisms]
        UM[User Management]
        SB[Sidebar]
    end

    subgraph "Molecules"
        FC[Form Components]
        DC[Dashboard Components]
        SC[Sidebar Components]
    end

    subgraph "Atoms"
        UI[UI Primitives]
        DI[Display Components]
        FF[Form Fields]
    end

    AT --> AP
    DT --> DP
    DP --> PP
    AP --> FO
    DP --> UM
    DP --> SB
    FO --> FC
    UM --> DC
    SB --> SC
    FC --> FF
    DC --> UI
    SC --> UI
    FF --> DI
    UI --> DI
```

#### Contexts (`presentation/contexts/`)

```mermaid
classDiagram
    class AuthContext {
        +user: User | null
        +login: (credentials: LoginCredentials) => Promise~void~
        +logout: () => void
        +isAuthenticated: boolean
        +isLoading: boolean
        +error: string | null
    }

    class ThemeContext {
        +theme: Theme
        +setTheme: (theme: Theme) => void
        +toggleTheme: () => void
    }

    class ErrorContext {
        +error: Error | null
        +setError: (error: Error | null) => void
        +clearError: () => void
    }
```

#### Hooks (`presentation/hooks/`)

```mermaid
classDiagram
    class useAuth {
        +user: User | null
        +login: (credentials: LoginCredentials) => Promise~void~
        +logout: () => void
        +isAuthenticated: boolean
        +isLoading: boolean
        +error: string | null
    }

    class useAuthService {
        +login: (email: string, password: string) => Promise~AuthResult~
        +register: (userData: RegisterData) => Promise~AuthResult~
        +logout: () => Promise~void~
        +getProfile: () => Promise~User~
        +updateProfile: (data: UpdateProfileData) => Promise~User~
    }

    class useUsers {
        +users: User[]
        +loading: boolean
        +error: string | null
        +fetchUsers: (params?: UserQueryParams) => Promise~void~
        +searchUsers: (query: string) => Promise~void~
        +createUser: (userData: CreateUserData) => Promise~void~
        +updateUser: (id: string, userData: UpdateUserData) => Promise~void~
        +deleteUser: (id: string) => Promise~void~
    }
```

### Shared Layer (`src/shared/`)

Cross-cutting concerns and utilities.

#### Dependency Injection (`shared/di/`)

```mermaid
classDiagram
    class DependencyContainer {
        -authRepository: AuthRepository
        -userRepository: UserRepository
        -loginUseCase: LoginUseCase
        -authService: AuthService
        +get authService(): AuthService
        +get userManagementService(): UserManagementService
        +reset(): void
    }

    class AuthService {
        -loginUseCase: LoginUseCase
        -authRepository: AuthRepository
    }

    DependencyContainer --> AuthService : provides
    AuthService --> LoginUseCase : injects
    AuthService --> AuthRepository : injects
```

## 🔄 Implementation Patterns

### Dependency Injection Pattern

```typescript
// Container provides singleton instances
class DependencyContainer {
  get authService(): AuthService {
    if (!this._authService) {
      this._authService = new AuthService(
        this.authRepository,
        this.loginUseCase,
        this.registerUseCase,
        // ... other dependencies
      );
    }
    return this._authService;
  }
}

// Usage in components
const authService = container.authService;
await authService.login(email, password);
```

### Repository Pattern Implementation

```typescript
// Domain defines interface
interface IAuthRepository {
  login(email: string, password: string): Promise<AuthResult>;
}

// Infrastructure implements interface
class AuthRepository implements IAuthRepository {
  async login(email: string, password: string): Promise<AuthResult> {
    const response = await this.apiClient.post('/auth/login', {
      email,
      password,
    });

    return AuthResultMapper.toDomain(response.data);
  }
}

// Use case depends on interface
class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(email: string, password: string): Promise<AuthResult> {
    // Domain logic here
    return this.authRepository.login(email, password);
  }
}
```

### Use Case Pattern

```typescript
class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(email: string, password: string): Promise<AuthResult> {
    // 1. Validate input
    this.validateInput(email, password);

    // 2. Execute business logic
    const authResult = await this.authRepository.login(email, password);

    // 3. Apply application rules
    this.validateLoginResult(authResult);

    return authResult;
  }

  private validateInput(email: string, password: string): void {
    // Application-specific validation
  }

  private validateLoginResult(authResult: AuthResult): void {
    // Application-specific business rules
  }
}
```

## 🧪 Testing Strategy

```mermaid
graph TD
    subgraph "Unit Tests"
        DE[Domain Entities]
        DS[Domain Services]
        UC[Use Cases]
        AS[Application Services]
    end

    subgraph "Integration Tests"
        IR[Repository Integration]
        API[API Integration]
        DI[Dependency Injection]
    end

    subgraph "E2E Tests"
        UI[UI Components]
        WF[User Workflows]
        AU[Authentication Flows]
    end

    subgraph "Test Doubles"
        MD[Mock Dependencies]
        FS[Fake Services]
        SD[Stub Data]
    end

    DE --> MD
    DS --> MD
    UC --> FS
    AS --> FS
    IR --> SD
    API --> SD
    UI --> MD
    WF --> FS
    AU --> SD

    style DE fill:#e1f5fe
    style DS fill:#e1f5fe
    style UC fill:#e1f5fe
    style AS fill:#e1f5fe
    style IR fill:#f3e5f5
    style API fill:#f3e5f5
    style DI fill:#f3e5f5
    style UI fill:#e8f5e8
    style WF fill:#e8f5e8
    style AU fill:#e8f5e8
    style MD fill:#fff3e0
    style FS fill:#fff3e0
    style SD fill:#fff3e0
```

### Testing Pyramid

- **Unit Tests**: Domain entities, use cases, application services
- **Integration Tests**: Repository implementations, API clients
- **E2E Tests**: Complete user workflows

### Test Example

```typescript
// Unit test for use case
describe('LoginUseCase', () => {
  let mockAuthRepository: jest.Mocked<IAuthRepository>;
  let loginUseCase: LoginUseCase;

  beforeEach(() => {
    mockAuthRepository = {
      login: jest.fn(),
    };
    loginUseCase = new LoginUseCase(mockAuthRepository);
  });

  it('should login successfully with valid credentials', async () => {
    const mockAuthResult = AuthResult.authenticated(mockUser, mockTokens);
    mockAuthRepository.login.mockResolvedValue(mockAuthResult);

    const result = await loginUseCase.execute('user@example.com', 'password');

    expect(result.isAuthenticated).toBe(true);
    expect(mockAuthRepository.login).toHaveBeenCalledWith('user@example.com', 'password');
  });
});
```

## 📋 Development Guidelines

### Adding New Features

1. **Start with Domain**: Define entities and business rules
2. **Create Repository Interface**: Define data access contract
3. **Implement Use Case**: Orchestrate domain objects
4. **Create Application Service**: Group related use cases
5. **Implement Repository**: Handle external concerns
6. **Add Presentation**: Create UI components
7. **Write Tests**: Ensure quality and prevent regressions

### Code Organization Rules

- **Domain Layer**: No external dependencies
- **Application Layer**: Depends only on domain
- **Infrastructure Layer**: Depends on application and domain
- **Presentation Layer**: Depends on application and infrastructure

### Naming Conventions

- **Use Cases**: `[Action][Entity]UseCase` (e.g., `LoginUseCase`)
- **Services**: `[Entity][Layer]Service` (e.g., `AuthDomainService`)
- **Repositories**: `[Entity]Repository` (e.g., `AuthRepository`)
- **DTOs**: `[Action][Entity][Type]Dto` (e.g., `LoginRequestDto`)

This Clean Architecture implementation provides a solid foundation for maintainable, testable, and scalable frontend applications.
