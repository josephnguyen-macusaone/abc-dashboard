# Architecture Overview

## Clean Architecture Implementation

The ABC Dashboard backend follows Clean Architecture principles, organizing code into concentric layers where each layer has specific responsibilities and dependencies flow inward.

```mermaid
graph TB
    %% External Systems
    subgraph "External Systems"
        DB[(PostgreSQL)]
        Email[Email Service]
        Cache[(Redis Cache)]
        Client[Frontend Client]
    end

    %% Infrastructure Layer (Outer)
    subgraph "Infrastructure Layer"
        subgraph "Web/API"
            Routes[Express Routes]
            Controllers[Controllers]
            Middleware[Middleware]
        end

        subgraph "Data Access"
            Migrations[Knex Migrations]
            InfraRepo[Infrastructure<br/>Repositories]
        end

        subgraph "External Services"
            EmailSvc[Email Service<br/>Adapter]
            AuthSvc[Auth Service<br/>Adapter]
            TokenSvc[Token Service<br/>Adapter]
        end
    end

    %% Application Layer
    subgraph "Application Layer"
        subgraph "Use Cases"
            AuthUC[Authentication<br/>Use Cases]
            UserUC[User Management<br/>Use Cases]
            ProfileUC[Profile Management<br/>Use Cases]
        end

        subgraph "DTOs & Validation"
            DTOs[Data Transfer<br/>Objects]
            Validators[Input Validators]
            Interfaces[Service Interfaces]
        end
    end

    %% Domain Layer (Inner/Core)
    subgraph "Domain Layer"
        subgraph "Business Entities"
            User[User Entity]
            UserProfile[User Profile Entity]
        end

        subgraph "Business Rules"
            DomainSvc[Domain Services]
            DomainRepo[Domain Repository<br/>Interfaces]
        end
    end

    %% Shared Layer
    subgraph "Shared Layer"
        Kernel[Dependency<br/>Injection Container]
        Utils[Utilities]
        Constants[Constants]
        HttpUtils[HTTP Utilities]
    end

    %% Dependency Flow (Inner to Outer)
    Client --> Routes
    Routes --> Controllers
    Controllers --> AuthUC
    Controllers --> UserUC
    Controllers --> ProfileUC

    AuthUC --> User
    UserUC --> User
    ProfileUC --> UserProfile

    AuthUC --> DomainRepo
    UserUC --> DomainRepo
    ProfileUC --> DomainRepo

    InfraRepo --> DomainRepo
    Migrations --> InfraRepo

    Controllers --> DTOs
    AuthUC --> Validators

    EmailSvc --> Email
    AuthSvc --> Cache
    InfraRepo --> DB

    Kernel -.-> Controllers
    Kernel -.-> AuthUC
    Kernel -.-> InfraRepo
    Kernel -.-> EmailSvc

    classDef outer fill:#e1f5fe,stroke:#01579b
    classDef middle fill:#f3e5f5,stroke:#4a148c
    classDef inner fill:#e8f5e8,stroke:#1b5e20
    classDef shared fill:#fff3e0,stroke:#e65100
    classDef external fill:#fce4ec,stroke:#880e4f

    class Routes,Controllers,Middleware,Migrations,InfraRepo,EmailSvc,AuthSvc,TokenSvc outer
    class AuthUC,UserUC,ProfileUC,DTOs,Validators,Interfaces middle
    class User,UserProfile,DomainSvc,DomainRepo inner
    class Kernel,Utils,Constants,HttpUtils shared
    class DB,Email,Cache,Client external
```

## Layer Responsibilities

### Domain Layer (Core Business Logic)

- **Entities**: `User`, `UserProfile` - Core business objects with validation rules
- **Repository Interfaces**: Define contracts for data access
- **Domain Services**: Business logic that spans multiple entities
- **Domain Exceptions**: Custom business rule violations

### Application Layer (Use Cases)

- **Use Cases**: Application-specific business operations (Login, Register, GetUsers, etc.)
- **DTOs**: Data Transfer Objects for request/response contracts
- **Validators**: Input validation using Joi schemas
- **Interfaces**: Contracts for external services (Email, Auth, Token)

### Infrastructure Layer (External Concerns)

- **Controllers**: HTTP request handlers and response formatting
- **Routes**: URL routing and middleware composition
- **Database Access**: Knex migrations and repositories targeting PostgreSQL
- **Repositories**: Data access implementations
- **Services**: External service adapters (Email, JWT, Auth)
- **Middleware**: Cross-cutting concerns (Auth, Logging, Security)
- **Config**: Environment-specific configuration

### Shared Layer (Cross-cutting Concerns)

- **Kernel**: Dependency Injection container for wiring dependencies
- **Utilities**: Common helper functions
- **Constants**: Application-wide constants and enums
- **HTTP Utils**: Response transformers and error handlers

## Key Architectural Patterns

### 1. Dependency Inversion

- Higher-level modules don't depend on lower-level modules
- Both depend on abstractions (interfaces)
- Domain layer defines repository interfaces
- Infrastructure layer implements them

### 2. Dependency Injection

