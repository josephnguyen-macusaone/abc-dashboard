import { TextSkeleton, IconSkeleton } from '@/presentation/components/atoms';
import { cn } from "@/shared/helpers";

interface CardSkeletonProps {
  className?: string;
  showIcon?: boolean;
  showTrend?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Card skeleton molecule - combines shape, text, and icon atoms
 * Represents loading state for stat/metric cards
 */
export function CardSkeleton({
  className,
  showIcon = true,
  showTrend = false,
  variant = 'default'
}: CardSkeletonProps) {
  const isDetailed = variant === 'detailed';
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-5',
        isCompact && 'gap-3 p-4',
        className,
      )}
    >
      <div className="flex w-full items-center gap-2">
        {showIcon ? <IconSkeleton size="xl" className="shrink-0 rounded-md" /> : null}
        <TextSkeleton
          variant="caption"
          width={isCompact ? '20' : '28'}
          className={cn('h-4 flex-1', isCompact && 'h-3')}
        />
      </div>
      <TextSkeleton
        variant={isCompact ? 'body' : 'heading'}
        width={isCompact ? '12' : '16'}
        className={cn('h-8', isCompact && 'h-6')}
      />
      {(showTrend || isDetailed) && (
        <div className="flex w-full items-center justify-between gap-2">
          <TextSkeleton variant="caption" width="24" className="h-3 max-w-[65%]" />
          <div className="flex shrink-0 items-center gap-1">
            <IconSkeleton size="xl" className="rounded-md" />
            <TextSkeleton variant="caption" width="8" className="h-4" />
          </div>
        </div>
      )}
    </div>
  );
}