'use client';

/**
 * Client-only app shell: providers + page content.
 * Loaded with ssr: false so the server never loads providers or page chunks.
 * Enables sub-1s server response for all routes.
 */
import { ReactNode } from 'react';
import { AppProviders } from '@/presentation/providers';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return <AppProviders>{children}</AppProviders>;
}
