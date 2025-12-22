import { ShapeSkeleton, TextSkeleton } from '@/presentation/components/atoms';
import { cn } from "@/shared/helpers";

interface ButtonSkeletonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  textWidth?: string;
}

/**
 * Button skeleton molecule - combines shape and text atoms
 * Represents loading state for buttons
 */
export function ButtonSkeleton({
  className,
  variant = 'default',
  size = 'md',
  showText = true,
  textWidth = '16',
  ...props
}: ButtonSkeletonProps) {
  const sizeClasses = {
    sm: 'h-7 px-3',
    md: 'h-8 px-4',
    lg: 'h-10 px-6'
  };

  const isIconOnly = variant === 'icon';

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        sizeClasses[size],
        variant === 'outline' && 'border bg-transparent',
        variant === 'ghost' && 'bg-transparent',
        !isIconOnly && !showText && 'w-20', // Default width for buttons without text
        className
      )}
      {...props}
    >
      <ShapeSkeleton
        variant="rounded"
        height={size === 'sm' ? '7' : size === 'lg' ? '10' : '8'}
        width={isIconOnly ? (size === 'sm' ? '7' : size === 'lg' ? '10' : '8') : undefined}
        className="absolute inset-0"
      />
      {showText && !isIconOnly && (
        <TextSkeleton
          variant="button"
          width={textWidth}
          className="h-4 relative z-10"
        />
      )}
    </div>
  );
}