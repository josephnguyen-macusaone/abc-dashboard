# ABC Dashboard - System Overview

This document provides a comprehensive visual overview of the ABC Dashboard system architecture, user flows, and component relationships using Mermaid diagrams.

---

## 🏗️ System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        UI[User Interface<br/>React Components]
        RT[React Table<br/>Data Display]
        RQ[React Query<br/>Data Fetching]
        ZS[Zustand Stores<br/>State Management]
        API[API Services<br/>HTTP Client]
    end

    subgraph "Backend (Node.js/Express)"
        MW[Middleware<br/>Auth & Validation]
        CTL[Controllers<br/>Request Handling]
        SVC[Services<br/>Business Logic]
        REP[Repositories<br/>Data Access]
        DB[(MongoDB<br/>Database)]
    end

    subgraph "Infrastructure"
        MAIL[Gmail/MailHog<br/>Email Service]
        REDIS[(Redis<br/>Cache)]
        MON[Grafana/Prometheus<br/>Monitoring]
    end

    UI --> RQ
    RQ --> API
    API --> MW
    MW --> CTL
    CTL --> SVC
    SVC --> REP
    REP --> DB

    RQ --> ZS
    ZS --> UI

    SVC --> MAIL
    SVC --> REDIS
    CTL --> MON

    style UI fill:#e1f5fe
    style MW fill:#f3e5f5
    style MON fill:#e8f5e8
```

---

## 👥 User Role Hierarchy & Permissions

```mermaid
graph TD
    subgraph "User Roles & Permissions"
        ADMIN[👑 Administrator<br/>Full System Access]
        MANAGER[👨‍💼 Manager<br/>Team Management]
        STAFF[👥 Staff<br/>Limited Access]
    end

    subgraph "Admin Capabilities"
        A1[Create Managers]
        A2[Create Staff]
        A3[Assign Staff to Managers]
        A4[Reassign Staff]
        A5[View All Users]
        A6[Delete Users]
        A7[Full CRUD Operations]
    end

    subgraph "Manager Capabilities"
        M1[Create Staff Members]
        M2[View Assigned Staff]
        M3[Edit Staff Details]
        M4[Manage Team Only]
    end

    subgraph "Staff Capabilities"
        S1[View Own Profile]
        S2[Edit Own Information]
        S3[No Creation Rights]
        S4[No Management Rights]
    end

    ADMIN --> A1
    ADMIN --> A2
    ADMIN --> A3
    ADMIN --> A4
    ADMIN --> A5
    ADMIN --> A6
    ADMIN --> A7

    MANAGER --> M1
    MANAGER --> M2
    MANAGER --> M3
    MANAGER --> M4

    STAFF --> S1
    STAFF --> S2
    STAFF --> S3
    STAFF --> S4

    style ADMIN fill:#ffebee
    style MANAGER fill:#e8f5e8
    style STAFF fill:#e3f2fd
```

---

## 🔐 Complete Authentication & Authorization Flow

```mermaid
stateDiagram-v2
    [*] --> LoginPage
    LoginPage --> ValidateCredentials: Enter email/password
    ValidateCredentials --> InvalidCredentials: Wrong credentials
    InvalidCredentials --> LoginPage: Show error

    ValidateCredentials --> CheckAccountStatus: Valid credentials
    CheckAccountStatus --> EmailVerificationRequired: Account not active
    EmailVerificationRequired --> LoginPage: Show verification message

    CheckAccountStatus --> CheckPasswordReset: Account active
    CheckPasswordReset --> ForcePasswordChange: requiresPasswordChange = true
    ForcePasswordChange --> ChangePasswordPage: Redirect with forced flag

    CheckPasswordReset --> RoleBasedRedirect: requiresPasswordChange = false
    RoleBasedRedirect --> AdminDashboard: Admin role
    RoleBasedRedirect --> ManagerDashboard: Manager role
    RoleBasedRedirect --> StaffDashboard: Staff role

    ChangePasswordPage --> PasswordChanged: User updates password
    PasswordChanged --> ClearForceFlag: requiresPasswordChange = false
    ClearForceFlag --> RoleBasedRedirect

    AdminDashboard --> UserManagement: Admin actions
    ManagerDashboard --> TeamManagement: Manager actions
    StaffDashboard --> ProfileManagement: Staff actions

    note right of ForcePasswordChange : New users must change\ntemporary passwords
    note right of RoleBasedRedirect : Different dashboards\nbased on user role
