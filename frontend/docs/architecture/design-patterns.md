# Design Patterns & Principles

This document covers the key design patterns and architectural principles implemented in the ABC Dashboard frontend.

## 🏗️ Architectural Patterns

### Clean Architecture

The application follows Clean Architecture principles with four distinct layers, each with specific responsibilities and dependencies.

#### Layer Responsibilities

**Domain Layer** (`src/domain/`)
- Contains business entities and business rules
- Independent of any external frameworks or libraries
- Defines repository interfaces for data access
- Contains domain services for complex business logic

**Application Layer** (`src/application/`)
- Contains use cases that orchestrate domain objects
- Defines application-specific business rules
- Acts as an intermediary between presentation and domain layers
- Contains DTOs for data transfer

**Infrastructure Layer** (`src/infrastructure/`)
- Implements repository interfaces defined in domain layer
- Contains external API clients and integrations
- Implements data persistence and caching
- Contains UI framework implementations

**Presentation Layer** (`src/presentation/`)
- Contains UI components and user interaction logic
- Implements the application's user interface
- Contains React components organized by Atomic Design
- Manages UI state and user interactions

### Dependency Inversion

High-level modules don't depend on low-level modules. Both depend on abstractions.

```typescript
// ❌ Bad: Direct dependency
class UserService {
  constructor() {
    this.repository = new UserRepository();
  }
}

// ✅ Good: Dependency injection with abstraction
interface IUserRepository {
  findById(id: string): Promise<User>;
  save(user: User): Promise<void>;
}

class UserService {
  constructor(private readonly repository: IUserRepository) {}
}
```

## 🏭 Design Patterns

### Repository Pattern

Abstracts data access logic and provides a consistent interface for data operations.

```typescript
// Domain layer: Interface definition
export interface IUserRepository {
  findById(id: string): Promise<User>;
  findAll(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(id: string, user: Partial<User>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Infrastructure layer: Implementation
export class UserRepository implements IUserRepository {
  constructor(private readonly apiClient: AxiosInstance) {}

  async findById(id: string): Promise<User> {
    const response = await this.apiClient.get(`/users/${id}`);
    return UserMapper.toDomain(response.data);
  }
}
```

### Factory Pattern

Creates objects without specifying the exact class of object that will be created.

```typescript
// API client factory
export class ApiClientFactory {
  static create(baseURL: string): AxiosInstance {
    const client = axios.create({ baseURL });

    // Add interceptors
    client.interceptors.request.use(AuthInterceptor.request);
    client.interceptors.response.use(
      ResponseInterceptor.success,
      ResponseInterceptor.error
    );

    return client;
  }
}
```

### Observer Pattern

Defines a one-to-many dependency between objects so that when one object changes state, all dependents are notified.

```typescript
// Zustand store (Observer pattern implementation)
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const user = await authApi.login(credentials);
      set({ user, isAuthenticated: true, isLoading: false });
      // All subscribers are automatically notified
    } catch (error) {
      set({ error, isLoading: false });
    }
  },
}));
```

### Strategy Pattern

Defines a family of algorithms, encapsulates each one, and makes them interchangeable.

```typescript
// Validation strategies
interface ValidationStrategy {
  validate(value: any): ValidationResult;
}

class EmailValidationStrategy implements ValidationStrategy {
  validate(value: string): ValidationResult {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return { isValid, message: isValid ? '' : 'Invalid email format' };
  }
}

class PasswordValidationStrategy implements ValidationStrategy {
  validate(value: string): ValidationResult {
    const isValid = value.length >= 8;
    return { isValid, message: isValid ? '' : 'Password must be at least 8 characters' };
  }
}

// Usage
const validator = new Validator();
validator.addStrategy('email', new EmailValidationStrategy());
validator.addStrategy('password', new PasswordValidationStrategy());
```

### Singleton Pattern

Ensures only one instance of a class exists and provides global access to it.

```typescript
// API client singleton
export class ApiClient {
  private static instance: AxiosInstance;

  static getInstance(): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = ApiClientFactory.create(
        process.env.NEXT_PUBLIC_API_URL!
      );
    }
    return ApiClient.instance;
  }
}
```

## 🧬 Component Patterns

### Atomic Design Pattern

Organizes UI components hierarchically:

**Atoms** (Basic elements)
```typescript
// Button atom
export function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant }))}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Molecules** (Combinations of atoms)
```typescript
// FormField molecule
export function FormField({ label, error, children, required }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label required={required}>{label}</Label>
      {children}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}
```

**Organisms** (Complex components)
```typescript
// LoginForm organism
export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth();

  const handleSubmit = async (data: LoginFormData) => {
    await login(data);
    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent>
        <Form onSubmit={handleSubmit}>
          <FormField label="Email" required>
            <Input type="email" {...register('email')} />
          </FormField>
          <Button type="submit">Login</Button>
        </Form>
      </CardContent>
    </Card>
  );
}
```

### Higher-Order Components (HOC)

Components that take a component and return a new enhanced component.

```typescript
// withAuth HOC
export function withAuth<T extends {}>(Component: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { user, isLoading } = useAuth();

    if (isLoading) return <LoadingSpinner />;
    if (!user) return <Navigate to="/login" />;

    return <Component {...props} />;
  };
}

