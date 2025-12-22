import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import { cn } from "@/shared/helpers";

interface ShapeSkeletonProps {
  className?: string;
  variant?: 'rectangle' | 'circle' | 'rounded' | 'pill';
  width?: string | number;
  height?: string | number;
}

/**
 * Shape skeleton component - atomic building block
 * Provides consistent shape placeholder styling
 */
export function ShapeSkeleton({
  className,
  variant = 'rectangle',
  width = 'full',
  height = '4',
  ...props
}: ShapeSkeletonProps) {
  const variantClasses = {
    rectangle: 'rounded-none',
    circle: 'rounded-full',
    rounded: 'rounded',
    pill: 'rounded-full'
  };

  const widthClass = typeof width === 'string' ? `w-${width}` : '';
  const heightClass = typeof height === 'string' ? `h-${height}` : '';

  return (
    <Skeleton
      className={cn(
        widthClass,
        heightClass,
        variantClasses[variant],
        'bg-gradient-to-r from-muted/60 to-muted/40',
        className
      )}
      {...props}
    />
  );
}