```

---

## 🚀 User Creation & Onboarding Flow

```mermaid
graph TD
    subgraph "User Creation Process"
        A[Admin/Manager<br/>Clicks Create User] --> B{User Role?}
        B -->|Admin| C[Show Admin Form<br/>Manager + Staff roles]
        B -->|Manager| D[Show Manager Form<br/>Staff role only]

        C --> E[Select Role<br/>Manager/Staff]
        D --> F[Auto-set Role<br/>Staff]

        E --> G{Selected Role?}
        G -->|Manager| H[Create Manager Account<br/>No manager assignment]
        G -->|Staff| I[Choose Manager<br/>Admin only]

        F --> J[Auto-assign to Creator<br/>Manager only]

        H --> K[Generate Temp Password]
        I --> K
        J --> K

        K --> L[Save to Database<br/>requiresPasswordChange: true]
        L --> M[Send Welcome Email<br/>With temp password]
        M --> N[User Created Successfully]
    end

    subgraph "New User Activation"
        O[User Receives Email] --> P[Click Login Link<br/>Or visit login page]
        P --> Q[Enter Email + Temp Password]
        Q --> R[System Validates<br/>requiresPasswordChange: true]
        R --> S[Force Redirect to<br/>Change Password Page]
        S --> T[User Sets New Password]
        T --> U[Clear Force Flag<br/>Set isActive: true]
        U --> V[Redirect to Dashboard]
    end

    style A fill:#e3f2fd
    style O fill:#f3e5f5
```

---

## 👨‍💼 Admin User Management Workflow

```mermaid
graph TD
    subgraph "Admin Dashboard"
        A[Admin Logs In] --> B[User Management Page]
        B --> C{Action Type}
    end

    subgraph "Create Operations"
        C --> D[Create User]
        D --> E[Select Role: Manager/Staff]
        E --> F{Manager Role?}
        F -->|Yes| G[Create Manager Account<br/>No manager assignment]
        F -->|No| H[Select Target Manager<br/>For staff assignment]
        G --> I[Generate Password & Email]
        H --> I
    end

    subgraph "View Operations"
        C --> J[View All Users]
        J --> K[Filter by Role/Status]
        K --> L[Sort by Date/Name]
        L --> M[Paginated Results]
    end

    subgraph "Management Operations"
        C --> N[Select User]
        N --> O{Operation}
        O --> P[Edit User Details]
        O --> Q[Change User Status]
        O --> R[Reassign to Manager]
        O --> S[Delete User]
    end

    subgraph "Staff Reassignment"
        R --> T[Choose New Manager]
        T --> U[Validate Manager Role]
        U --> V[Update managedBy Field]
        V --> W[Send Notification<br/>To new manager]
        W --> X[Audit Log Entry]
    end

    style A fill:#ffebee
    style D fill:#e8f5e8
    style J fill:#e3f2fd
    style N fill:#fff3e0
```

---

## 👨‍💻 Manager Team Management Workflow

```mermaid
graph TD
    subgraph "Manager Dashboard"
        A[Manager Logs In] --> B[Team Management Page]
        B --> C{Can Create Staff?}
        C -->|Yes| D[Create Staff Button<br/>Auto-assign to manager]
        C -->|No| E[View Only Mode]
    end

    subgraph "Staff Creation"
        D --> F[Click Create Staff]
        F --> G[Staff Creation Form<br/>Role auto-set to Staff]
        G --> H[Fill Staff Details<br/>Name, Email, Phone]
        H --> I[Generate Temp Password]
        I --> J[Save with managedBy: managerId]
        J --> K[Send Welcome Email]
        K --> L[Staff Added to Team]
    end

    subgraph "Team Viewing"
        E --> M[View Assigned Staff]
        M --> N[Filter by Status/Role]
        N --> O[Team Member List]
        O --> P{Action on Staff}
        P --> Q[View Staff Details]
        P --> R[Edit Staff Info]
        P --> S[Change Staff Status]
    end

    subgraph "Staff Management"
        Q --> T[Staff Profile View<br/>Read-only for manager]
        R --> U[Edit Allowed Fields<br/>Name, phone, etc.]
        S --> V[Activate/Deactivate<br/>Staff account]
        U --> W[Update Database]
        V --> W
        W --> X[Audit Log Entry]
    end

    style A fill:#e8f5e8
    style D fill:#c8e6c9
    style M fill:#e3f2fd
    style Q fill:#fff3e0
