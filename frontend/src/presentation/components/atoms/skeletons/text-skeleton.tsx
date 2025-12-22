import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import { cn } from "@/shared/helpers";

interface TextSkeletonProps {
  className?: string;
  lines?: number;
  variant?: 'heading' | 'body' | 'caption' | 'button';
  width?: string | number;
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
        className={cn(baseClass, widthClass, 'bg-gradient-to-r from-muted/60 to-muted/40', className)}
        {...props}
      />
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            baseClass,
            index === lines - 1 ? 'w-3/4' : 'w-full', // Last line shorter
            'bg-gradient-to-r from-muted/60 to-muted/40'
          )}
          {...props}
        />
      ))}
    </div>
  );
}