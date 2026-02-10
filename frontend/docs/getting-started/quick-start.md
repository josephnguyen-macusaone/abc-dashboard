# Quick Start Guide

Get up and running with the ABC Dashboard frontend in minutes.

## ⚡ 5-Minute Setup

### 1. Prerequisites
- Node.js 18+
- npm 8+

### 2. Clone & Install
```bash
git clone <repository-url>
cd abc-dashboard/frontend
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your settings
```

### 4. Start Development
```bash
npm run dev
```

**🎉 You're done!** Visit `http://localhost:3000`

## 📖 What Just Happened?

You now have a fully functional dashboard with:

- ✅ **Clean Architecture** - Well-organized, maintainable code
- ✅ **Type Safety** - Full TypeScript coverage
- ✅ **Modern UI** - Beautiful, responsive interface
- ✅ **Authentication** - Secure login/logout
- ✅ **User Management** - Admin panel for user operations
- ✅ **Dashboard** - Analytics and metrics display

## 🗺️ Explore the App

### Authentication
- Visit `/login` - User login
- Visit `/register` - New user registration
- Visit `/verify-email` - Email verification flow

### Dashboard (Admin Only)
- Visit `/dashboard` - Main dashboard with metrics
- Visit `/dashboard/users` - User management interface

### Profile Management
- Visit `/profile` - View/edit profile
- Change password functionality

## 🔧 Common Next Steps

### Connect to Backend
```bash
# In .env.local
NEXT_PUBLIC_API_URL=https://your-backend-api.com/api
```

### Customize Styling
- Modify `tailwind.config.ts` for theme colors
- Update components in `src/presentation/components/`
- Adjust fonts and spacing in `src/shared/styles/`

### Add New Features
1. Create domain entities in `src/domain/`
2. Add use cases in `src/application/`
3. Implement UI in `src/presentation/`
4. Add API integration in `src/infrastructure/`

### Run Tests
```bash
npm run test          # Unit tests
npm run lint          # Code quality
npm run type-check    # Type checking
```

## 🆘 Need Help?

- 📖 **Documentation**: Check `/docs/` for detailed guides
- 🐛 **Issues**: Report bugs in the repository
- 💬 **Discussions**: Ask questions in discussions
- 📧 **Support**: Contact the development team

## 🚀 Going Further

- [Setup Guide](./setup.md) - Complete development environment
- [Core Concepts](./concepts.md) - Understand the architecture
- [Architecture Overview](../architecture/overview.md) - Deep dive into system design
- [Component Structure](../components/atomic-design.md) - UI component organization
- [API Integration](../infrastructure/api-integration.md) - Backend communication
