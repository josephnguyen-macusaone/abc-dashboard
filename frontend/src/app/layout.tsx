import React from 'react';
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import dynamic from 'next/dynamic';

// Dynamic imports for code splitting
const NuqsAdapter = dynamic(() => import('nuqs/adapters/next/app').then(mod => ({ default: mod.NuqsAdapter })), {
  loading: () => null
});

const AuthProvider = dynamic(() => import('@/presentation/contexts').then(mod => ({ default: mod.AuthProvider })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>
});

const UserProvider = dynamic(() => import('@/presentation/contexts').then(mod => ({ default: mod.UserProvider })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading user data...</div>
});

const ToastProvider = dynamic(() => import('@/presentation/contexts').then(mod => ({ default: mod.ToastProvider })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading notifications...</div>
});

const ThemeProvider = dynamic(() => import('@/presentation/contexts').then(mod => ({ default: mod.ThemeProvider })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading theme...</div>
});

const ErrorProvider = dynamic(() => import('@/presentation/contexts').then(mod => ({ default: mod.ErrorProvider })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading error handling...</div>
});

const Toaster = dynamic(() => import('@/presentation/components/atoms').then(mod => ({ default: mod.Toaster })), {
  loading: () => null
});

const ErrorBoundary = dynamic(() => import('@/presentation/components/organisms/error-handling/error-boundary').then(mod => ({ default: mod.ErrorBoundary })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading application...</div>
});

const RouteSuspense = dynamic(() => import('@/presentation/components/routes/suspense-route').then(mod => ({ default: mod.RouteSuspense })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Initializing application...</div>
});

const ServiceWorkerProvider = dynamic(() => import('@/presentation/components/providers/service-worker-provider').then(mod => ({ default: mod.ServiceWorkerProvider })), {
  loading: () => null
});

import "./globals.css";

// Configure Archivo font for display/headings
const archivo = Archivo({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700", "800", "900"],
  preload: false,
});

// Configure Inter font for body/UI text
const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ABC Salon",
};

// Theme script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      const stored = localStorage.getItem('theme-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        const theme = parsed.state?.theme;
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      }
    } catch (e) {
      // Ignore errors
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${inter.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <ErrorProvider>
                <AuthProvider>
                  <UserProvider>
                    <NuqsAdapter>
                      <ServiceWorkerProvider>
                        <RouteSuspense message="Initializing application...">
                          {children}
                        </RouteSuspense>
                        <Toaster />
                      </ServiceWorkerProvider>
                    </NuqsAdapter>
                  </UserProvider>
                </AuthProvider>
              </ErrorProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
