# ABC Dashboard Frontend

A modern, scalable dashboard application built with Next.js 16, React 19, and TypeScript, featuring Clean Architecture principles, advanced theming, and comprehensive component library.

## 🏗️ Architecture

This project follows **Clean Architecture** principles with the following structure:

```
src/
├── app/              # Next.js App Router
├── domain/           # Business Logic Layer
├── application/      # Application Logic Layer
├── infrastructure/   # External Concerns Layer
├── presentation/     # UI Components Layer
└── shared/           # Shared Utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Backend server running on port 5000

## 🛠️ Technology Stack

### Core Framework
- **Next.js 16.0.1** - React framework with App Router
- **React 19.2.0** - UI library with concurrent features
- **TypeScript 5** - Type-safe JavaScript

### State Management & Data
- **Custom React Contexts** - Theme and error handling contexts
- **Zustand** - Authentication state management
- **Axios** - HTTP client for API communication
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **JWT** - Token handling

### UI & Styling
- **Tailwind CSS v4** - Utility-first CSS framework
- **Shadcn-UI** - Modern component library built on Radix UI
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **Recharts** - Data visualization

### Development Tools
- **ESLint 9** - Code linting with Next.js config
- **TypeScript** - Type checking
- **Shadcn-UI + CVA** - Component library with variant system
- **clsx/tailwind-merge** - Conditional styling

### Installation

1. **Clone and install dependencies:**
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. **Set up environment variables:**
```bash
# Copy the environment example
cp env.example .env.local

# Or create environment-specific files:
cp env.example .env.development  # For development
cp env.example .env.staging     # For staging
cp env.example .env.production  # For production

# Edit with your configuration
# Note: .env.local is for local development and is not committed to git
```

3. **Start the development server:**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

## ⚙️ Environment Configuration

### Environment Files

The application supports multiple environment configurations:

- **`.env.local`** - Local development (highest priority, not committed)
- **`.env.development`** - Development environment
- **`.env.staging`** - Staging environment
- **`.env.production`** - Production environment

### Environment Variables

#### Required Variables

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### Optional Variables

```bash
# Application Environment
NEXT_PUBLIC_APP_ENV=development

# External Services
NEXT_PUBLIC_GA_TRACKING_ID=
NEXT_PUBLIC_SENTRY_DSN=
```

### Environment-Specific Configurations

#### Development (`.env.development`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

#### Staging (`.env.staging`)
```bash
NEXT_PUBLIC_API_URL=https://api-staging.yourdomain.com/api
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

#### Production (`.env.production`)
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
```

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router (Route Groups & Pages)
│   ├── (auth)/               # Route group for authentication pages
│   │   ├── login/            # Login page
│   │   ├── register/         # Register page
│   │   └── verify-email/     # Email verification page
│   ├── dashboard/            # Protected dashboard routes
│   │   └── [role]/           # Dynamic role-based routes
│   ├── profile/              # User profile page
│   ├── layout.tsx            # Root layout with providers
│   ├── page.tsx              # Home/landing page
│   ├── globals.css           # Global styles & custom color system
│   └── favicon.ico           # Application favicon
├── domain/                   # Domain Layer (Business Rules)
│   ├── entities/             # Domain entities (User, etc.)
│   ├── repositories/         # Repository interfaces/contracts
│   └── services/             # Domain services (Auth logic, etc.)
├── application/              # Application Layer (Use Cases)
│   ├── services/             # Application services
│   └── use-cases/            # Use case implementations
├── infrastructure/           # Infrastructure Layer (External Concerns)
│   ├── api/                  # HTTP client & API services
│   │   ├── auth.ts           # Authentication API
│   │   ├── client.ts         # Axios client configuration
│   │   ├── errors.ts         # Error handling utilities
│   │   ├── index.ts          # API exports
│   │   └── types.ts          # API type definitions
│   ├── repositories/         # Repository implementations
│   ├── storage/              # Storage utilities (localStorage, cookies)
│   └── stores/               # State management (Zustand stores)
├── presentation/             # Presentation Layer (UI)
│   ├── components/           # React components (Atomic Design)
│   │   ├── atoms/            # Basic UI components
│   │   │   ├── forms/        # Form elements (Input, Label, Select)
│   │   │   ├── ui/           # All UI components (Shadcn-UI + Display components)
│   │   │   └── permission-guard.tsx # Route protection components
│   │   ├── molecules/        # Composite components
│   │   │   ├── common/       # Common molecules (Breadcrumb, Search, etc.)
│   │   │   ├── dashboard/    # Dashboard-specific molecules
│   │   │   ├── form/         # Form molecules (Password field, etc.)
│   │   │   └── sidebar/      # Sidebar components
│   │   ├── organisms/        # Complex components
│   │   │   ├── common/       # Common organisms (Error boundary, etc.)
│   │   │   └── form/         # Form organisms (Login, Register forms)
│   │   ├── pages/            # Page-level components
│   │   ├── routes/           # Route protection components
│   │   └── templates/        # Layout templates (Auth, Dashboard)
│   ├── contexts/             # React contexts (Auth, Theme)
│   └── hooks/                # Custom React hooks
└── shared/                   # Shared Utilities
    ├── constants/            # Application constants (API, Auth, Dashboard, Security, UI)
    ├── types/                # TypeScript type definitions
    └── utils/                # Utility functions (logger, retry, tracing)
```