- Container manages object creation and wiring
- Controllers receive use cases as dependencies
- Use cases receive repositories and services as dependencies
- Enables testability and flexibility

### 3. Repository Pattern

- Abstracts data access behind interfaces
- Domain layer defines what operations are needed
- Infrastructure layer implements how they're done
- Supports multiple database implementations

### 4. Use Case Pattern

- Each business operation is a separate use case
- Use cases orchestrate domain objects and repositories
- Controllers are thin adapters between HTTP and use cases

### 5. Entity Pattern

- Domain entities contain business rules and validation
- Entities are pure business objects (no infrastructure concerns)
- Entities emit domain events for important state changes

## Data Flow

```txt
HTTP Request
    ↓
Routes (middleware composition)
    ↓
Controllers (request parsing, response formatting)
    ↓
Use Cases (business logic orchestration)
    ↓
Domain Entities (business rules validation)
    ↓
Repository Interfaces (data access contracts)
    ↓
Infrastructure Repositories (actual data access)
    ↓
Database/External Services
```

## External License Management System Flow

The external license management system integrates with a third-party license API and provides a complete CRUD interface for managing synchronized license data.

```mermaid
graph TB
    %% External Systems
    subgraph "External Systems"
        ExtAPI[External License API<br/>155.138.247.131:2341<br/>x-api-key authentication]
        PostgreSQL[(PostgreSQL<br/>external_licenses table)]
        Frontend[React Frontend<br/>localhost:3000]
    end

    %% Backend Infrastructure Layer
    subgraph "Backend - Infrastructure Layer"
        subgraph "API Services"
            ExtLicenseApiSvc[ExternalLicenseApiService<br/>- HTTP client with retries<br/>- Circuit breaker pattern<br/>- API key authentication]
        end

        subgraph "Data Access"
            ExtLicenseRepo[ExternalLicenseRepository<br/>- Knex queries<br/>- Data transformation<br/>- Bulk operations]
            Migration[Database Migrations<br/>- Schema management<br/>- Indexes & constraints]
        end

        subgraph "Web Layer"
            ExtLicenseCtrl[ExternalLicenseController<br/>- Request validation<br/>- Response formatting<br/>- Error handling]
            Routes[Express Routes<br/>/api/v1/external-licenses]
        end
    end

    %% Backend Application Layer
    subgraph "Backend - Application Layer"
        subgraph "Use Cases"
            SyncExtLicensesUC[SyncExternalLicensesUseCase<br/>- Full sync orchestration<br/>- Bulk data processing<br/>- Error recovery]
            ManageExtLicensesUC[ManageExternalLicensesUseCase<br/>- CRUD operations<br/>- Data validation<br/>- Business rules]
        end

        subgraph "DTOs & Validation"
            ExtLicenseDTOs[License DTOs<br/>- Request/Response contracts<br/>- Data transformation]
        end
    end

    %% Backend Domain Layer
    subgraph "Backend - Domain Layer"
        subgraph "Business Entities"
            ExtLicenseEntity[ExternalLicense Entity<br/>- Data validation<br/>- Business rules<br/>- JSON serialization]
        end

        subgraph "Domain Interfaces"
            IExtLicenseRepo[IExternalLicenseRepository<br/>- Data access contract<br/>- Dependency inversion]
        end
    end

    %% Frontend Application Layer
    subgraph "Frontend - Application Layer"
        subgraph "API Services"
            LicenseApi[LicenseApiService<br/>- HTTP client<br/>- Data transformation<br/>- Error handling]
        end

        subgraph "State Management"
            LicenseStore[Zustand LicenseStore<br/>- State management<br/>- API integration<br/>- Loading states]
        end

        subgraph "Business Logic"
            LicenseMgmtSvc[LicenseManagementService<br/>- Use case orchestration<br/>- Data validation<br/>- Error handling]
        end
    end

    %% Frontend Presentation Layer
    subgraph "Frontend - Presentation Layer"
        subgraph "Pages"
            LicenseMgmtPage[LicenseManagementPage<br/>- Route handler<br/>- Data fetching<br/>- State coordination]
        end

        subgraph "Components"
            LicenseMgmt[LicenseManagement<br/>Organism<br/>- Data display<br/>- User interactions]
            LicensesDataGrid[LicensesDataGrid<br/>- Excel-like editing<br/>- Inline CRUD<br/>- Pagination]
        end
    end

    %% Data Flow - Sync Process
    ExtAPI --> ExtLicenseApiSvc
    ExtLicenseApiSvc --> SyncExtLicensesUC
    SyncExtLicensesUC --> ExtLicenseRepo
    ExtLicenseRepo --> PostgreSQL

    %% Data Flow - Management Operations
    LicenseMgmtPage --> LicenseStore
    LicenseStore --> LicenseApi
    LicenseApi --> Routes
    Routes --> ExtLicenseCtrl
    ExtLicenseCtrl --> ManageExtLicensesUC
    ManageExtLicensesUC --> ExtLicenseRepo
    ExtLicenseRepo --> PostgreSQL

    %% Data Flow - Read Operations
    PostgreSQL --> ExtLicenseRepo
    ExtLicenseRepo --> ManageExtLicensesUC
    ManageExtLicensesUC --> ExtLicenseCtrl
    ExtLicenseCtrl --> LicenseApi
    LicenseApi --> LicenseStore
    LicenseStore --> LicenseMgmtPage
    LicenseMgmtPage --> LicenseMgmt
    LicenseMgmt --> LicensesDataGrid

    %% Domain Dependencies
    ExtLicenseRepo -.-> IExtLicenseRepo
    ExtLicenseEntity -.-> IExtLicenseRepo

    %% Dependency Injection
    DI[Dependency Injection<br/>Container] -.-> ExtLicenseCtrl
    DI -.-> SyncExtLicensesUC
    DI -.-> ManageExtLicensesUC
    DI -.-> ExtLicenseRepo
    DI -.-> ExtLicenseApiSvc

    %% Styling
    classDef external fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef infrastructure fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef application fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef domain fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef frontend fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef presentation fill:#fce4ec,stroke:#ad1457,stroke-width:2px

    class ExtAPI,PostgreSQL,Frontend external
    class ExtLicenseApiSvc,ExtLicenseRepo,Migration,ExtLicenseCtrl,Routes infrastructure
    class SyncExtLicensesUC,ManageExtLicensesUC,ExtLicenseDTOs application
    class ExtLicenseEntity,IExtLicenseRepo domain
    class LicenseApi,LicenseStore,LicenseMgmtSvc frontend
    class LicenseMgmtPage,LicenseMgmt,LicensesDataGrid presentation
```

