import { CardSkeleton } from '@/presentation/components/molecules';
import { ShapeSkeleton } from '@/presentation/components/atoms';
import { cn } from "@/shared/helpers";

interface LicenseMetricsSkeletonProps {
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  /** Number of stat placeholders (default 8 for admin grid; agents use 5). */
  cardCount?: number;
}

/**
 * License Metrics Skeleton Organism
 * Complex layout using molecular card components
 * Matches the layout and spacing of the actual StatsCards component
 */
export function LicenseMetricsSkeleton({
  className,
  columns = 4,
  cardCount = 8,
}: LicenseMetricsSkeletonProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }[columns];

  return (
    <div className={cn("space-y-6", className)}>
      {/* DateRangeFilterCard - matches LicenseMetricsSection */}
      <div className="flex items-center justify-between">
        <ShapeSkeleton width="64" height="10" variant="rounded" />
      </div>

      {/* Stats Cards Grid */}
      <div className={cn("grid gap-4", gridCols)}>
        {Array.from({ length: cardCount }).map((_, index) => (
          <CardSkeleton
            key={index}
            showIcon={true}
            showTrend={index % 3 === 0} // Some cards show trends
            variant="default"
          />
        ))}
      </div>
    </div>
  );
}