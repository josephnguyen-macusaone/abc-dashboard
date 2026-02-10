# Core Concepts

This document introduces the fundamental concepts and architectural principles used in the ABC Dashboard frontend application.

## 🏛️ Clean Architecture

The application follows **Clean Architecture** principles with four distinct layers:

### 1. Domain Layer (`src/domain/`)
**What it contains:**
- Business entities (User, License, etc.)
- Business rules and validations
- Repository interfaces
- Domain services

**Key principle:** Framework-independent business logic

```typescript
// Example: User entity
export class User {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly role: UserRole,
    public readonly isActive: boolean
  ) {}

  canManageUsers(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.MANAGER;
  }
}
```

### 2. Application Layer (`src/application/`)
**What it contains:**
- Use cases (application-specific business logic)
- Application services
- DTOs (Data Transfer Objects)
- Validators

**Key principle:** Orchestrates domain objects to fulfill use cases

```typescript
// Example: Use case for user login
export class LoginUseCase {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly tokenService: ITokenService
  ) {}

  async execute(credentials: LoginCredentials): Promise<LoginResult> {
    // Validate input
    // Check user exists
    // Verify password
    // Generate tokens
    // Return result
  }
}
```

### 3. Infrastructure Layer (`src/infrastructure/`)
**What it contains:**
- Repository implementations
- API clients
- External service integrations
- State management stores
- File storage, caching, etc.

**Key principle:** Implements interfaces defined in domain/application layers

```typescript
// Example: Repository implementation
export class AuthRepository implements IAuthRepository {
  constructor(private readonly apiClient: AxiosInstance) {}

  async login(credentials: LoginCredentials): Promise<User> {
    const response = await this.apiClient.post('/auth/login', credentials);
    return UserMapper.toDomain(response.data);
  }
}
```

### 4. Presentation Layer (`src/presentation/`)
**What it contains:**
- React components (Atoms, Molecules, Organisms)
- Pages and routing
- UI state management
- Hooks and contexts

**Key principle:** Thin layer that displays information and captures user input

```typescript
// Example: React component using Clean Architecture
export function LoginForm() {
  const { login } = useAuth(); // Application layer hook

  const handleSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## 🧬 Atomic Design

UI components are organized using **Atomic Design** principles:

### Atoms (Basic building blocks)
- `Button`, `Input`, `Typography`
- Smallest reusable components
- No business logic

### Molecules (Combinations of atoms)
- `FormField`, `NavigationButton`
- Simple composite components
- May contain basic state

### Organisms (Complex components)
- `LoginForm`, `UserTable`, `Sidebar`
- Feature-complete components
- May contain business logic

### Pages (Route-level components)
- `LoginPage`, `DashboardPage`
- Route-specific layouts
- Orchestrate organisms

### Templates (Page layouts)
- `AuthTemplate`, `DashboardTemplate`
- Provide consistent layouts
- Handle navigation and structure

## 🏗️ Design Patterns

### Repository Pattern
Abstracts data access logic, allowing different implementations (API, local storage, etc.)

```typescript
interface IUserRepository {
  findById(id: string): Promise<User>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
}
```

### Dependency Injection
Loose coupling through constructor injection rather than direct instantiation.

```typescript
// Instead of:
const userService = new UserService();

// Use:
constructor(private readonly userRepository: IUserRepository) {}
```

### Observer Pattern
Reactive state management using Zustand stores and React Context.

```typescript
// Zustand store
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    const user = await authApi.login(credentials);
    set({ user, isAuthenticated: true });
  },
}));
```

## 🔄 Data Flow

```
User Interaction → Presentation Layer → Application Layer → Domain Layer → Infrastructure Layer → External APIs
                                      ↓
Response: External APIs → Infrastructure Layer → Domain Layer → Application Layer → Presentation Layer → UI Update
```

## 🧪 Testing Strategy

- **Unit Tests**: Domain and application layer logic
- **Integration Tests**: API interactions and repositories
- **Component Tests**: React components with Testing Library
- **E2E Tests**: Critical user flows with Playwright

## 📋 Code Organization Principles

1. **Single Responsibility**: Each class/function has one reason to change
2. **Dependency Inversion**: Depend on abstractions, not concretions
3. **Interface Segregation**: Clients depend only on methods they use
4. **Open/Closed**: Open for extension, closed for modification
5. **DRY**: Don't Repeat Yourself
6. **SOLID**: Five principles for maintainable code

## 🔗 Key Technologies

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Hook Form**: Form state management
- **Axios**: HTTP client with interceptors
- **Zod**: Schema validation
