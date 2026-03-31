'use client';

import { ReactNode } from 'react';
import { ScrollArea } from '@/presentation/components/atoms';

interface ErrorTemplateProps {
  children: ReactNode;
  variant?: 'dashboard' | 'standalone';
}

export function ErrorTemplate({ children, variant = 'standalone' }: ErrorTemplateProps) {
  // Dashboard variant
  if (variant === 'dashboard') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-7rem)]">
        <div className="max-w-lg w-full">
          {children}
        </div>
      </div>
    );
  }

  // Standalone variant — full-height scroll matches auth / dashboard ScrollArea
  return (
    <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden bg-background">
      <ScrollArea
        className="min-h-0 min-w-0 flex-1"
        viewportClassName="overflow-x-hidden"
      >
        <div className="flex min-h-full w-full flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg">{children}</div>
        </div>
      </ScrollArea>
    </div>
  );
}