// Usage
const ProtectedDashboard = withAuth(Dashboard);
```

### Render Props Pattern

A pattern where a component's prop is a function that returns JSX.

```typescript
// DataFetcher component with render prop
export function DataFetcher<T>({ url, render }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [url]);

  return render({ data, loading });
}

// Usage
<DataFetcher
  url="/api/users"
  render={({ data, loading }) => (
    loading ? <Spinner /> : <UserList users={data} />
  )}
/>
```

### Custom Hooks Pattern

Encapsulates component logic into reusable hooks.

```typescript
// useAuth hook
export function useAuth() {
  const { user, login, logout } = useAuthStore();

  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      await login(credentials);
      toast.success('Login successful');
    } catch (error) {
      toast.error('Login failed');
      throw error;
    }
  }, [login]);

  return {
    user,
    isAuthenticated: !!user,
    login: handleLogin,
    logout,
  };
}
```

## 🧪 Testing Patterns

### Unit Testing Pattern

```typescript
// Testing a domain service
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    service = new UserService(mockRepository);
  });

  it('should create user successfully', async () => {
    const userData = { username: 'john', email: 'john@example.com' };
    mockRepository.save.mockResolvedValue();

    await service.createUser(userData);

    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining(userData)
    );
  });
});
```

### Component Testing Pattern

```typescript
// Testing a React component
describe('LoginForm', () => {
  it('should call onSubmit with form data', async () => {
    const mockLogin = jest.fn();
    const mockOnSuccess = jest.fn();

    render(
      <AuthProvider value={{ login: mockLogin }}>
        <LoginForm onSuccess={mockOnSuccess} />
      </AuthProvider>
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(mockOnSuccess).toHaveBeenCalled();
  });
});
```

## 📋 SOLID Principles

### Single Responsibility Principle
A class should have only one reason to change.

```typescript
// ❌ Bad: Multiple responsibilities
class UserManager {
  createUser(data: UserData): Promise<User> { /* ... */ }
  sendWelcomeEmail(user: User): Promise<void> { /* ... */ }
  generateUserReport(): Promise<Report> { /* ... */ }
}

// ✅ Good: Single responsibility each
class UserService {
  createUser(data: UserData): Promise<User> { /* ... */ }
}

class EmailService {
  sendWelcomeEmail(user: User): Promise<void> { /* ... */ }
}

class ReportService {
  generateUserReport(): Promise<Report> { /* ... */ }
}
```

### Open/Closed Principle
Software entities should be open for extension but closed for modification.

```typescript
// Extensible notification system
interface NotificationService {
  send(message: string, recipient: string): Promise<void>;
}

class EmailNotificationService implements NotificationService {
  async send(message: string, recipient: string): Promise<void> {
    // Send email
  }
}

class SMSNotificationService implements NotificationService {
  async send(message: string, recipient: string): Promise<void> {
    // Send SMS
  }
}

// Usage - can add new notification types without modifying existing code
const services: NotificationService[] = [
  new EmailNotificationService(),
  new SMSNotificationService(),
  // Can easily add new services here
];
```

### Liskov Substitution Principle
Objects of a superclass should be replaceable with objects of its subclasses.

```typescript
// All repository implementations should be interchangeable
interface IUserRepository {
  findById(id: string): Promise<User>;
}

class DatabaseUserRepository implements IUserRepository {
  async findById(id: string): Promise<User> {
    // Database implementation
  }
}

class InMemoryUserRepository implements IUserRepository {
  async findById(id: string): Promise<User> {
    // In-memory implementation
  }
}

// Both can be used interchangeably
async function getUser(repository: IUserRepository, id: string) {
  return repository.findById(id);
}
```

### Interface Segregation Principle
Clients should not be forced to depend on interfaces they don't use.

```typescript
// ❌ Bad: Single large interface
interface IUserService {
  createUser(data: UserData): Promise<User>;
  updateUser(id: string, data: Partial<UserData>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  sendWelcomeEmail(user: User): Promise<void>;
  generateReport(): Promise<Report>;
}

// ✅ Good: Segregated interfaces
interface IUserManagementService {
  createUser(data: UserData): Promise<User>;
  updateUser(id: string, data: Partial<UserData>): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

interface IUserNotificationService {
  sendWelcomeEmail(user: User): Promise<void>;
}

interface IReportService {
  generateReport(): Promise<Report>;
}
```

### Dependency Inversion Principle
Depend on abstractions, not concretions.

```typescript
// ✅ Depend on abstraction
class UserService {
  constructor(private readonly repository: IUserRepository) {}
}

// ❌ Depend on concrete implementation
class UserService {
  constructor() {
    this.repository = new DatabaseUserRepository();
  }
}
```
