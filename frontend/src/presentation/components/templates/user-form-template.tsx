'use client';

import { ReactNode } from 'react';
import { Typography } from '@/presentation/components/atoms';
import { cn } from '@/shared/helpers';
import {
  SIDEBAR_CONSTANTS,
  useSidebarStore,
} from '@/infrastructure/stores/ui/sidebar-store';

export interface UserFormTemplateProps {
  children: ReactNode;
  title: string;
  description?: string;
  /** e.g. “+ Add New” when editing */
  headerAction?: ReactNode;
  /** Footer actions (e.g. Save); use <div className="ml-auto flex">…</div> to align right when alone */
  footer: ReactNode;
  className?: string;
}

export function UserFormTemplate({
  children,
  title,
  description,
  headerAction,
  footer,
  className,
}: UserFormTemplateProps) {
  const isMobile = useSidebarStore((s) => s.isMobile);
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const sidebarOffsetPx =
    isMobile
      ? isCollapsed
        ? 0
        : SIDEBAR_CONSTANTS.DEFAULT_WIDTH
      : isCollapsed
        ? SIDEBAR_CONSTANTS.COLLAPSED_WIDTH
        : SIDEBAR_CONSTANTS.DEFAULT_WIDTH;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]',
        className
      )}
    >
      <section className="min-w-0 flex-1 px-2 py-2 sm:px-4 sm:py-1">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <Typography variant="title-l" className="text-foreground">
              {title}
            </Typography>
            {description ? (
              <Typography variant="body-s" color="muted" className="text-muted-foreground">
                {description}
              </Typography>
            ) : null}
          </div>
          {headerAction ? <div className="flex shrink-0 justify-end sm:justify-end">{headerAction}</div> : null}
        </header>

        <div className="mt-6 min-w-0">{children}</div>
      </section>

      <footer
        className={cn(
          'fixed bottom-0 right-0 z-40 border-t border-border bg-background/95 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-sm supports-[backdrop-filter]:bg-background/90 dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.4)]'
        )}
        style={{
          left: isMobile ? 0 : sidebarOffsetPx,
        }}
        suppressHydrationWarning
      >
        <div className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 lg:px-6">
          {footer}
        </div>
      </footer>
    </div>
  );
}
