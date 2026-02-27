import { Typography } from "@/presentation/components/atoms";
import { TextSkeleton, ShapeSkeleton } from '@/presentation/components/atoms';
import { ButtonSkeleton } from '@/presentation/components/molecules';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/atoms/primitives/table";
import { cn } from "@/shared/helpers";

interface LicenseDataTableSkeletonProps {
  className?: string;
  title?: string;
  description?: string;
  showHeader?: boolean;
}

/**
 * License Data Table Skeleton Organism
 * Matches the exact structure and styling of the LicensesDataTable component
 */
export function LicenseDataTableSkeleton({
  className,
  title = 'License Management',
  description = 'Manage license records and subscriptions',
  showHeader = true,
}: LicenseDataTableSkeletonProps) {
  // Column definitions matching license-table-columns.tsx exactly
  // Using the exact size values from the column definitions
  const columns = [
    { id: 'select', size: 48, header: 'Select' },
    { id: 'dba', size: 200, header: 'DBA' },
    { id: 'zip', size: 130, header: 'Zip Code' },
    { id: 'startsAt', size: 160, header: 'Activate Date' },
    { id: 'status', size: 130, header: 'Status' },
    { id: 'plan', size: 160, header: 'Plan' },
    { id: 'term', size: 150, header: 'Term' },
    { id: 'dueDate', size: 150, header: 'Due Date' },
    { id: 'lastPayment', size: 160, header: 'Monthly Fee' },
    { id: 'lastActive', size: 160, header: 'Last Active' },
    { id: 'smsPurchased', size: 170, header: 'SMS Purchased' },
    { id: 'smsSent', size: 150, header: 'SMS Sent' },
    { id: 'smsBalance', size: 160, header: 'SMS Balance' },
    { id: 'agents', size: 120, header: 'Agents' },
    { id: 'agentsName', size: 280, header: 'Agents Name' },
    { id: 'agentsCost', size: 160, header: 'Agents Cost' },
    { id: 'notes', size: 300, header: 'Notes' },
  ];

  const content = (
    <div className={cn("flex w-full flex-col gap-4 overflow-auto", !showHeader && className)}>
      {/* DataTableToolbar - Mobile: date above, search+Reset row; Tablet+: date+search+Reset */}
      <div
        role="toolbar"
        aria-orientation="horizontal"
        className="flex w-full flex-col gap-2 py-2 min-w-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2 lg:py-1 lg:justify-between"
      >
        {/* Mobile: date on own row */}
        <div className="flex w-full sm:hidden shrink-0">
          <ShapeSkeleton className="h-8 w-8 shrink-0 rounded-md" variant="rounded" />
        </div>
        {/* Mobile: search row */}
        <div className="flex w-full sm:hidden lg:hidden items-center gap-2 flex-nowrap min-w-0">
          <div className="flex flex-1 items-center gap-0 overflow-hidden rounded-md border border-input min-w-[120px]">
            <ShapeSkeleton className="h-8 w-[100px] max-w-[100px] shrink-0 rounded-none" variant="rounded" />
            <ShapeSkeleton className="h-8 flex-1 min-w-0" variant="rounded" />
          </div>
        </div>
        {/* Tablet+: date + search in one row */}
        <div className="hidden w-full sm:flex lg:w-auto lg:min-w-0 items-center gap-2 flex-nowrap min-w-0 overflow-x-auto">
          <ShapeSkeleton className="h-8 w-8 shrink-0 rounded-md" variant="rounded" />
          <div className="flex items-center gap-0 overflow-hidden rounded-md border border-input w-72 md:w-80">
            <ShapeSkeleton className="h-8 w-[100px] max-w-[100px] shrink-0 rounded-none" variant="rounded" />
            <ShapeSkeleton className="h-8 flex-1 min-w-0" variant="rounded" />
          </div>
        </div>

        {/* Status, Plan, Term filters + View options */}
        <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto lg:overflow-visible">
          <ButtonSkeleton variant="outline" size="sm" showText textWidth="12" />
          <ButtonSkeleton variant="outline" size="sm" showText textWidth="10" />
          <ButtonSkeleton variant="outline" size="sm" showText textWidth="8" />
          <ButtonSkeleton variant="outline" size="sm" textWidth="12" />
        </div>
      </div>

      {/* DataTable table - matches DataTable component structure exactly */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  style={{ width: `${column.size}px` }}
                >
                  {/* DataTableColumnHeader structure - matches the trigger button styling */}
                  <div className="-ml-1.5 flex h-8 items-center gap-1.5 rounded-md px-2 py-1.5">
                    <TextSkeleton variant="body" width="24" className="h-4" />
                    {/* Sort icon placeholder - ChevronsUpDown icon (size-4 = 16px) */}
                    <ShapeSkeleton width="4" height="4" variant="rounded" className="shrink-0 w-4 h-4" />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 20 }).map((_, rowIndex) => (
              <TableRow
                key={rowIndex}
                data-state={undefined}
                className={cn(
                  rowIndex % 2 === 0 ? "" : "even:bg-muted/20"
                )}
              >
                {columns.map((column) => {
                  return (
                    <TableCell
                      key={column.id}
                      style={{ width: `${column.size}px` }}
                    >
                      <TextSkeleton
                        className="h-[26px]"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - matches TablePagination structure exactly */}
      <div className="flex flex-col gap-2.5">
        <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
          {/* Left side - "Showing X to Y of Z entries" */}
          <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
            <TextSkeleton variant="body" width="48" />
          </div>

          {/* Right side - Rows per page, Page info, Navigation buttons */}
          <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
            {/* Rows per page selector - matches Select with h-8 w-16 */}
            <div className="flex items-center space-x-2">
              <TextSkeleton variant="body" width="20" className="font-medium" />
              <ShapeSkeleton width="16" height="8" variant="rounded" />
            </div>

            {/* Page info - "Page X of Y" */}
            <div className="flex items-center justify-center font-medium text-sm">
              <TextSkeleton variant="body" width="16" />
            </div>

            {/* Navigation buttons - matches Button size="icon" className="size-8" */}
            <div className="flex items-center space-x-2">
              {/* First page button (hidden on small screens) */}
              <ShapeSkeleton width="8" height="8" variant="rounded" className="hidden lg:block" />
              {/* Previous page button */}
              <ShapeSkeleton width="8" height="8" variant="rounded" />
              {/* Next page button */}
              <ShapeSkeleton width="8" height="8" variant="rounded" />
              {/* Last page button (hidden on small screens) */}
              <ShapeSkeleton width="8" height="8" variant="rounded" className="hidden lg:block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // If showHeader is false, return just the DataTable content (matches LicensesDataTable structure)
  if (!showHeader) {
    return content;
  }

  // If showHeader is true, wrap in the card container with title/description (matches LicenseTableSection structure)
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
      {content}
    </div>
  );
}
