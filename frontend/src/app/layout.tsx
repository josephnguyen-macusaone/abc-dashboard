import React from 'react';
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import dynamic from 'next/dynamic';
import { ThemeProvider } from '@/presentation/contexts/theme-context';
import { ThemeScript } from '@/shared/scripts/theme-script';

// Dynamic imports for code splitting
const NuqsAdapter = dynamic(() => import('nuqs/adapters/next/app').then(mod => ({ default: mod.NuqsAdapter })), {
  loading: () => null
});

const AuthInitializer = dynamic(() => import('@/presentation/components/atoms/auth/auth-initializer').then(mod => ({ default: mod.AuthInitializer })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>
});

const UserProvider = dynamic(() => import('@/presentation/contexts').then(mod => ({ default: mod.UserProvider })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading user data...</div>
});

const ToastProvider = dynamic(() => import('@/presentation/contexts').then(mod => ({ default: mod.ToastProvider })), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading notifications...</div>
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


import "./globals.css";

// Configure Archivo font for display/headings
// Optimized: reduced weights and subsets for better performance
const archivo = Archivo({
  subsets: ["latin", "latin-ext"], // Removed vietnamese to reduce size
  display: "swap", // Prevents invisible text during font load
  variable: "--font-archivo",
  weight: ["500", "600"], // Only load weights actually used (500 for display-m, 600 for xl/l)
  preload: false, // Don't preload display font - let body font load first
  fallback: ["system-ui", "sans-serif"],
});

// Configure Inter font for body/UI text
// Optimized: reduced weights. preload: false avoids "preloaded but not used" browser warnings
// (common when display: optional or when dynamic content delays font usage)
const inter = Inter({
  subsets: ["latin", "latin-ext"], // Removed vietnamese to reduce size
  display: "swap", // Ensures font is used when loaded; avoids preload warning with optional
  variable: "--font-inter",
  weight: ["400", "500", "600"], // Removed 700 - use 600 as bold (semibold is sufficient)
  preload: false, // Avoids "resource preloaded but not used within a few seconds" warning
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "ABC Salon",
  description: "ABC Salon Dashboard - Professional Salon Management System",
  keywords: ["salon", "dashboard", "management", "booking", "appointment"],
  authors: [{ name: "ABC Salon Team" }],
  robots: "noindex, nofollow", // Add appropriate robots meta for production
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// Font preloading is handled by Next.js Google Fonts automatically


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <ErrorProvider>
                <AuthInitializer>
                  <UserProvider>
                    <NuqsAdapter>
                      <RouteSuspense message="Initializing application...">
                        {children}
                      </RouteSuspense>
                      <Toaster />
                    </NuqsAdapter>
                  </UserProvider>
                </AuthInitializer>
              </ErrorProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
