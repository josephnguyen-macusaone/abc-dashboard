import React from 'react';
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import dynamic from 'next/dynamic';
import { ThemeProvider } from '@/presentation/contexts/theme-context';

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
// Only preload the most commonly used weights to reduce initial load
const archivo = Archivo({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap", // Prevents invisible text during font load
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"], // Removed 800, 900 to reduce bundle size
  preload: false, // Don't preload - let browser handle loading
  fallback: ["system-ui", "sans-serif"], // Better fallbacks
});

// Configure Inter font for body/UI text
// Inter is more commonly used, so preload the regular weight
const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap", // Prevents invisible text during font load
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  preload: true, // Preload the most common weight for better UX
  fallback: ["system-ui", "sans-serif"], // Better fallbacks
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
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <ErrorProvider>
                <AuthProvider>
                  <UserProvider>
                    <NuqsAdapter>
                      <RouteSuspense message="Initializing application...">
                        {children}
                      </RouteSuspense>
                      <Toaster />
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
