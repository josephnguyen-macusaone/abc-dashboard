/**
 * DataTableToolbar Component
 */

"use client";

import type { Column, Table } from "@tanstack/react-table";
import { X, CalendarDays, Search } from "lucide-react";
import * as React from "react";

import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableViewOptions } from "./data-table-view-options";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Input } from "@/presentation/components/atoms/forms/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/presentation/components/atoms/primitives/popover";
import { Calendar } from "@/presentation/components/atoms/primitives/calendar";
import { cn } from "@/shared/utils";
import { format } from "date-fns";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  const onReset = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full items-start justify-between gap-2 pb-3",
        className,
      )}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {columns.map((column) => (
          <DataTableToolbarFilter key={column.id} column={column} />
        ))}
        {isFiltered && (
          <Button
            aria-label="Reset filters"
            variant="outline"
            size="sm"
            className="border-dashed h-9"
            onClick={onReset}
          >
            <X className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <DataTableViewOptions table={table} align="end" />
      </div>
    </div>
  );
}

interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>;
}

function DataTableToolbarFilter<TData>({
  column,
}: DataTableToolbarFilterProps<TData>) {
  const columnMeta = column.columnDef.meta;
  const filterValue = column.getFilterValue();
  const Icon = columnMeta?.icon;

  if (!columnMeta?.variant) return null;

  switch (columnMeta.variant) {
    case "text":
      return (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={columnMeta.placeholder ?? `Search ${columnMeta.label?.toLowerCase()}...`}
            value={(filterValue as string) ?? ""}
            onChange={(event) => column.setFilterValue(event.target.value)}
            className="h-9 w-40 lg:w-64 rounded-lg pl-10 pr-8"
          />
          {(filterValue as string)?.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-muted"
              onClick={() => column.setFilterValue("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      );

    case "number":
      return (
        <div className="relative">
          <Input
            type="number"
            inputMode="numeric"
            placeholder={columnMeta.placeholder ?? columnMeta.label}
            value={(filterValue as string) ?? ""}
            onChange={(event) => column.setFilterValue(event.target.value)}
            className={cn("h-9 w-[120px] rounded-lg", columnMeta.unit && "pr-8")}
          />
          {columnMeta.unit && (
            <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-lg bg-accent px-2 text-muted-foreground text-sm">
              {columnMeta.unit}
            </span>
          )}
        </div>
      );

    case "select":
    case "multiSelect": {
      const FilterIcon = Icon as React.ComponentType<{ className?: string }> | undefined;
      return (
        <DataTableFacetedFilter
          column={column}
          title={columnMeta.label ?? column.id}
          options={columnMeta.options ?? []}
          multiple={columnMeta.variant === "multiSelect"}
          icon={FilterIcon}
        />
      );
    }

    case "date": {
      const dateValue = filterValue as string | undefined;
      const IconComponent = Icon as React.ComponentType<{ className?: string }> | undefined;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 border-dashed rounded-lg",
                dateValue && "border-solid"
              )}
            >
              {IconComponent ? (
                <IconComponent className="h-4 w-4" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              {columnMeta.label ?? column.id}
              {dateValue && (
                <>
                  <span className="mx-2 h-4 w-px bg-border" />
                  <span className="text-xs font-normal">
                    {format(new Date(dateValue), "MMM d, yyyy")}
                  </span>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue ? new Date(dateValue) : undefined}
              onSelect={(date) => column.setFilterValue(date?.toISOString() ?? null)}
              initialFocus
            />
            {dateValue && (
              <div className="p-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => column.setFilterValue(null)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      );
    }

    default:
      return null;
  }
}

