# Architecture Overview

## Overview

The ABC Dashboard frontend is a modern React application built with Next.js 16, following Clean Architecture principles. This document provides a comprehensive overview of the system architecture, design patterns, and key components.

## 🏛️ Clean Architecture Overview

The application follows Clean Architecture principles with clear separation of concerns across four main layers:

```mermaid
graph TD
    A[Presentation Layer<br/>React Components] --> B[Application Layer<br/>Use Cases & Services]
    B --> C[Domain Layer<br/>Entities & Business Rules]
    B --> D[Infrastructure Layer<br/>External APIs & Storage]
    D --> C

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
```

## 📁 Project Structure

```mermaid
graph LR
    subgraph "src/"
        subgraph "app/ (Next.js App Router)"
            AP[Pages & Routes]
            L[Layout & Providers]
        end

        subgraph "domain/ (Business Logic)"
            DE[Entities]
            DR[Repository Interfaces]
            DS[Domain Services]
        end

        subgraph "application/ (Use Cases)"
            AUS[Application Services]
            AUC[Use Cases]
            ADT[DTOs]
        end

        subgraph "infrastructure/ (External Concerns)"
            IR[Repository Implementations]
            IA[API Clients]
            IS[Storage Services]
            IST[Stores]
        end

        subgraph "presentation/ (UI Components)"
            PC[Components]
            PCTX[Contexts]
            PH[Hooks]
        end

        subgraph "shared/ (Cross-cutting Concerns)"
            SC[Constants]
            ST[Types]
            SU[Utilities]
            SDI[Dependency Injection]
        end
    end

    AP --> L
    L --> PC
    PC --> PCTX
    PC --> PH
    PCTX --> AUS
    PH --> AUS
    AUS --> AUC
    AUC --> DR
    AUC --> ADT
    IR --> DR
    IR --> IA
    IR --> IS
    IS --> IST
    DS --> DE
    SDI --> AUS
    SDI --> IR
```

## 🔄 Data Flow Architecture

### Request Flow
```mermaid
sequenceDiagram
    participant U as User
    participant C as Component
    participant H as Hook
    participant S as Service
    participant UC as Use Case
    participant R as Repository
    participant API as External API

    U->>C: User Interaction
    C->>H: Custom Hook Call
    H->>S: Service Method
    S->>UC: Execute Use Case
    UC->>R: Repository Call
    R->>API: HTTP Request
    API-->>R: Response
    R-->>UC: Domain Data
    UC-->>S: Processed Result
    S-->>H: Formatted Data
    H-->>C: UI State Update
    C-->>U: UI Update
```

### Authentication Flow
```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> LoginForm: Navigate to /login
    LoginForm --> Authenticating: Submit Credentials
    Authenticating --> Authenticated: Success
    Authenticating --> LoginForm: Failure
    Authenticated --> [*]: Logout
    Authenticated --> TokenRefresh: Token Expiring
    TokenRefresh --> Authenticated: Refresh Success
    TokenRefresh --> Unauthenticated: Refresh Failure
```

## 🧩 Component Architecture

The UI follows Atomic Design principles with hierarchical component organization:

```mermaid
graph TD
    subgraph "Templates (Layout)"
        AT[Auth Template]
        DT[Dashboard Template]
    end

    subgraph "Pages (Route-level)"
        AP[Auth Pages]
        DP[Dashboard Pages]
        PP[Profile Pages]
    end

    subgraph "Organisms (Complex Components)"
        FO[Form Organisms]
        UM[User Management]
        SB[Sidebar]
    end

    subgraph "Molecules (Composite Components)"
        FC[Form Components]
        DC[Dashboard Components]
        SC[Sidebar Components]
    end

    subgraph "Atoms (Basic Components)"
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

    style AT fill:#fce4ec
    style DT fill:#fce4ec
    style AP fill:#f8bbd9
    style DP fill:#f8bbd9
    style PP fill:#f8bbd9
    style FO fill:#e1bee7
    style UM fill:#e1bee7
    style SB fill:#e1bee7
    style FC fill:#d1c4e9
    style DC fill:#d1c4e9
    style SC fill:#d1c4e9
    style UI fill:#c5cae9
    style DI fill:#c5cae9
    style FF fill:#c5cae9
```

