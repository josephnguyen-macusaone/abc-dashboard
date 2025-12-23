import { cn } from "@/shared/helpers"

interface SkeletonProps extends React.ComponentProps<"div"> {
  variant?: 'pulse' | 'shimmer' | 'wave';
  speed?: 'slow' | 'normal' | 'fast';
}

function Skeleton({
  className,
  variant = 'pulse',
  speed = 'normal',
  ...props
}: SkeletonProps) {
  const variantClasses = {
    pulse: 'animate-pulse',
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:translate-x-[-100%] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
    wave: 'animate-pulse'
  };

  const speedClasses = {
    slow: 'before:animate-[shimmer_2s_ease-in-out_infinite]',
    normal: 'before:animate-[shimmer_1.5s_ease-in-out_infinite]',
    fast: 'before:animate-[shimmer_1s_ease-in-out_infinite]'
  };

  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-accent rounded-md",
        variant === 'shimmer' ? variantClasses.shimmer : variantClasses[variant],
        variant === 'shimmer' && speedClasses[speed],
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
