import { Skeleton } from "@/presentation/components/atoms";
import { cn } from "@/shared/helpers";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "pulse" | "skeleton";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function Loading({
  className,
  size = "md",
  variant = "spinner"
}: LoadingProps) {
  if (variant === "spinner") {
    return (
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-muted-foreground border-t-primary",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn(
          "animate-pulse rounded-full bg-primary",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  // Default to skeleton
  return <Skeleton className={cn(sizeClasses[size], className)} />;
}

// LoadingSpinner - alias for backwards compatibility
export const LoadingSpinner = Loading;