### External License Management Data Flow

#### 1. **Sync Process** (Background/Batch Operations)
```txt
External API (155.138.247.131:2341)
    ↓ [HTTP GET with x-api-key]
ExternalLicenseApiService (Circuit Breaker + Retries)
    ↓ [Bulk data fetching with pagination]
SyncExternalLicensesUseCase (Orchestration)
    ↓ [Data validation & transformation]
ExternalLicenseRepository (Bulk upsert)
    ↓ [Database transactions]
PostgreSQL (external_licenses table)
```

#### 2. **Read Operations** (Frontend Display)
```txt
Frontend LicenseManagementPage
    ↓ [React useEffect]
Zustand LicenseStore
    ↓ [API call with JWT auth]
LicenseApiService (HTTP client)
    ↓ [Request formatting]
Backend Routes (/api/v1/external-licenses)
    ↓ [Middleware: auth, validation]
ExternalLicenseController
    ↓ [Business logic delegation]
ManageExternalLicensesUseCase
    ↓ [Repository pattern]
ExternalLicenseRepository
    ↓ [Knex queries with filters]
PostgreSQL → JSON response → Frontend display
```

#### 3. **CRUD Operations** (User Interactions)
```txt
Frontend LicensesDataGrid (Inline editing)
    ↓ [Save/Update/Delete actions]
LicenseStore (State updates)
    ↓ [API calls with changes]
LicenseApiService
    ↓ [Individual/bulk operations]
Backend Controllers
    ↓ [Transaction management]
Use Cases → Repository → Database
    ↓ [Success/error responses]
Frontend (UI updates + notifications)
```

### Key Integration Points

#### **Authentication & Security**
- **External API**: `x-api-key` header authentication
- **Internal API**: JWT Bearer token authentication
- **Database**: Row Level Security (future enhancement)

#### **Data Synchronization**
- **Batch Processing**: 100 records per page, configurable batch sizes
- **Error Recovery**: Failed records marked for retry
- **Duplicate Handling**: Upsert logic prevents duplicates
- **Sync Status Tracking**: `pending`, `synced`, `failed` states

#### **Performance Optimizations**
- **Circuit Breaker**: Prevents cascade failures
- **Retry Logic**: Exponential backoff for transient failures
- **Bulk Operations**: Reduce database round trips
- **Database Indexes**: Optimized queries for large datasets
- **Connection Pooling**: Efficient database connections

#### **Error Handling**
- **Domain Exceptions**: Business rule violations
- **Service Timeouts**: Configurable timeouts per operation
- **Graceful Degradation**: Partial failures don't break entire sync
- **Comprehensive Logging**: Request/response tracking

## Technology Stack

- **Runtime**: Node.js with ES6 modules
- **Web Framework**: Express.js
- **Database**: PostgreSQL via Knex
- **Authentication**: JWT tokens with refresh tokens
- **Validation**: Joi schemas
- **Email**: Nodemailer (MailHog, Google Workspace, Mailjet)
- **Security**: Helmet, CORS, rate limiting
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest with Supertest
- **Linting**: ESLint with Prettier
- **Process Management**: PM2
- **Containerization**: Docker

## Development Principles

- **SOLID Principles**: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion
- **DRY**: Don't Repeat Yourself - shared utilities and base classes
- **KISS**: Keep It Simple, Stupid - clear separation of concerns
- **Testability**: Dependency injection enables comprehensive testing
- **Maintainability**: Clear structure and documentation
