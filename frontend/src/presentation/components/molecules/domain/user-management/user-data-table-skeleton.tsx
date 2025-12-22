import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/atoms/primitives/table";
import { SearchBar } from "@/presentation/components/molecules";
import { Typography } from "@/presentation/components/atoms";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { UserPlus } from "lucide-react";
import { cn } from "@/shared/helpers";

interface UserDataTableSkeletonProps extends React.ComponentProps<"div"> {
  rowCount?: number;
}

export function UserDataTableSkeleton({
  rowCount = 20, // Match the default pageSize from the actual table
  className,
  ...props
}: UserDataTableSkeletonProps) {
  return (
    <div className={cn("flex w-full flex-col gap-4 overflow-auto", className)} {...props}>
      {/* Toolbar - matches DataTableToolbar structure */}
      <div className={cn("flex w-full flex-wrap items-center gap-2 py-1")}>
        {/* Search bar on the left */}
        <div className="flex items-center">
          <div className="relative w-64">
            <Skeleton className="h-8 w-full rounded-md bg-gradient-to-r from-muted/60 to-muted/40" />
          </div>
        </div>

        {/* Role filter skeleton */}
        <Skeleton className="h-7 w-20 rounded border-dashed bg-gradient-to-r from-primary/10 to-primary/5" />

        {/* Status filter skeleton */}
        <Skeleton className="h-7 w-18 rounded border-dashed bg-gradient-to-r from-green-500/10 to-green-500/5" />

        {/* Additional actions on the right */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Add User button skeleton */}
          <Skeleton className="h-8 w-24 rounded bg-gradient-to-r from-primary/20 to-primary/10" />

          {/* View options skeleton */}
          <Skeleton className="hidden h-7 w-18 lg:flex bg-gradient-to-r from-muted/60 to-muted/40" />
        </div>
      </div>

      {/* Table - matches DataTable structure */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              {/* Name column header */}
              <TableHead style={{ width: "280px" }}>
                <Skeleton className="h-4 w-12 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
              </TableHead>

              {/* Username column header */}
              <TableHead style={{ width: "200px" }}>
                <Skeleton className="h-4 w-16 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
              </TableHead>

              {/* Email column header */}
              <TableHead style={{ width: "280px" }}>
                <Skeleton className="h-4 w-10 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
              </TableHead>

              {/* Phone column header */}
              <TableHead style={{ width: "140px" }}>
                <Skeleton className="h-4 w-10 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
              </TableHead>

              {/* Role column header */}
              <TableHead style={{ width: "120px" }}>
                <Skeleton className="h-4 w-8 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
              </TableHead>

              {/* Status column header */}
              <TableHead style={{ width: "100px" }}>
                <Skeleton className="h-4 w-12 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
              </TableHead>

              {/* Created At column header */}
              <TableHead style={{ width: "160px" }}>
                <Skeleton className="h-4 w-20 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
              </TableHead>

              {/* Actions column header */}
              <TableHead style={{ width: "80px" }}>
                <Skeleton className="h-4 w-12 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => {
              // Create some visual variety by alternating colors slightly
              const isEvenRow = rowIndex % 2 === 0;
              const avatarGradient = isEvenRow
                ? "bg-gradient-to-br from-primary/20 to-primary/10"
                : "bg-gradient-to-br from-blue-500/20 to-blue-500/10";
              const roleGradient = isEvenRow
                ? "bg-gradient-to-r from-orange-500/15 to-orange-500/10"
                : "bg-gradient-to-r from-purple-500/15 to-purple-500/10";
              const statusGradient = isEvenRow
                ? "bg-gradient-to-r from-green-500/15 to-green-500/10"
                : "bg-gradient-to-r from-red-500/15 to-red-500/10";

              return (
                <TableRow key={rowIndex} className={cn("hover:bg-transparent", rowIndex % 2 === 0 ? "even:bg-muted/20" : "")}>
                  {/* Name column - Avatar + Text */}
                  <TableCell style={{ width: "280px" }}>
                    <div className="flex items-center gap-3">
                      <Skeleton className={cn("h-8 w-8 rounded-full", avatarGradient)} />
                      <Skeleton className="h-4 w-32 bg-gradient-to-r from-foreground/20 to-foreground/10" />
                    </div>
                  </TableCell>

                  {/* Username column - Simple text */}
                  <TableCell style={{ width: "200px" }}>
                    <Skeleton className="h-4 w-24 bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10" />
                  </TableCell>

                  {/* Email column - Simple text */}
                  <TableCell style={{ width: "280px" }}>
                    <Skeleton className="h-4 w-40 bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10" />
                  </TableCell>

                  {/* Phone column - Simple text */}
                  <TableCell style={{ width: "140px" }}>
                    <Skeleton className="h-4 w-20 bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10" />
                  </TableCell>

                  {/* Role column - Badge shape */}
                  <TableCell style={{ width: "120px" }}>
                    <Skeleton className={cn("h-6 w-16 rounded-full", roleGradient)} />
                  </TableCell>

                  {/* Status column - Badge shape */}
                  <TableCell style={{ width: "100px" }}>
                    <Skeleton className={cn("h-6 w-18 rounded-full", statusGradient)} />
                  </TableCell>

                  {/* Created At column - Date text */}
                  <TableCell style={{ width: "160px" }}>
                    <Skeleton className="h-4 w-24 bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10" />
                  </TableCell>

                  {/* Actions column - Menu button */}
                  <TableCell style={{ width: "80px" }}>
                    <Skeleton className="h-8 w-8 rounded bg-gradient-to-r from-muted/20 to-muted/10" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - matches DataTable structure */}
      <div className="flex flex-col gap-2.5">
        <div className="flex w-full items-center justify-between gap-4 overflow-auto sm:gap-8">
          <Skeleton className="h-5 w-32 shrink-0 bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10" />
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded bg-gradient-to-r from-muted/20 to-muted/10" />
              <Skeleton className="h-8 w-16 rounded bg-gradient-to-r from-muted/20 to-muted/10" />
            </div>
            <div className="flex items-center justify-center font-medium text-sm">
              <Skeleton className="h-8 w-16 bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded bg-gradient-to-r from-muted/20 to-muted/10" />
              <Skeleton className="size-8 rounded bg-gradient-to-r from-muted/20 to-muted/10" />
              <Skeleton className="size-8 rounded bg-gradient-to-r from-muted/20 to-muted/10" />
              <Skeleton className="hidden size-8 lg:block rounded bg-gradient-to-r from-muted/20 to-muted/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}