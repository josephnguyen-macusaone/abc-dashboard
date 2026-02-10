import { ShapeSkeleton, TextSkeleton, IconSkeleton } from '@/presentation/components/atoms';
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
    <div className={cn(
      'group relative overflow-hidden rounded-lg border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md',
      isCompact && 'p-4',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className={cn("space-y-2", isCompact && "space-y-1")}>
          {/* Card label */}
          <TextSkeleton
            variant="caption"
            width={isCompact ? "16" : "24"}
            className={isCompact ? "h-3" : "h-4"}
          />

          {/* Card value */}
          <TextSkeleton
            variant={isCompact ? "body" : "heading"}
            width={isCompact ? "12" : "16"}
            className={isCompact ? "h-4" : "h-6"}
          />

          {/* Trend indicator */}
          {(showTrend || (isDetailed && Math.random() > 0.5)) && (
            <TextSkeleton
              variant="caption"
              width="12"
              className="h-3"
            />
          )}
        </div>

        {/* Icon placeholder */}
        {showIcon && (
          <div className="p-1.5 rounded-full bg-muted/20">
            <IconSkeleton size={isCompact ? "sm" : "md"} />
          </div>
        )}
      </div>
    </div>
  );
}