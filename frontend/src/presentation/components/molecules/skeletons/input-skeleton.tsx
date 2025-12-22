import { ShapeSkeleton } from '@/presentation/components/atoms';
import { cn } from "@/shared/helpers";

interface InputSkeletonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  labelWidth?: string;
}

/**
 * Input skeleton molecule - represents loading state for form inputs
 */
export function InputSkeleton({
  className,
  size = 'md',
  showLabel = false,
  labelWidth = '20',
  ...props
}: InputSkeletonProps) {
  const heightClasses = {
    sm: 'h-7',
    md: 'h-8',
    lg: 'h-10'
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      {showLabel && (
        <ShapeSkeleton
          height="3"
          width={labelWidth}
          variant="rectangle"
        />
      )}

      {/* Input field */}
      <ShapeSkeleton
        height={size}
        width="full"
        variant="rounded"
        className={cn(heightClasses[size], className)}
        {...props}
      />
    </div>
  );
}