## 📊 State Management Architecture

```mermaid
graph TD
    subgraph "Global State (Zustand)"
        AS[Auth Store]
        TS[Theme Store]
    end

    subgraph "Local State (React)"
        CS[Component State]
        FS[Form State<br/>React Hook Form]
    end

    subgraph "Context Providers"
        AC[Auth Context]
        TC[Theme Context]
        EC[Error Context]
    end

    subgraph "Persistence"
        LS[Local Storage]
        CK[Cookies]
    end

    AS --> LS
    TS --> LS
    AC --> AS
    TC --> TS
    EC --> CS
    FS --> CS
    CK --> AS

    style AS fill:#e3f2fd
    style TS fill:#e3f2fd
    style CS fill:#f3e5f5
    style FS fill:#f3e5f5
    style AC fill:#e8f5e8
    style TC fill:#e8f5e8
    style EC fill:#e8f5e8
    style LS fill:#fff3e0
    style CK fill:#fff3e0
```

## 🔌 API Integration Architecture

```mermaid
graph TD
    subgraph "API Layer"
        AC[Axios Client]
        AH[API Handlers]
        AE[Error Handlers]
    end

    subgraph "Repository Layer"
        AR[Auth Repository]
        UR[User Repository]
    end

    subgraph "External APIs"
        BA[Backend API]
        AT[Auth Endpoints]
        UT[User Endpoints]
    end

    subgraph "Response Processing"
        RP[Response Parsers]
        VD[Validators]
        DT[DTO Transformers]
    end

    AR --> AC
    UR --> AC
    AC --> BA
    AT --> BA
    UT --> BA
    BA --> RP
    RP --> VD
    VD --> DT
    DT --> AR
    DT --> UR

    style AC fill:#e1f5fe
    style AH fill:#e1f5fe
    style AE fill:#e1f5fe
    style AR fill:#f3e5f5
    style UR fill:#f3e5f5
    style BA fill:#fff3e0
    style AT fill:#fff3e0
    style UT fill:#fff3e0
    style RP fill:#e8f5e8
    style VD fill:#e8f5e8
    style DT fill:#e8f5e8
```

## 🔐 Security Architecture

```mermaid
graph TD
    subgraph "Authentication"
        JWT[JWT Tokens]
        RT[Refresh Tokens]
        CSRF[CSRF Protection]
    end

    subgraph "Authorization"
        RBAC[Role-Based Access]
        RP[Route Protection]
        PG[Permission Guards]
    end

    subgraph "Data Protection"
        IS[Input Sanitization]
        VS[Validation Schemas]
        XSS[XSS Prevention]
    end

    subgraph "Storage Security"
        HC[HTTP-Only Cookies]
        LS[Local Storage<br/>Non-sensitive data]
        ENC[Encrypted Storage]
    end

    JWT --> RBAC
    RT --> JWT
    CSRF --> JWT
    RBAC --> RP
    RP --> PG
    IS --> VS
    VS --> XSS
    HC --> JWT
    LS --> ENC

    style JWT fill:#ffebee
    style RT fill:#ffebee
    style CSRF fill:#ffebee
    style RBAC fill:#e8f5e8
    style RP fill:#e8f5e8
    style PG fill:#e8f5e8
    style IS fill:#fff3e0
    style VS fill:#fff3e0
    style XSS fill:#fff3e0
    style HC fill:#e1f5fe
    style LS fill:#e1f5fe
    style ENC fill:#e1f5fe
```

## 🚀 Performance Optimization

