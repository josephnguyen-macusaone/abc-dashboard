'use client';

import { cn } from '@/shared/helpers';
import { ReactNode } from 'react';
import { SectionErrorBoundary } from '@/presentation/components/organisms/error-handling/error-boundary';
import { Logo, ScrollArea } from '@/presentation/components/atoms';
import { useTheme } from '@/presentation/contexts';

interface AuthTemplateProps {
  children: ReactNode;
}

export const AuthTemplate: React.FC<AuthTemplateProps> = ({
  children,
}) => {
  const { theme, isHydrated } = useTheme();
  return (
    <div className="relative flex h-screen min-h-0 w-full flex-col overflow-hidden bg-background">
      {/* Full background layer */}
      <div className="fixed inset-0 z-0 bg-background" />

      {/* Curved brand background */}
      <div className="pointer-events-none fixed inset-0 z-[1]">
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

      <ScrollArea
        className="relative z-10 min-h-0 min-w-0 flex-1"
        viewportClassName="overflow-x-hidden"
      >
        {/* min-h-dvh: ensures the flex row is at least the visible viewport tall so justify-center
            actually centers the card (ScrollArea’s inner wrapper does not always fill height). */}
        <div className="flex min-h-dvh w-full flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
          <div className="w-full max-w-md">
            <div
              className={cn(
                'flex flex-col space-y-6 rounded-lg border border-border bg-card shadow-lg',
                'p-6 sm:p-8',
              )}
            >
              <Logo
                variant={isHydrated ? (theme === 'dark' ? 'dark' : 'light') : 'dark'}
                width={160}
                className="mx-auto shrink-0"
              />

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
      </ScrollArea>
    </div>
  );
};

export default AuthTemplate;

