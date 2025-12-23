import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import { cn } from "@/shared/helpers";

interface IconSkeletonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'square' | 'circle';
}

/**
 * Icon skeleton component - atomic building block
 * Provides consistent icon placeholder styling
 */
export function IconSkeleton({
  className,
  size = 'md',
  variant = 'square',
  ...props
}: IconSkeletonProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  const variantClasses = {
    square: 'rounded',
    circle: 'rounded-full'
  };

  return (
    <Skeleton
      className={cn(
        sizeClasses[size],
        variantClasses[variant],
        'bg-gradient-to-r from-muted/60 to-muted/40',
        className
      )}
      {...props}
    />
  );
}