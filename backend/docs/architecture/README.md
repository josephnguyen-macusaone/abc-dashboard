# Architecture Documentation

This section contains detailed documentation about the system architecture, design patterns, and technical implementation details.

## 📚 Architecture Documents

| Document                                                | Description                                                   | Audience                   |
| ------------------------------------------------------- | ------------------------------------------------------------- | -------------------------- |
| **[Architecture Overview](./architecture-overview.md)** | High-level system design and Clean Architecture principles    | Architects, Tech Leads     |
| **[Domain Layer](./domain-layer.md)**                   | Business entities, domain services, and business rules        | Domain Experts, Developers |
| **[Application Layer](./application-layer.md)**         | Use cases, DTOs, validation, and business logic orchestration | Backend Developers         |
| **[Infrastructure Layer](./infrastructure-layer.md)**   | External services, data access, and technical implementations | DevOps, System Architects  |
| **[Dependency Injection](./dependency-injection.md)**   | DI container configuration and service wiring                 | Developers, Architects     |

## 🏗️ Architecture Principles

### Clean Architecture

- **Separation of Concerns**: Clear boundaries between layers
- **Dependency Inversion**: Inner layers define interfaces, outer layers implement them
- **Testability**: Each layer can be tested independently
- **Framework Independence**: Business logic doesn't depend on external frameworks

### Key Patterns

- **Repository Pattern**: Abstract data access behind interfaces
- **Use Case Pattern**: Business operations as separate use cases
- **Entity Pattern**: Domain objects with business rules and validation
- **Dependency Injection**: Loose coupling through constructor injection

## 🔄 Data Flow

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

## 📁 Directory Structure

```txt
src/
├── domain/              # Business Logic Layer
│   ├── entities/        # Domain entities (User, UserProfile)
│   ├── exceptions/      # Domain-specific exceptions
│   └── repositories/    # Repository interfaces/contracts
├── application/         # Application Layer
│   ├── dto/             # Data Transfer Objects
│   ├── interfaces/      # Service interfaces
│   ├── services/        # Application services
│   ├── use-cases/       # Business use cases
│   └── validators/      # Input validation
├── infrastructure/      # Infrastructure Layer
│   ├── controllers/     # HTTP request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── config/           # Configuration
│   ├── middleware/      # HTTP middleware
│   └── repositories/    # Repository implementations
└── shared/              # Shared Kernel
    ├── kernel/          # Dependency injection container
    ├── services/        # Core services (Auth, Token, Email)
    ├── http/            # HTTP utilities
    └── utils/           # Utility functions
```

## 🔗 Related Documentation

- [Getting Started](../getting-started/README.md) - Quick start and overview
- [API Reference](../api-reference/README.md) - API documentation
- [Operations](../operations/README.md) - Deployment and operations
- [Guides](../guides/README.md) - Specific setup guides
