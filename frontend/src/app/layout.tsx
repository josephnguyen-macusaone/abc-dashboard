import React from 'react';
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";

import { AuthProvider, UserProvider, ToastProvider, ThemeProvider, ErrorProvider } from '@/presentation/contexts';
import { Toaster } from '@/presentation/components/atoms';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { RouteSuspense } from '@/presentation/components/routes/route-suspense';

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
          <ThemeProvider>
            <ToastProvider>
              <ErrorProvider>
                <AuthProvider>
                  <UserProvider>
                    <RouteSuspense message="Initializing application...">
                    {children}
                    </RouteSuspense>
                    <Toaster />
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