```mermaid
graph TD
    subgraph "Build Optimization"
        TC[Tree Shaking]
        CB[Code Splitting]
        IMG[Image Optimization]
    end

    subgraph "Runtime Optimization"
        MEM[Memoization<br/>React.memo]
        LAZ[Lazy Loading]
        VIR[Virtualization]
    end

    subgraph "Caching Strategy"
        BSC[Browser Cache]
        API[API Response Cache]
        ISR[ISR/SSG]
    end

    subgraph "Bundle Analysis"
        BA[Bundle Analyzer]
        DEP[Dependency Analysis]
        SIZE[Size Monitoring]
    end

    TC --> BA
    CB --> BA
    IMG --> BA
    MEM --> VIR
    LAZ --> VIR
    BSC --> API
    API --> ISR
    BA --> DEP
    DEP --> SIZE

    style TC fill:#e8f5e8
    style CB fill:#e8f5e8
    style IMG fill:#e8f5e8
    style MEM fill:#e1f5fe
    style LAZ fill:#e1f5fe
    style VIR fill:#e1f5fe
    style BSC fill:#fff3e0
    style API fill:#fff3e0
    style ISR fill:#fff3e0
    style BA fill:#f3e5f5
    style DEP fill:#f3e5f5
    style SIZE fill:#f3e5f5
```

## 📋 Key Design Patterns

### Repository Pattern
```mermaid
classDiagram
    class IAuthRepository {
        +login(email, password): AuthResult
        +register(userData): AuthResult
        +logout(): void
        +refreshToken(): AuthTokens
        +getProfile(): User
        +updateProfile(userData): User
    }

    class AuthRepository {
        +login(email, password): AuthResult
        +register(userData): AuthResult
        +logout(): void
        +refreshToken(): AuthTokens
        +getProfile(): User
        +updateProfile(userData): User
    }

    IAuthRepository <|.. AuthRepository : implements
```

### Use Case Pattern
```mermaid
classDiagram
    class LoginUseCase {
        -authRepository: IAuthRepository
        +execute(email, password): AuthResult
        -validateInput(email, password): void
        -validateLoginResult(result): void
        -handleLoginError(error): Error
    }

    class IAuthRepository {
        +login(email, password): AuthResult
    }

    LoginUseCase --> IAuthRepository : depends on
```

### Dependency Injection
```mermaid
classDiagram
    class DependencyContainer {
        +authService: AuthService
        +userManagementService: UserManagementService
        +loginUseCase: LoginUseCase
        +authRepository: AuthRepository
    }

    class AuthService {
        -loginUseCase: LoginUseCase
        -registerUseCase: RegisterUseCase
        -logoutUseCase: LogoutUseCase
        -authRepository: AuthRepository
    }

    DependencyContainer --> AuthService : provides
    AuthService --> LoginUseCase : injects
```

## 🔄 Development Workflow

```mermaid
flowchart TD
    A[Feature Request] --> B[Create User Story]
    B --> C[Design Solution]
    C --> D[Create Use Case]
    D --> E[Implement Domain Logic]
    E --> F[Create Repository Interface]
    F --> G[Implement Repository]
    G --> H[Create Application Service]
    H --> I[Implement Use Case]
    I --> J[Create UI Components]
    J --> K[Add State Management]
    K --> L[Implement API Integration]
    L --> M[Add Error Handling]
    M --> N[Write Tests]
    N --> O[Code Review]
    O --> P[Merge to Main]

    style A fill:#e3f2fd
    style B fill:#e3f2fd
    style C fill:#f3e5f5
    style D fill:#f3e5f5
    style E fill:#e8f5e8
    style F fill:#e8f5e8
    style G fill:#fff3e0
    style H fill:#fff3e0
    style I fill:#e1f5fe
    style J fill:#e1f5fe
    style K fill:#fce4ec
    style L fill:#fce4ec
    style M fill:#ffebee
    style N fill:#ffebee
    style O fill:#c8e6c9
    style P fill:#c8e6c9
```

## 📊 Technology Stack Overview

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 16 | React framework with App Router |
| **Language** | TypeScript 5 | Type-safe JavaScript |
| **UI Library** | React 19 | Component library |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Components** | Shadcn-UI + Radix UI | Accessible component library |
| **State Management** | Zustand | Global state management |
| **Forms** | React Hook Form + Zod | Form handling and validation |
| **HTTP Client** | Axios | API communication |
| **Icons** | Lucide React | Icon library |
| **Charts** | Recharts | Data visualization |
| **Notifications** | Sonner | Toast notifications |

This architecture provides a scalable, maintainable, and testable foundation for the ABC Dashboard application.