## 🔧 Available Scripts

### Development
```bash
npm run dev        # Start development server on http://localhost:3000
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint code analysis
```

### Production Build
```bash
npm run build      # Create optimized production build
npm run start      # Serve production build
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run e2e tests (if configured)
npm run test:e2e
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Environment Variables for Deployment
Make sure to set these in your deployment platform:

- `NEXT_PUBLIC_API_URL` - Your backend API URL
- `NEXT_PUBLIC_APP_ENV` - Environment (production)
- `NEXT_PUBLIC_SENTRY_DSN` - Error reporting (optional)

## 🔐 Authentication & Authorization

### Authentication Flow
- **JWT-based authentication** with access and refresh tokens
- **Email verification** for account activation
- **Secure token storage** using HTTP-only cookies and localStorage
- **Automatic token refresh** for seamless user experience

### Route Protection
- **Protected Routes**: Dashboard and profile routes require authentication
- **Role-based Access**: Dynamic routes based on user roles (`/dashboard/[role]`)
- **Route Groups**: Authentication routes organized under `(auth)` group
- **Middleware Protection**: Server-side route protection

### User Management
- **Registration**: New user signup with email verification
- **Login/Logout**: Secure authentication with session management
- **Profile Management**: User profile updates and password changes
- **Session Persistence**: Maintain user sessions across browser refreshes

## 🔒 Security

This application implements several security measures:

- **CSRF Protection** - Server-side validation
- **Rate Limiting** - API request throttling
- **Input Sanitization** - XSS prevention
- **JWT Authentication** - Secure token-based auth
- **HTTPS Only** - Secure connections in production
- **Input Validation** - Zod schema validation for all forms

## 🛠️ Development Guidelines

### Architecture Principles
- **Clean Architecture**: Domain → Application → Infrastructure → Presentation layers
- **Atomic Design**: Atoms → Molecules → Organisms → Pages → Templates
- **Component Composition**: Favor composition over inheritance

### Code Quality
- **TypeScript**: Strict type checking enabled for all new code
- **ESLint**: Modern flat config with Next.js rules
- **Clean Architecture**: Separation of business logic from framework concerns

### State Management
- **Custom React Contexts**: Theme management with localStorage persistence
- **Error Context**: Comprehensive error handling with recovery mechanisms
- **Toast Context**: Notification system with positioning and actions
- **Zustand**: Authentication state with persist middleware
- **React Hook Form**: Form state management with Zod validation

### Commit Convention
```
feat: add new feature
fix: bug fix
docs: documentation update
style: code style changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Branch Naming
```
feature/feature-name
bugfix/bug-description
hotfix/critical-fix
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass
6. Submit a pull request

## 🆕 Recent Improvements

### Code Quality & Architecture
- **Atoms Reorganization**: Merged display/ui components into unified ui folder
- **Constants Cleanup**: Removed unused constants files (app.ts, errors.ts, routes.ts, validation.ts)
- **Context Optimization**: Improved useCallback dependencies for better performance
- **Theme System**: Custom theme context with localStorage persistence (removed next-themes)
- **Error Handling**: Enhanced error context with comprehensive recovery mechanisms

### Component Library
- **Typography System**: Complete design system with variants and composition utilities
- **Form Components**: Enhanced input styling with better focus states
- **Toast Notifications**: Bottom-right positioning with action support
- **Button Alignment**: Improved icon-text alignment in button components

### Developer Experience
- **Type Safety**: Fixed UserRole enum type issues in user management
- **Build Optimization**: Removed unused dependencies and dead code
- **Documentation**: Updated project structure and architecture details

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, please contact the development team or create an issue in the repository.

---

Built with ❤️ using [Next.js 16](https://nextjs.org), [React 19](https://reactjs.org), [TypeScript](https://www.typescriptlang.org), [Tailwind CSS v4](https://tailwindcss.com), [Shadcn-UI](https://ui.shadcn.com), and modern React patterns
