import React from 'react';
import type { Metadata } from "next";
import { Literata } from "next/font/google";

import { AuthProvider } from '@/presentation/contexts/auth-context';
import { ThemeProvider } from '@/presentation/contexts/theme-context';
import { ErrorProvider } from '@/presentation/contexts/error-context';
import { Toaster } from '@/presentation/components/atoms';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { APP_CONFIG } from '@/shared/constants';

import "./globals.css";

// Configure Literata font as per typography guide
const literata = Literata({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-literata",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ABC Dashboard",
  description: "A modern MERN authentication application with role-based access",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={literata.className}>
        <ErrorBoundary>
          <ThemeProvider defaultTheme={APP_CONFIG.DEFAULT_THEME}>
            <ErrorProvider>
              <AuthProvider>
                {children}
                <Toaster />
              </AuthProvider>
            </ErrorProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
