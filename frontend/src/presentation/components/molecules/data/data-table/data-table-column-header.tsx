"use client";

import type { Column } from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  EyeOff,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/presentation/components/atoms/primitives/dropdown-menu";
import { cn } from "@/shared/helpers";

/** Match data-grid header look without duplicating th padding (th already has tableHeadCellClass) */
const headerTriggerBaseClass =
  "h-12 min-h-12 text-sm font-medium text-foreground align-middle whitespace-nowrap";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.ComponentProps<typeof DropdownMenuTrigger> {
  column: Column<TData, TValue>;
  label: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  label,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  const headerAlign = (column.columnDef.meta as { headerAlign?: "start" | "end" | "center" } | undefined)?.headerAlign ?? "start";
  const isEnd = headerAlign === "end";
  const isCenter = headerAlign === "center";

  const sharedTriggerStyles = cn(
    "flex w-full items-center gap-3",
    isEnd && "justify-end text-right",
    isCenter && "justify-center text-center",
    !isEnd && !isCenter && "justify-start",
    headerTriggerBaseClass,
    "hover:bg-foreground/10 focus:outline-none data-[state=open]:bg-foreground/10 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
    className,
  );

  const showChevron = column.getCanSort() || column.getCanHide();
  const paddedContent = (
    <div
      className={cn(
        "flex w-full items-center gap-2 px-4 py-2",
        isEnd && "justify-end",
        isCenter && "justify-center",
        !isEnd && !isCenter && "justify-between",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1",
          isEnd && "justify-end text-right",
          isCenter && "justify-center text-center",
          !isEnd && !isCenter && "justify-start text-left",
        )}
      >
        <span className="whitespace-nowrap">{label}</span>
      </div>
      {showChevron && (
        <ChevronDown className="shrink-0 size-3.5 text-muted-foreground" />
      )}
    </div>
  );

  if (!column.getCanSort() && !column.getCanHide()) {
    return (
      <div className={sharedTriggerStyles}>
        {paddedContent}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={sharedTriggerStyles}
        {...props}
      >
        {paddedContent}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-28">
        {column.getCanSort() && (
          <>
            <DropdownMenuCheckboxItem
              className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
              checked={column.getIsSorted() === "asc"}
              onClick={() => column.toggleSorting(false)}
            >
              <ChevronUp className="mr-3 h-3.5 w-3.5" />
              <span className="text-body-s">Asc</span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
              checked={column.getIsSorted() === "desc"}
              onClick={() => column.toggleSorting(true)}
            >
              <ChevronDown className="mr-3 h-3.5 w-3.5" />
              <span className="text-body-s">Desc</span>
            </DropdownMenuCheckboxItem>
            {column.getIsSorted() && (
              <DropdownMenuItem
                className="pl-2 [&_svg]:text-muted-foreground"
                onClick={() => column.clearSorting()}
              >
                <X className="mr-3 h-3.5 w-3.5" />
                <span className="text-body-s">Reset</span>
              </DropdownMenuItem>
            )}
          </>
        )}
        {column.getCanHide() && (
          <DropdownMenuCheckboxItem
            className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
            checked={!column.getIsVisible()}
            onClick={() => column.toggleVisibility(false)}
          >
            <EyeOff className="mr-3 h-3.5 w-3.5" />
            <span className="text-body-s">Hide</span>
          </DropdownMenuCheckboxItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

