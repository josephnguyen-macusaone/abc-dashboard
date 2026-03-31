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
import { cn } from "@/shared/helpers";

interface DataTableSkeletonProps extends React.ComponentProps<"div"> {
  columnCount: number;
  rowCount?: number;
  filterCount?: number;
  cellWidths?: string[];
  withViewOptions?: boolean;
  withPagination?: boolean;
  shrinkZero?: boolean;
}

export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  filterCount = 0,
  cellWidths = ["auto"],
  withViewOptions = true,
  withPagination = true,
  shrinkZero = false,
  className,
  ...props
}: DataTableSkeletonProps) {
  const cozyCellWidths = Array.from(
    { length: columnCount },
    (_, index) => cellWidths[index % cellWidths.length] ?? "auto",
  );

  return (
    <div
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    >
      <div
        role="toolbar"
        className={cn(
          "flex w-full flex-col gap-2 py-2 min-w-0",
          "lg:flex-row lg:flex-wrap lg:items-center lg:gap-2 lg:py-1"
        )}
      >
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {filterCount > 0
            ? Array.from({ length: filterCount }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-md border border-dashed" />
              ))
            : null}
        </div>
        {withViewOptions ? (
          <Skeleton className="hidden h-8 w-20 rounded-md lg:block" />
        ) : null}
      </div>
      <ScrollArea className="max-h-[min(70vh,36rem)] w-full rounded-md border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              {Array.from({ length: columnCount }).map((_, j) => (
                <TableHead
                  key={j}
                  className="!p-0"
                  style={{
                    width: cozyCellWidths[j],
                    minWidth: shrinkZero ? cozyCellWidths[j] : "auto",
                  }}
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
            {Array.from({ length: rowCount }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent even:bg-muted/20">
                {Array.from({ length: columnCount }).map((_, j) => (
                  <TableCell
                    key={j}
                    className="min-w-0 truncate"
                    style={{
                      width: cozyCellWidths[j],
                      minWidth: shrinkZero ? cozyCellWidths[j] : "auto",
                    }}
                  >
                    <Skeleton className="h-6 w-full rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      {withPagination ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
            <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
              <Skeleton className="h-5 w-40 rounded" />
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
      ) : null}
    </div>
  );
}

