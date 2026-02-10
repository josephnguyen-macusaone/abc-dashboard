# Development Setup

This guide covers setting up the ABC Dashboard frontend for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or later
- **npm** 8.x or later (comes with Node.js)
- **Git** for version control

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd abc-dashboard/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and configure the required environment variables.

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── domain/           # Business entities and rules
│   ├── application/      # Use cases and application logic
│   ├── infrastructure/   # External APIs and storage
│   ├── presentation/     # UI components and hooks
│   └── shared/           # Cross-cutting utilities
├── docs/                 # Documentation (you're here!)
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Authentication
NEXT_PUBLIC_JWT_SECRET=your-jwt-secret

# Email Service (for development)
NEXT_PUBLIC_EMAIL_SERVICE=gmail
NEXT_PUBLIC_EMAIL_USER=your-email@gmail.com
NEXT_PUBLIC_EMAIL_PASS=your-app-password

# Database (if using local)
DATABASE_URL=mongodb://localhost:27017/abc-dashboard

# Other settings
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_NAME="ABC Dashboard"
```

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run type-check` | Run TypeScript type checking |

## 🔍 Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the Clean Architecture patterns
   - Add appropriate tests
   - Update documentation if needed

3. **Run quality checks**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

## 🐛 Troubleshooting

### Common Issues

**Port 3000 already in use**
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

**Environment variables not loading**
- Ensure `.env.local` is in the root directory
- Restart the development server after changing env vars
- Check that variable names match exactly

**API connection issues**
- Verify the backend API is running
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure CORS is properly configured on the backend

**Build failures**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Next.js cache: `rm -rf .next`
- Check TypeScript errors: `npm run type-check`
