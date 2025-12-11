import React from 'react';
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { AuthProvider, UserProvider, ToastProvider, ThemeProvider, ErrorProvider } from '@/presentation/contexts';
import { Toaster } from '@/presentation/components/atoms';
import { ErrorBoundary } from '@/presentation/components/organisms/error-handling/error-boundary';
import { RouteSuspense } from '@/presentation/components/routes/suspense-route';

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