```

---

## 🔄 Password Reset & Recovery Flow

```mermaid
graph TD
    subgraph "Forgot Password Process"
        A[User on Login Page] --> B[Clicks "Forgot Password"]
        B --> C[Forgot Password Form]
        C --> D[Enter Email Address]
        D --> E[Submit Request]
        E --> F[Validate Email Exists]
        F --> G{User Found?}
        G -->|No| H[Silent Success<br/>Security by obscurity]
        G -->|Yes| I{Check Account Status}
        I -->|Inactive| J[Silent Success<br/>Don't reveal status]
        I -->|Active| K[Generate Temp Password]
        K --> L[Update User Record<br/>requiresPasswordChange: true]
        L --> M[Send Email with Temp Password]
        M --> N[Show Success Message]
    end

    subgraph "Password Reset Email"
        M --> O[Email Content]
        O --> P[Subject: Password Reset - ABC Dashboard]
        O --> Q[Temp Password Display]
        O --> R[Security Warning]
        O --> S[Login Instructions]
        O --> T[Change Password Reminder]
    end

    subgraph "Forced Password Change"
        N --> U[User Receives Email]
        U --> V[Clicks Login Link]
        V --> W[Login with Temp Password]
        W --> X[System Detects<br/>requiresPasswordChange: true]
        X --> Y[Redirect to Change Password<br/>With forced flag]
        Y --> Z[Show Special UI<br/>No current password field]
        Z --> AA[User Enters New Password]
        AA --> BB[Validate Password Strength]
        BB --> CC[Update Password]
        CC --> DD[Clear Force Flag<br/>Set isActive: true]
        DD --> EE[Redirect to Dashboard]
        EE --> FF[Show Success Message]
    end

    style A fill:#e3f2fd
    style U fill:#f3e5f5
    style Y fill:#ffebee
```

---

## 🧩 Component Architecture Overview

```mermaid
graph TD
    subgraph "Page Components"
        LP[Login Page] --> LF[Login Form]
        CP[Change Password Page] --> CPF[Change Password Form]
        AD[Admin Dashboard] --> UM[User Management]
        MD[Manager Dashboard] --> TM[Team Management]
        SD[Staff Dashboard] --> PM[Profile Management]
    end

    subgraph "Shared Components"
        UT[User Table] --> UTR[User Table Row]
        UF[User Form] --> UFF[User Form Fields]
        MG[Manager Select] --> MSO[Manager Select Options]
        PG[Permission Guard] --> PGL[Permission Logic]
        TS[Toast System] --> TSM[Toast Messages]
    end

    subgraph "State Management"
        AS[Auth Store] --> ASD[Auth Data]
        US[User Store] --> USD[User Data]
        RQ[React Query] --> RQC[Query Cache]
    end

    subgraph "API Layer"
        AUS[Auth Service] --> AAPI[Auth API Calls]
        UUS[User Service] --> UAPI[User API Calls]
        HT[HTTP Client] --> INT[Interceptors]
    end

    LP --> AS
    FP --> AS
    CP --> AS
    AD --> US
    MD --> US
    SD --> AS

    UT --> US
    UF --> US
    MG --> US

    AS --> AUS
    US --> UUS

    AUS --> HT
    UUS --> HT

    style LP fill:#e3f2fd
    style AD fill:#ffebee
    style MD fill:#e8f5e8
    style SD fill:#fff3e0
```

---

## 📊 Data Flow & State Management

```mermaid
graph TD
    subgraph "User Actions"
        UI[User Interface<br/>Buttons, Forms, Links]
        API[API Calls<br/>HTTP Requests]
        WS[WebSocket<br/>Real-time Updates]
    end

    subgraph "State Management"
        RQ[React Query<br/>Server State]
        ZS[Zustand Stores<br/>Client State]
        LC[Local Storage<br/>Persistence]
    end

    subgraph "Data Processing"
        MW[Middleware<br/>Auth, Validation]
        CTL[Controllers<br/>Business Logic]
        SVC[Services<br/>Data Transformation]
        REP[Repositories<br/>Database Access]
    end

    subgraph "Data Storage"
        DB[(MongoDB<br/>Primary Database)]
        REDIS[(Redis<br/>Cache & Sessions)]
        FS[(File System<br/>Uploads, Logs)]
    end

    UI --> RQ
    UI --> ZS
    RQ --> API
    API --> MW
    MW --> CTL
    CTL --> SVC
    SVC --> REP
    REP --> DB
    REP --> REDIS

    ZS --> LC
    RQ --> ZS
    WS --> RQ

    style UI fill:#e1f5fe
    style RQ fill:#f3e5f5
    style DB fill:#e8f5e8
```

---

## 🚀 Deployment & Infrastructure

```mermaid
graph TB
    subgraph "Development Environment"
        D_DC[Docker Compose Dev]
        D_MB[MailHog<br/>localhost:8025]
        D_FE[Frontend<br/>localhost:3000]
        D_BE[Backend<br/>localhost:5001]
        D_MG[MongoDB<br/>localhost:27017]
        D_RD[Redis<br/>localhost:6379]
    end

    subgraph "Production Environment"
        P_DC[Docker Compose Prod]
        P_GM[Gmail SMTP<br/>Production Email]
        P_FE[Frontend<br/>Nginx Container]
        P_BE[Backend<br/>Node.js Container]
        P_MG[MongoDB<br/>Database Container]
        P_RD[Redis<br/>Cache Container]
    end

    subgraph "CI/CD Pipeline"
        GH[GitHub Actions]
        TST[Test Suite<br/>Unit + Integration]
        BLD[Build Images<br/>Docker Build]
        DEP[Deploy to Server<br/>Docker Compose]
        MON[Monitoring<br/>Health Checks]
    end

    D_DC --> D_MB
    D_DC --> D_FE
    D_DC --> D_BE
    D_DC --> D_MG
    D_DC --> D_RD

    P_DC --> P_GM
    P_DC --> P_FE
    P_DC --> P_BE
    P_DC --> P_MG
    P_DC --> P_RD

    GH --> TST
    TST --> BLD
    BLD --> DEP
    DEP --> MON

    style D_DC fill:#e3f2fd
    style P_DC fill:#e8f5e8
    style GH fill:#ffebee
```

---

## 🎯 User Journey Summary

```mermaid
journey
    title ABC Dashboard User Journey
    section Account Creation
        Admin/Manager: 5: Admin,Manager
        Creates User: 5: Admin,Manager
        System Generates Password: 5: System
        Sends Welcome Email: 5: System
    section User Activation
        New User: 5: Staff
        Receives Email: 5: Staff
        Logs In First Time: 5: Staff
        Forced Password Change: 4: Staff
        Access Granted: 5: Staff
    section Daily Usage
        Regular Login: 5: Admin,Manager,Staff
        Role-Based Dashboard: 5: Admin,Manager,Staff
        Perform Authorized Actions: 5: Admin,Manager,Staff
    section User Management
        Admin: 5: Admin
        Creates/Assigns Users: 5: Admin
        Manager: 5: Manager
        Manages Team: 5: Manager
    section Security
        Any User: 5: Admin,Manager,Staff
        Password Reset: 5: Admin,Manager,Staff
        Secure Access: 5: Admin,Manager,Staff
```

---

## 📈 System Metrics & Monitoring

```mermaid
graph LR
    subgraph "Application Metrics"
        UCT[User Creation Time]
        LRT[Login Response Time]
        PRT[Password Reset Time]
        ART[API Response Time]
    end

    subgraph "Business Metrics"
        UCA[User Creation Rate]
        LSR[Login Success Rate]
        PRS[Password Reset Success]
        UAR[User Activation Rate]
    end

    subgraph "Security Metrics"
        FAL[Failed Login Attempts]
        PRA[Password Reset Attempts]
        UBA[Unauthorized Access Attempts]
        ADT[Audit Log Entries]
    end

    subgraph "Performance Metrics"
        CPU[CPU Usage]
        MEM[Memory Usage]
        DBQ[Database Query Time]
        CAC[Cache Hit Rate]
    end

    UCT --> MON[Monitoring Dashboard]
    LRT --> MON
    PRT --> MON
    ART --> MON

    UCA --> MON
    LSR --> MON
    PRS --> MON
    UAR --> MON

    FAL --> MON
    PRA --> MON
    UBA --> MON
    ADT --> MON

    CPU --> MON
    MEM --> MON
    DBQ --> MON
    CAC --> MON

    MON --> ALT[Alert System]
    ALT --> NOT[Notifications]

    style MON fill:#e8f5e8
    style ALT fill:#ffebee
```

These Mermaid diagrams provide a comprehensive visual overview of the ABC Dashboard system, showing how all components work together, user flows, data architecture, and deployment infrastructure. Each diagram focuses on a specific aspect while maintaining the big-picture view of the entire system. 🎯📊✨
