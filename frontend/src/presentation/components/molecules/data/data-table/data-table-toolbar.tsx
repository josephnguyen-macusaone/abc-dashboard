"use client";

import type { Column, Table } from "@tanstack/react-table";
import * as React from "react";
import { X } from "lucide-react";

import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableSliderFilter } from "./data-table-slider-filter";
import { DataTableViewOptions } from "./data-table-view-options";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Input } from "@/presentation/components/atoms/forms/input";
import { SearchBar } from "@/presentation/components/molecules";
import { cn } from "@/shared/helpers";
import { useDebouncedCallback } from "@/presentation/hooks/use-debounced-callback";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  searchBar?: React.ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  onManualFilterChange?: (columnId: string, values: string[]) => void;
  initialFilterValues?: Record<string, string[]>;
}

export function DataTableToolbar<TData>({
  table,
  children,
  searchBar,
  onReset: customOnReset,
  hasActiveFilters: externalHasActiveFilters,
  onManualFilterChange,
  initialFilterValues,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const hasActiveFilters = externalHasActiveFilters !== undefined ? externalHasActiveFilters : isFiltered;

  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  const onReset = React.useCallback(() => {
    if (customOnReset) {
      customOnReset();
    } else {
      table.resetColumnFilters();
      // Reset to first page when filters are cleared
      table.setPageIndex(0);
    }
  }, [table, customOnReset]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 py-1",
        className,
      )}
      {...props}
    >
      {/* Left: search + filters. Right: View button. */}
      <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
        {searchBar && (
          <div className="flex w-full sm:w-auto items-center">
            {searchBar}
          </div>
        )}
        {columns.map((column) => (
          <DataTableToolbarFilter
            key={column.id}
            column={column}
            table={table}
            onManualFilterChange={onManualFilterChange}
            initialFilterValues={initialFilterValues}
          />
        ))}
        {hasActiveFilters && (
          <Button
            aria-label="Reset filters"
            variant="outline"
            size="sm"
            className="h-8 w-8 shrink-0 border-dashed p-0 sm:h-8 sm:w-auto sm:min-w-0 sm:px-3 sm:py-0"
            onClick={onReset}
          >
            <X className="size-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
        {children}
        <DataTableViewOptions table={table} align="end" />
      </div>
    </div>
  );
}

interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>;
  table: Table<TData>;
  onManualFilterChange?: (columnId: string, values: string[]) => void;
  initialFilterValues?: Record<string, string[]>;
}

function DataTableToolbarFilter<TData>({
  column,
  table,
  onManualFilterChange,
  initialFilterValues,
}: DataTableToolbarFilterProps<TData>) {
  const columnMeta = column.columnDef.meta;
  const isManualFiltering = table?.options?.manualFiltering ?? false;

  const [searchValue, setSearchValue] = React.useState<string>(
    (column.getFilterValue() as string) ?? ""
  );

  // Debounce search for client-side text filters (300ms delay)
  const debouncedSetFilter = useDebouncedCallback(
    (value: string) => {
      column.setFilterValue(value || undefined);
    },
    300
  );

  // For manual filtering with text variant, still set column filter so parent can read it
  // and send as search param (e.g. Agents Name filter → backend search).
  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearchValue(value);
      debouncedSetFilter(value);
    },
    [debouncedSetFilter]
  );

  // Sync local state with column filter value when it changes externally (e.g., reset button)
  React.useEffect(() => {
    const filterValue = (column.getFilterValue() as string) ?? "";
    setSearchValue(filterValue);
  }, [column.getFilterValue()]);

  const onFilterRender = React.useCallback(() => {
    if (!columnMeta?.variant) return null;

    switch (columnMeta.variant) {
      case "text":
        return (
          <SearchBar
            placeholder={columnMeta.placeholder ?? columnMeta.label}
            value={searchValue}
            onValueChange={handleSearchChange}
            allowClear
            className="w-40 lg:w-56"
            inputClassName="h-8"
          />
        );

      case "number":
        return (
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(event) => column.setFilterValue(event.target.value)}
              className={cn("h-8 w-[120px]", columnMeta.unit && "pr-8")}
            />
            {columnMeta.unit && (
              <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                {columnMeta.unit}
              </span>
            )}
          </div>
        );

      case "range":
        return (
          <DataTableSliderFilter
            column={column}
            title={columnMeta.label ?? column.id}
          />
        );

      case "select":
      case "multiSelect":
        return (
          <DataTableFacetedFilter
            column={column}
            title={columnMeta.label ?? column.id}
            options={columnMeta.options ?? []}
            multiple={columnMeta.variant === "multiSelect"}
            manualFiltering={isManualFiltering}
            onFilterChange={isManualFiltering ? (values) => onManualFilterChange?.(column.id, values) : undefined}
            initialValues={initialFilterValues?.[column.id] ?? []}
          />
        );

      default:
        return null;
    }
  }, [column, columnMeta, isManualFiltering, onManualFilterChange, initialFilterValues, searchValue, handleSearchChange]);

  return onFilterRender();
}
