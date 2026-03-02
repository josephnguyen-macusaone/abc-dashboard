// Barrel exports for all React contexts and theme (Zustand-backed)
export { useTheme, useThemeAware } from '@/presentation/hooks/use-theme';
export { ThemeStoreHydration as ThemeProvider } from '@/presentation/components/providers/theme-store-hydration';
export { useToast, ToastProvider } from './toast-context';
export { useErrorHandler, ErrorProvider } from './error-context';