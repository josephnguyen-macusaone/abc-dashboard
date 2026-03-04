import React from 'react';
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { ThemeScript } from '@/shared/scripts/theme-script';
import { ClientAppShell } from '@/app/client-app-shell';

import "./globals.css";

// Configure Archivo font for display/headings
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-archivo",
  weight: ["500", "600"],
  preload: false,
  fallback: ["system-ui", "sans-serif"],
});

// Configure Inter font for body/UI text
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  preload: false,
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "ABC Salon",
  description: "ABC Salon Dashboard - Professional Salon Management System",
  keywords: ["salon", "dashboard", "management", "booking", "appointment"],
  authors: [{ name: "ABC Salon Team" }],
  robots: "noindex, nofollow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

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
        <ClientAppShell>{children}</ClientAppShell>
      </body>
    </html>
  );
}
