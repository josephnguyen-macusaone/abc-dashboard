'use client';

import { cn } from '@/shared/utils';
import { ReactNode } from 'react';
import { SectionErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { Logo } from '@/presentation/components/atoms/display/logo';

interface AuthTemplateProps {
  children: ReactNode;
}

export const AuthTemplate: React.FC<AuthTemplateProps> = ({
  children,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Full background layer */}
      <div className="fixed inset-0 bg-background z-0" />

      {/* Curved brand background */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <svg
          className="w-full"
          style={{ height: '50vh' }}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M0 0H100V70C100 70 80 90 50 75C20 60 0 85 0 85V0Z"
            fill="var(--clr-primary-500)"
          />
        </svg>
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Auth form container */}
        <div className={cn(
          'bg-card border border-border rounded-lg shadow-lg',
          'px-6 py-8 sm:px-8'
        )}>
          {/* Logo */}
          <Logo variant="light" width={160} height={64} className="mb-12" />

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

