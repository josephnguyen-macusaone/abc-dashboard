'use client';

import { cn } from '@/shared/utils';
import { ReactNode } from 'react';
import { SectionErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';

interface AuthTemplateProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
}

export const AuthTemplate: React.FC<AuthTemplateProps> = ({
  children,
  title = "Welcome",
  subtitle = "Please sign in to your account",
  header
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative">
      {/* Theme switcher in top right */}
      {header && (
        <div className="absolute top-4 right-4 z-10">
          {header}
        </div>
      )}

      <div className="w-full max-w-md space-y-8 pb-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Auth form container */}
        <div className={cn(
          'bg-card border border-border rounded-lg shadow-lg',
          'px-6 py-8 sm:px-8'
        )}>
          <SectionErrorBoundary
            fallbackTitle="Authentication Error"
            fallbackMessage="There was a problem with the authentication form. Please try refreshing the page."
            enableRetry={true}
          >
            {children}
          </SectionErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default AuthTemplate;

