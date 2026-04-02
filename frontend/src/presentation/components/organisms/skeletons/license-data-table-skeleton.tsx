import { Typography } from "@/presentation/components/atoms";
import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/atoms/primitives/table";
import { ScrollArea } from "@/presentation/components/atoms/primitives/scroll-area";
import { LICENSE_COLUMN_WIDTHS } from "@/shared/constants/license";
import type { LicenseColumnId } from "@/shared/constants/license";
import { getRowHeightValue } from "@/shared/lib/data-grid";
import { cn } from "@/shared/helpers";

/** Match DataTable row height (getRowHeightValue("medium") = 56px) */
const TABLE_ROW_HEIGHT = getRowHeightValue("medium");

const LICENSE_TABLE_COLUMN_IDS: LicenseColumnId[] = [
  "select",
  "dba",
  "zip",
  "startsAt",
  "status",
  "plan",
  "term",
  "dueDate",
  "lastPayment",
  "lastActive",
  "smsPurchased",
  "smsSent",
  "smsBalance",
  "agents",
  "agentsName",
  "agentsCost",
  "notes",
];

const PILL_COLUMNS = new Set<LicenseColumnId>(["status", "plan", "term"]);

function getCellSkeleton(columnId: LicenseColumnId) {
  if (PILL_COLUMNS.has(columnId)) {
    return <Skeleton className="h-6 w-16 rounded-full shrink-0" />;
  }
  if (columnId === "dba" || columnId === "agentsName") {
    return <Skeleton className="h-4 w-28 rounded" />;
  }
  if (columnId === "notes") {
    return <Skeleton className="h-4 w-40 rounded" />;
  }
  if (columnId === "select") {
    return <Skeleton className="size-4 rounded shrink-0" />;
  }
  return <Skeleton className="h-4 w-20 rounded" />;
}

interface LicenseDataTableSkeletonProps {
  className?: string;
  title?: string;
  description?: string;
  showHeader?: boolean;
  rowCount?: number;
}

/**
 * License Data Table Skeleton Organism
 * Matches user-data-table-skeleton style: Skeleton primitive, LICENSE_COLUMN_WIDTHS, pill-style for status/plan/term.
 */
export function LicenseDataTableSkeleton({
  className,
  title = "License Management",
  description = "Manage license records and subscriptions",
  showHeader = true,
  rowCount = 20,
}: LicenseDataTableSkeletonProps) {
  const content = (
    <div className={cn("flex w-full flex-col gap-4", !showHeader && className)}>
      {/* Toolbar - same wrapper pattern as user skeleton; Skeleton placeholders */}
      <div
        role="toolbar"
        aria-orientation="horizontal"
        className={cn(
          "flex w-full flex-col gap-2 py-2 min-w-0",
          "lg:flex-row lg:flex-wrap lg:items-center lg:gap-2 lg:py-1 lg:justify-between"
        )}
      >
        <div className="flex w-full sm:hidden shrink-0">
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <div className="flex w-full sm:hidden lg:hidden items-center gap-2 flex-nowrap min-w-0">
          <Skeleton className="h-8 flex-1 min-w-[120px] rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <div className="hidden w-full sm:flex lg:w-auto lg:min-w-0 items-center gap-2 flex-nowrap min-w-0 overflow-x-auto">
          <Skeleton className="h-8 w-28 rounded-md shrink-0" />
          <Skeleton className="h-8 w-44 sm:w-52 md:w-64 rounded-md shrink-0" />
          <Skeleton className="h-8 w-20 rounded-md shrink-0" />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0 justify-start lg:justify-end overflow-x-auto lg:overflow-visible">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Table - same structure as user skeleton */}
      <ScrollArea className="max-h-[min(70vh,36rem)] w-full rounded-md border">
        <Table className="min-w-0 overflow-x-visible">
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              {LICENSE_TABLE_COLUMN_IDS.map((id) => (
                <TableHead
                  key={id}
                  style={{ width: `${LICENSE_COLUMN_WIDTHS[id].size}px` }}
                  className="!p-0"
                >
                  <div className="flex w-full items-center">
                    <div className="flex w-full items-center justify-between gap-2 px-4 py-2">
                      <Skeleton className="h-4 min-w-0 flex-1 rounded" />
                      <Skeleton className="size-3.5 shrink-0 rounded-full" />
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow
                key={rowIndex}
                className="hover:bg-transparent even:bg-muted/20"
                style={{ minHeight: TABLE_ROW_HEIGHT }}
              >
                {LICENSE_TABLE_COLUMN_IDS.map((id) => (
                  <TableCell
                    key={id}
                    style={{ width: `${LICENSE_COLUMN_WIDTHS[id].size}px` }}
                    className="min-w-0 truncate"
                  >
                    {getCellSkeleton(id)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Pagination - same structure as user skeleton */}
      <div className="flex flex-col gap-2.5">
        <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
          <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
            <Skeleton className="h-5 w-32 rounded" />
          </div>
          <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
            <div className="flex items-center justify-center font-medium text-sm">
              <Skeleton className="h-5 w-20 rounded" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="hidden size-8 rounded-md lg:block" />
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="hidden size-8 rounded-md lg:block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <div className={cn("bg-card border border-border rounded-xl shadow-sm space-y-3 px-6 pb-6", className)}>
      <div className="flex items-center justify-between pt-4">
        <div>
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
