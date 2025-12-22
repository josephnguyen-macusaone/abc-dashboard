import { Typography } from "@/presentation/components/atoms";
import { TextSkeleton, ShapeSkeleton } from '@/presentation/components/atoms';
import { ButtonSkeleton } from '@/presentation/components/molecules';
import { cn } from "@/shared/helpers";

interface LicenseDataTableSkeletonProps {
  className?: string;
  title?: string;
  description?: string;
}

/**
 * License Data Table Skeleton Organism
 * Complex skeleton using atomic and molecular components
 * Matches the layout and structure of LicensesDataTable component
 */
export function LicenseDataTableSkeleton({
  className,
  title = 'License Management',
  description = 'Manage license records and subscriptions'
}: LicenseDataTableSkeletonProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm space-y-3 px-6 pb-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="">
          <Typography variant="title-l" className="text-foreground">
            {title}
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground mt-0.5">
            {description}
          </Typography>
        </div>
      </div>

      {/* DataTable structure - matches DataTable + DataTableToolbar */}
      <div className="flex w-full flex-col gap-4 overflow-auto">
        {/* DataTableToolbar - matches exact structure */}
        <div className="flex w-full flex-wrap items-center gap-2 py-1">
          {/* Search bar on the left - matches DataTableToolbar */}
          <div className="flex items-center">
            <div className="relative">
              <ShapeSkeleton width="64" height="8" variant="rounded" />
            </div>
          </div>

          {/* Filter components - matches DataTableToolbar */}
          <ButtonSkeleton variant="outline" size="sm" showText />

          {/* Reset button - only visible when filters are active */}
          <ButtonSkeleton variant="outline" size="sm" textWidth="12" />

          {/* Additional actions on the right */}
          <div className="flex items-center gap-2 ml-auto">
            <ButtonSkeleton variant="outline" size="sm" textWidth="12" />
          </div>
        </div>

        {/* DataTable table - matches DataTable component structure */}
        <div className="overflow-hidden rounded-md border">
          {/* Table Header - matching all 8 columns from getLicenseTableColumns */}
          <div className="bg-muted">
            <div className="flex h-12 items-center border-b px-4" style={{ minWidth: 'fit-content' }}>
              {/* DBA - flex-1 */}
              <div className="flex-1">
                <TextSkeleton variant="caption" width="8" />
              </div>
              {/* Created At - w-40 */}
              <div style={{ width: "160px" }}>
                <TextSkeleton variant="caption" width="16" />
              </div>
              {/* Status - w-32 */}
              <div style={{ width: "128px" }}>
                <TextSkeleton variant="caption" width="12" />
              </div>
              {/* Plan - w-24 */}
              <div style={{ width: "96px" }}>
                <TextSkeleton variant="caption" width="8" />
              </div>
              {/* Term - w-24 */}
              <div style={{ width: "96px" }}>
                <TextSkeleton variant="caption" width="8" />
              </div>
              {/* Agents - w-20 */}
              <div style={{ width: "80px" }}>
                <TextSkeleton variant="caption" width="10" />
              </div>
              {/* Last Payment - w-32 */}
              <div style={{ width: "128px" }}>
                <TextSkeleton variant="caption" width="16" />
              </div>
              {/* Actions - w-24 */}
              <div style={{ width: "96px" }}>
                <TextSkeleton variant="caption" width="12" />
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y" style={{ minWidth: 'fit-content' }}>
            {Array.from({ length: 10 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className={cn(
                  "flex h-12 items-center px-4 hover:bg-muted/50",
                  rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20"
                )}
                style={{ minWidth: 'fit-content' }}
              >
                {/* DBA - flex-1 */}
                <div className="flex-1">
                  <TextSkeleton variant="body" width="32" />
                </div>
                {/* Created At - w-40 */}
                <div style={{ width: "160px" }}>
                  <TextSkeleton variant="body" width="24" />
                </div>
                {/* Status - w-32 */}
                <div style={{ width: "128px" }}>
                  <ShapeSkeleton width="16" height="6" variant="rounded" />
                </div>
                {/* Plan - w-24 */}
                <div style={{ width: "96px" }}>
                  <ShapeSkeleton width="12" height="6" variant="rounded" />
                </div>
                {/* Term - w-24 */}
                <div style={{ width: "96px" }}>
                  <ShapeSkeleton width="14" height="6" variant="rounded" />
                </div>
                {/* Agents - w-20 */}
                <div style={{ width: "80px" }}>
                  <TextSkeleton variant="body" width="6" />
                </div>
                {/* Last Payment - w-32 */}
                <div style={{ width: "128px" }}>
                  <TextSkeleton variant="body" width="16" />
                </div>
                {/* Actions - w-24 */}
                <div style={{ width: "96px" }}>
                  <ShapeSkeleton width="8" height="8" variant="rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination - matches TablePagination structure exactly */}
        <div className="flex flex-col gap-2.5">
          <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
            {/* Left side: Showing entries text */}
            <TextSkeleton variant="body" width="48" />

            {/* Right side: Controls */}
            <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
              {/* Rows per page selector */}
              <div className="flex items-center space-x-2">
                <TextSkeleton variant="body" width="20" />
                <ShapeSkeleton width="16" height="8" variant="rounded" />
              </div>

              {/* Page indicator */}
              <div className="flex items-center justify-center font-medium text-sm">
                <TextSkeleton variant="body" width="16" />
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center space-x-2">
                <ShapeSkeleton width="8" height="8" variant="rounded" />
                <ShapeSkeleton width="8" height="8" variant="rounded" />
                <ShapeSkeleton width="8" height="8" variant="rounded" />
                <ShapeSkeleton width="8" height="8" variant="rounded" />
                <ShapeSkeleton width="8" height="8" variant="rounded" />
                <ShapeSkeleton width="8" height="8" variant="rounded" className="hidden lg:block" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}