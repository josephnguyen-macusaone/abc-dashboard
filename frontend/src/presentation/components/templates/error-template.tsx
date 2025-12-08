'use client';

import { ReactNode } from 'react';

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

  // Standalone variant - full screen layout
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full">
        {children}
      </div>
    </div>
  );
}