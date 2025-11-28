import React from 'react';
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";

import { AuthProvider } from '@/presentation/contexts/auth-context';
import { ThemeProvider } from '@/presentation/contexts/theme-context';
import { ErrorProvider } from '@/presentation/contexts/error-context';
import { Toaster } from '@/presentation/components/atoms';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { APP_CONFIG } from '@/shared/constants';

import "./globals.css";

// Configure Archivo font for display/headings
const archivo = Archivo({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Configure Inter font for body/UI text
const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ABC Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${inter.variable}`}>
      <body className={inter.className}>
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
