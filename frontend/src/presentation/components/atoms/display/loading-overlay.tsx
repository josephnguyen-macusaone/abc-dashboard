import { Loading } from './loading';
import { Typography } from '@/presentation/components/atoms';
import { cn } from '@/shared/helpers';

interface LoadingOverlayProps {
  className?: string;
  text?: string;
  fullScreen?: boolean;
  /** Progress 0-100; when set, shows progress bar and percent */
  progress?: number;
  /** Subtext below main text (e.g. "1,234 / 5,000 processed") */
  subtext?: string;
}

export function LoadingOverlay({
  className,
  text = 'Loading...',
  fullScreen = true,
  progress,
  subtext,
}: LoadingOverlayProps) {
  const showProgress = progress !== undefined && progress !== null;
  const percent = Math.min(100, Math.max(0, showProgress ? progress : 0));

  return (
    <div
      className={cn(
        'flex items-center justify-center backdrop-blur-sm',
        fullScreen ? 'fixed inset-0 z-50 bg-background/80' : 'min-h-screen bg-background/80',
        className
      )}
      suppressHydrationWarning
    >
      <div className="flex flex-col items-center justify-center space-y-4 w-full max-w-sm px-6">
        <Loading size="lg" variant="spinner" />
        <div className="w-full space-y-2 text-center">
          <Typography variant="body-s" weight="medium">
            {text}
          </Typography>
          {showProgress && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <Typography variant="body-s" className="text-muted-foreground">
                {percent}%
              </Typography>
            </>
          )}
          {subtext && (
            <Typography variant="body-s" className="text-muted-foreground">
              {subtext}
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
}

