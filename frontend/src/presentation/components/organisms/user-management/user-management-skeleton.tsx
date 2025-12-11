import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import { DataTableSkeleton } from "@/presentation/components/molecules/data/data-table/data-table-skeleton";
import { cn } from "@/shared/utils";

interface UserManagementSkeletonProps extends React.ComponentProps<"div"> {
  showDateFilter?: boolean;
}

export function UserManagementSkeleton({
  showDateFilter = true,
  className,
  ...props
}: UserManagementSkeletonProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm px-6 py-6', className)} {...props}>
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          {/* Date Range Filter Skeleton */}
          {showDateFilter && (
            <Skeleton className="h-9 w-32" />
          )}
        </div>
      </div>

      {/* Statistics Cards Skeleton */}
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="group bg-card border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/5 hover:via-primary/10 hover:to-primary/5 hover:shadow-sm transition-all duration-300 ease-out"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <Skeleton className="h-7 w-10 mb-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Table Skeleton */}
      <DataTableSkeleton
        columnCount={7}
        rowCount={10}
        filterCount={3}
        withPagination
        withViewOptions
      />
    </div>
  );
}