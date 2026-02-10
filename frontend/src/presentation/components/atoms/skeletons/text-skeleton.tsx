import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import { cn } from "@/shared/helpers";

interface TextSkeletonProps {
  className?: string;
  lines?: number;
  variant?: 'heading' | 'body' | 'caption' | 'button';
  width?: string | number;
  animation?: 'pulse' | 'shimmer' | 'wave';
  speed?: 'slow' | 'normal' | 'fast';
}

/**
 * Text skeleton component - atomic building block
 * Provides consistent text placeholder styling
 */
export function TextSkeleton({
  className,
  lines = 1,
  variant = 'body',
  width,
  animation = 'shimmer',
  speed = 'normal',
  ...props
}: TextSkeletonProps) {
  const variantClasses = {
    heading: 'h-6',
    body: 'h-4',
    caption: 'h-3',
    button: 'h-8'
  };

  const baseClass = variantClasses[variant];
  const widthClass = width ? `w-${width}` : 'w-full';

  if (lines === 1) {
    return (
      <Skeleton
        variant={animation}
        speed={speed}
        className={cn(baseClass, widthClass, 'bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40', className)}
        {...props}
      />
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant={animation}
          speed={speed}
          className={cn(
            baseClass,
            index === lines - 1 ? 'w-3/4' : 'w-full', // Last line shorter
            'bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40'
          )}
          {...props}
        />
      ))}
    </div>
  );
}