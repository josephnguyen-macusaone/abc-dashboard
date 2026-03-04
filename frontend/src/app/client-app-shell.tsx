'use client';

/**
 * Client wrapper: dynamic AppShell with ssr: false.
 * Must be a Client Component because ssr: false is not allowed in Server Components.
 */
import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { LoadingOverlay } from '@/presentation/components/atoms';

const AppShell = dynamic(
  () => import('@/app/app-shell').then((mod) => ({ default: mod.AppShell })),
  {
    ssr: false,
    loading: () => <LoadingOverlay text="Loading application..." />,
  }
);

interface ClientAppShellProps {
  children: ReactNode;
}

export function ClientAppShell({ children }: ClientAppShellProps) {
  return <AppShell>{children}</AppShell>;
}
