# Development Documentation

This section covers development practices, testing strategies, performance optimization, and coding standards for the ABC Dashboard frontend.

## 📚 Development Documents

| Document | Description | Key Topics |
|----------|-------------|------------|
| **Testing** (below) | Testing strategy, conventions, and how to add tests | Unit tests, use-cases, domain, mocks |
| **[Performance](./performance.md)** | Performance optimization techniques | Bundle analysis, lazy loading, caching |
| **[Conventions](./conventions.md)** | Code style and development standards | Naming conventions, file structure, best practices |

## 🧪 Testing

### Testing pyramid

```
End-to-End Tests (E2E)
├── Integration Tests
│   ├── Component Tests
│   │   ├── Unit Tests
```

**Unit tests:** Domain business logic, utilities, component/hook logic.  
**Integration tests:** Repositories, multi-component flows, forms, state.  
**E2E tests:** Critical user journeys, auth, data flows, cross-browser.

### Where tests live

- **Location:** Next to the code under `src/**/__tests__/`.
- **Pattern:** `src/<layer>/<module>/__tests__/<module>.test.ts` or `<name>.spec.ts`.
- **Examples:**
  - `src/domain/entities/__tests__/license-entity.test.ts` – domain entities
  - `src/application/use-cases/license/__tests__/get-licenses-usecase.test.ts` – use-cases

Jest discovers tests via `testMatch`: `<rootDir>/src/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)`.

### What to mock

**Domain** – No infrastructure. Use factory methods (e.g. `License.fromPersistence`, `License.create`) with explicit props so tests don’t rely on `crypto.randomUUID()` or other globals in Jest.

**Application (use-cases)** – Mock repository interfaces (`ILicenseRepository`, `IUserRepository`, etc.). Implement only the methods the use-case calls (e.g. `findAll`). Use `jest.fn().mockResolvedValue(...)` / `mockRejectedValue(...)`. Inject the mock into the use-case constructor; don’t mock the DI container.

```ts
const mockRepo = {
  findAll: jest.fn().mockResolvedValue({
    licenses: [License.fromPersistence({ ... })],
    total: 1,
    pagination: { page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false },
  }),
  // stub other methods for type satisfaction
} as unknown as ILicenseRepository;
const useCase = new GetLicensesUseCaseImpl(mockRepo);
```

**Stores (optional)** – Prefer testing use-cases and repositories. For store actions (e.g. loading/error state), mock the container or service if needed.

### Coverage expectations

- **New use-cases:** Test that the use-case calls the repository with the right params, maps results to DTOs, and propagates errors.
- **New domain entities / value objects:** Test construction, validation (invalid inputs throw), and core methods (e.g. `Money.add`, `License.cancel`).
- **New store actions:** Cover via use-case tests where possible; add store tests only for state transitions or side effects.

Coverage thresholds are in `jest.config.js`; new code should not lower overall coverage.

### Running tests

| Command | Purpose |
|---------|---------|
| `npm run test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run test:ci` | CI (with coverage) |

## ⚡ Performance Optimization

### Bundle Optimization
- **Code Splitting**: Route-based and component-based splitting
- **Tree Shaking**: Remove unused code from bundles
- **Dynamic Imports**: Lazy loading of components and routes

### Runtime Performance
- **Memoization**: React.memo, useMemo, useCallback
- **Virtual Scrolling**: Large list virtualization
- **Image Optimization**: Next.js Image component
- **Caching Strategies**: API response caching

### Monitoring
- **Core Web Vitals**: LCP, FID, CLS tracking
- **Bundle Size**: Automated bundle size monitoring
- **Memory Usage**: Component memory leak detection

## 📋 Development Standards

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with React and TypeScript rules
- **Prettier**: Automated code formatting
- **Husky**: Git hooks for quality gates

### Commit Standards
- **Conventional Commits**: Structured commit messages
- **Atomic Commits**: Single responsibility per commit
- **Descriptive Messages**: Clear and actionable commit descriptions

### Branch Strategy
- **Feature Branches**: `feature/description`
- **Bug Fixes**: `fix/description`
- **Documentation**: `docs/description`
- **Main Branch**: Protected with required checks

## 🛠️ Development Workflow

### Local Development
1. **Setup**: Follow getting started guide
2. **Feature Development**: Create feature branch
3. **Code Changes**: Implement with tests
4. **Quality Checks**: Run linting and tests
5. **Commit**: Follow commit conventions
6. **Pull Request**: Create PR with description

### Code Review Process
1. **Automated Checks**: CI/CD pipeline validation
2. **Peer Review**: Code review by team members
3. **Testing**: Manual testing of functionality
4. **Merge**: Squash merge to main branch

### Release Process
1. **Version Bump**: Semantic versioning
2. **Changelog**: Update release notes
3. **Testing**: Full regression testing
4. **Deployment**: Automated deployment pipeline

## 🔧 Development Tools

### IDE Configuration
- **VS Code**: Recommended IDE
- **Extensions**: TypeScript, ESLint, Prettier, Tailwind CSS
- **Settings**: Shared workspace settings

### CLI Tools
- **npm scripts**: Standardized development commands
- **Custom Scripts**: Project-specific automation
- **Git Hooks**: Pre-commit and pre-push hooks

### Monitoring Tools
- **Browser DevTools**: Performance and debugging
- **React DevTools**: Component inspection
- **Redux DevTools**: State inspection (if applicable)

## 📖 Reading Order

1. **Testing** (above) – Conventions and how to add tests
2. **[Performance](./performance.md)** – Optimization techniques
3. **[Conventions](./conventions.md)** – Coding standards

## 🔗 Related Documentation

- **[Getting Started](../getting-started/)** - Initial setup
- **[Architecture](../architecture/)** - System design
- **[Components](../components/)** - UI development
- **[Infrastructure](../infrastructure/)** - Deployment and integrations
