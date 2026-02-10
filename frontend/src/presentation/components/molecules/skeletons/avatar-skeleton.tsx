import { ShapeSkeleton, TextSkeleton } from '@/presentation/components/atoms';
import { cn } from "@/shared/helpers";

interface AvatarSkeletonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'square';
  showText?: boolean;
  textWidth?: string;
}

/**
 * Avatar skeleton molecule - represents loading state for user avatars with optional text
 */
export function AvatarSkeleton({
  className,
  size = 'md',
  variant = 'circle',
  showText = false,
  textWidth = '24',
  ...props
}: AvatarSkeletonProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ShapeSkeleton
        width={size}
        height={size}
        variant={variant === 'circle' ? 'circle' : 'rounded'}
        className={sizeClasses[size]}
        {...props}
      />

      {showText && (
        <TextSkeleton
          variant="body"
          width={textWidth}
          className="h-4"
        />
      )}
    </div>
  );
}