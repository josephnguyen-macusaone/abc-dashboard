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
import { USER_COLUMN_WIDTHS } from "@/shared/constants/user";
import { getRowHeightValue } from "@/shared/lib/data-grid";
import { cn } from "@/shared/helpers";

/** Match DataTable row height (getRowHeightValue("medium") = 56px) */
const TABLE_ROW_HEIGHT = getRowHeightValue("medium");

const USER_COLUMNS = [
  { id: "displayName", size: USER_COLUMN_WIDTHS.displayName.size, label: "Name" },
  { id: "username", size: USER_COLUMN_WIDTHS.username.size, label: "Username" },
  { id: "email", size: USER_COLUMN_WIDTHS.email.size, label: "Email" },
  { id: "phone", size: USER_COLUMN_WIDTHS.phone.size, label: "Phone" },
  { id: "role", size: USER_COLUMN_WIDTHS.role.size, label: "Role" },
  { id: "isActive", size: USER_COLUMN_WIDTHS.isActive.size, label: "Status" },
  { id: "createdAt", size: USER_COLUMN_WIDTHS.createdAt.size, label: "Created" },
  { id: "actions", size: USER_COLUMN_WIDTHS.actions.size, label: "Actions" },
] as const;

interface UserDataTableSkeletonProps extends React.ComponentProps<"div"> {
  rowCount?: number;
}

export function UserDataTableSkeleton({
  rowCount = 20,
  className,
  ...props
}: UserDataTableSkeletonProps) {
  return (
    <div className={cn("flex w-full flex-col gap-4", className)} {...props}>
      {/* Toolbar - matches DataTableToolbar (no dateRangeFilter: search + filters + children + View) */}
      <div
        role="toolbar"
        aria-orientation="horizontal"
        className={cn(
          "flex w-full flex-col gap-2 py-2 min-w-0 min-h-8",
          "sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:py-1 sm:min-h-8"
        )}
      >
        <div className="flex w-full min-w-0 items-center flex-nowrap gap-2 overflow-x-auto sm:w-auto sm:max-w-md sm:shrink-0 md:max-w-lg">
          <Skeleton className="h-8 w-full max-w-full rounded-md sm:h-8 sm:w-64 sm:max-w-none sm:shrink-0" />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0 justify-start sm:justify-end overflow-x-auto sm:overflow-visible">
          <Skeleton className="h-8 w-20 rounded-md border border-dashed" />
          <Skeleton className="h-8 w-20 rounded-md border border-dashed" />
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </div>

      {/* Table - matches DataTable (ScrollArea + rounded-md border) */}
      <ScrollArea className="max-h-[min(70vh,36rem)] w-full rounded-md border">
        <Table className="min-w-0 overflow-x-visible">
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              {USER_COLUMNS.map((col) => (
                <TableHead key={col.id} style={{ width: `${col.size}px` }} className="!p-0">
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
                <TableCell style={{ width: `${USER_COLUMN_WIDTHS.displayName.size}px` }} className="min-w-0 truncate">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                </TableCell>
                <TableCell style={{ width: `${USER_COLUMN_WIDTHS.username.size}px` }} className="min-w-0 truncate">
                  <Skeleton className="h-4 w-24 rounded" />
                </TableCell>
                <TableCell style={{ width: `${USER_COLUMN_WIDTHS.email.size}px` }} className="min-w-0 truncate">
                  <Skeleton className="h-4 w-40 rounded" />
                </TableCell>
                <TableCell style={{ width: `${USER_COLUMN_WIDTHS.phone.size}px` }} className="min-w-0 truncate">
                  <Skeleton className="h-4 w-20 rounded" />
                </TableCell>
                <TableCell style={{ width: `${USER_COLUMN_WIDTHS.role.size}px` }} className="min-w-0 truncate">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </TableCell>
                <TableCell style={{ width: `${USER_COLUMN_WIDTHS.isActive.size}px` }} className="min-w-0 truncate">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </TableCell>
                <TableCell style={{ width: `${USER_COLUMN_WIDTHS.createdAt.size}px` }} className="min-w-0 truncate">
                  <Skeleton className="h-4 w-24 rounded" />
                </TableCell>
                <TableCell style={{ width: `${USER_COLUMN_WIDTHS.actions.size}px` }} className="min-w-0 truncate">
                  <Skeleton className="h-8 w-8 rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Pagination - matches TablePagination */}
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
}
