// Barrel exports for all React contexts
// This provides a single import point for all context providers and hooks

export { useAuth, AuthProvider } from './auth-context';
export { useTheme, ThemeProvider } from './theme-context';
export { useUser, UserProvider } from './user-context';
export { useToast, ToastProvider } from './toast-context';
export { useErrorHandler, ErrorProvider } from './error-context';