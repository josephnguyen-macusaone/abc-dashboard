# Architecture Documentation

This section covers the system architecture, design patterns, and architectural decisions for the ABC Dashboard frontend.

## 📚 Architecture Documents

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[Overview](./overview.md)** | High-level system architecture | Clean Architecture layers, data flow, technology stack |
| **[Clean Architecture](./clean-architecture.md)** | Detailed Clean Architecture implementation | Domain, Application, Infrastructure, Presentation layers |
| **[Design Patterns](./design-patterns.md)** | Design patterns and principles used | Repository, Dependency Injection, Observer, SOLID principles |

## 🏛️ Architecture Overview

The ABC Dashboard frontend follows **Clean Architecture** principles with clear separation of concerns:

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    React Components, UI Logic       │
├─────────────────────────────────────┤
│         Application Layer           │
│    Use Cases, Application Logic     │
├─────────────────────────────────────┤
│           Domain Layer              │
│    Business Entities, Rules         │
├─────────────────────────────────────┤
│       Infrastructure Layer          │
│    External APIs, Storage, UI       │
└─────────────────────────────────────┘
```

## 🔄 Data Flow

```
User Interaction → Presentation → Application → Domain → Infrastructure → External APIs
                                      ↓
Response: External APIs → Infrastructure → Domain → Application → Presentation → UI
```

## 🧬 Component Architecture

Following **Atomic Design** principles:

- **Atoms**: Basic UI components (`Button`, `Input`, `Typography`)
- **Molecules**: Composite components (`FormField`, `NavigationButton`)
- **Organisms**: Complex features (`LoginForm`, `UserTable`, `Sidebar`)
- **Pages**: Route-level components (`LoginPage`, `DashboardPage`)
- **Templates**: Layout components (`AuthTemplate`, `DashboardTemplate`)

## 🏗️ Key Technologies

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand + React Context + React Hook Form
- **API Communication**: Axios with interceptors and retry logic
- **Forms**: React Hook Form with Zod validation

## 📖 Reading Order

1. **[Overview](./overview.md)** - Understand the big picture
2. **[Clean Architecture](./clean-architecture.md)** - Learn the architectural patterns
3. **[Design Patterns](./design-patterns.md)** - Explore specific patterns used
4. **[Component Structure](../components/atomic-design.md)** - See how components are organized
5. **[State Management](../infrastructure/state-management.md)** - Understand state management

## 🔗 Related Documentation

- **[Getting Started](../getting-started/)** - Quick setup and core concepts
- **[Components](../components/)** - UI component organization
- **[Features](../features/)** - Feature-specific implementations
- **[Infrastructure](../infrastructure/)** - External integrations and deployment
