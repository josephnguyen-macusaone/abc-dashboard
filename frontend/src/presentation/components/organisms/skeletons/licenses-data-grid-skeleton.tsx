import { ShapeSkeleton } from '@/presentation/components/atoms';
import { ButtonSkeleton } from '@/presentation/components/molecules';
import { cn } from "@/shared/helpers";

interface LicensesDataGridSkeletonProps {
  className?: string;
  rowCount?: number;
}

/**
 * Licenses Data Grid Skeleton Organism
 * Complex skeleton using atomic and molecular components
 * Matches the layout and structure of the actual LicensesDataGrid component
 */
export function LicensesDataGridSkeleton({
  className,
  rowCount = 20, // Match default pagination
}: LicensesDataGridSkeletonProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {/* Toolbar - matches actual LicensesDataGrid toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        {/* Left side - Search and filter menus */}
        <div className="flex items-center gap-2">
          {/* Search bar in relative wrapper */}
          <div className="relative">
            <ShapeSkeleton width="40 lg:56" height="8" variant="rounded" />
          </div>

          {/* DataGridFilterMenu */}
          <ButtonSkeleton variant="outline" size="sm" showText />

          {/* DataGridSortMenu */}
          <ButtonSkeleton variant="outline" size="sm" showText />

          {/* DataGridRowHeightMenu */}
          <ButtonSkeleton variant="outline" size="sm" showText />

          {/* DataGridViewMenu */}
          <ButtonSkeleton variant="outline" size="sm" showText />
        </div>

        {/* Right side - Conditional action buttons (when hasChanges) */}
        <div className="flex items-center gap-2">
          {/* Discard button */}
          <ButtonSkeleton variant="outline" size="sm" textWidth="16" />

          {/* Save Changes button */}
          <ButtonSkeleton variant="default" size="sm" textWidth="20" />
        </div>
      </div>

      {/* Data Grid - matching DataGrid component styling with horizontal scroll */}
      <div className="overflow-auto rounded-md border bg-card" style={{ height: '600px' }}>
        {/* Grid Header - matching all 15 columns from getLicenseGridColumns */}
        <div className="bg-muted">
          <div className="flex h-12 items-center border-b px-4" style={{ minWidth: 'fit-content' }}>
            {/* DBA - 150px */}
            <div style={{ width: "150px" }}>
              <ShapeSkeleton width="8" height="4" variant="rectangle" />
            </div>
            {/* Zip Code - 100px */}
            <div style={{ width: "100px" }}>
              <ShapeSkeleton width="12" height="4" variant="rectangle" />
            </div>
            {/* Start Date - 120px */}
            <div style={{ width: "120px" }}>
              <ShapeSkeleton width="16" height="4" variant="rectangle" />
            </div>
            {/* Status - 120px */}
            <div style={{ width: "120px" }}>
              <ShapeSkeleton width="12" height="4" variant="rectangle" />
            </div>
            {/* Plan - 120px */}
            <div style={{ width: "120px" }}>
              <ShapeSkeleton width="8" height="4" variant="rectangle" />
            </div>
            {/* Term - 110px */}
            <div style={{ width: "110px" }}>
              <ShapeSkeleton width="8" height="4" variant="rectangle" />
            </div>
            {/* Last Payment - 130px */}
            <div style={{ width: "130px" }}>
              <ShapeSkeleton width="16" height="4" variant="rectangle" />
            </div>
            {/* Last Active - 120px */}
            <div style={{ width: "120px" }}>
              <ShapeSkeleton width="16" height="4" variant="rectangle" />
            </div>
            {/* SMS Purchased - 130px */}
            <div style={{ width: "130px" }}>
              <ShapeSkeleton width="16" height="4" variant="rectangle" />
            </div>
            {/* SMS Sent - 110px */}
            <div style={{ width: "110px" }}>
              <ShapeSkeleton width="12" height="4" variant="rectangle" />
            </div>
            {/* SMS Balance - 120px */}
            <div style={{ width: "120px" }}>
              <ShapeSkeleton width="16" height="4" variant="rectangle" />
            </div>
            {/* Agents - 90px */}
            <div style={{ width: "90px" }}>
              <ShapeSkeleton width="10" height="4" variant="rectangle" />
            </div>
            {/* Agents Name - 200px */}
            <div style={{ width: "200px" }}>
              <ShapeSkeleton width="20" height="4" variant="rectangle" />
            </div>
            {/* Agents Cost - 120px */}
            <div style={{ width: "120px" }}>
              <ShapeSkeleton width="16" height="4" variant="rectangle" />
            </div>
            {/* Notes - 200px */}
            <div style={{ width: "200px" }}>
              <ShapeSkeleton width="12" height="4" variant="rectangle" />
            </div>
          </div>
        </div>

        {/* Grid Body */}
        <div className="divide-y" style={{ minWidth: 'fit-content' }}>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className={cn(
                "flex h-12 items-center px-4 hover:bg-muted/50",
                rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20"
              )}
              style={{ minWidth: 'fit-content' }}
            >
              {/* DBA - 150px */}
              <div style={{ width: "150px" }}>
                <ShapeSkeleton width="24" height="4" variant="rectangle" />
              </div>
              {/* Zip Code - 100px */}
              <div style={{ width: "100px" }}>
                <ShapeSkeleton width="12" height="4" variant="rectangle" />
              </div>
              {/* Start Date - 120px */}
              <div style={{ width: "120px" }}>
                <ShapeSkeleton width="20" height="4" variant="rectangle" />
              </div>
              {/* Status - 120px */}
              <div style={{ width: "120px" }}>
                <ShapeSkeleton width="16" height="6" variant="rounded" />
              </div>
              {/* Plan - 120px */}
              <div style={{ width: "120px" }}>
                <ShapeSkeleton width="12" height="6" variant="rounded" />
              </div>
              {/* Term - 110px */}
              <div style={{ width: "110px" }}>
                <ShapeSkeleton width="14" height="6" variant="rounded" />
              </div>
              {/* Last Payment - 130px */}
              <div style={{ width: "130px" }}>
                <ShapeSkeleton width="16" height="4" variant="rectangle" />
              </div>
              {/* Last Active - 120px */}
              <div style={{ width: "120px" }}>
                <ShapeSkeleton width="18" height="4" variant="rectangle" />
              </div>
              {/* SMS Purchased - 130px */}
              <div style={{ width: "130px" }}>
                <ShapeSkeleton width="16" height="4" variant="rectangle" />
              </div>
              {/* SMS Sent - 110px */}
              <div style={{ width: "110px" }}>
                <ShapeSkeleton width="12" height="4" variant="rectangle" />
              </div>
              {/* SMS Balance - 120px */}
              <div style={{ width: "120px" }}>
                <ShapeSkeleton width="14" height="4" variant="rectangle" />
              </div>
              {/* Agents - 90px */}
              <div style={{ width: "90px" }}>
                <ShapeSkeleton width="6" height="4" variant="rectangle" />
              </div>
              {/* Agents Name - 200px */}
              <div style={{ width: "200px" }}>
                <ShapeSkeleton width="32" height="4" variant="rectangle" />
              </div>
              {/* Agents Cost - 120px */}
              <div style={{ width: "120px" }}>
                <ShapeSkeleton width="14" height="4" variant="rectangle" />
              </div>
              {/* Notes - 200px */}
              <div style={{ width: "200px" }}>
                <ShapeSkeleton width="28" height="4" variant="rectangle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}