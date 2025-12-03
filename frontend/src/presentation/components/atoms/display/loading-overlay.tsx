'use client';

import { Loading } from './loading';
import { Typography } from '@/presentation/components/atoms';
import { cn } from '@/shared/utils';

interface LoadingOverlayProps {
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

export function LoadingOverlay({
  className,
  text = 'Loading...',
  fullScreen = true
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullScreen ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm' : 'min-h-screen bg-background',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loading size="lg" variant="spinner" />
        <Typography variant="body-s" weight="medium">
          {text}
        </Typography>
      </div>
    </div>
  );
}

