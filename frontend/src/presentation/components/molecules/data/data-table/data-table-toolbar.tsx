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
  /** When provided, on mobile: date range is above search bar; search row includes Reset */
  dateRangeFilter?: React.ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  onManualFilterChange?: (columnId: string, values: string[]) => void;
  initialFilterValues?: Record<string, string[]>;
}

export function DataTableToolbar<TData>({
  table,
  children,
  searchBar,
  dateRangeFilter,
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
        "flex w-full flex-col gap-2 py-2 min-w-0 min-h-8",
        "sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:py-1 sm:min-h-8",
        "lg:flex-nowrap lg:items-center lg:overflow-x-auto",
        className,
      )}
      {...props}
    >
      {/* When dateRangeFilter provided: mobile = date above, search+Reset row; tablet+ = same row */}
      {dateRangeFilter && (
        <>
          {/* Mobile: date range on its own row above */}
          <div className="flex w-full sm:hidden shrink-0">
            {dateRangeFilter}
          </div>
          {/* Mobile: search row with Reset */}
          <div className="flex w-full sm:hidden lg:hidden items-center flex-nowrap gap-2 overflow-x-auto min-w-0">
            {searchBar}
            {hasActiveFilters && (
              <Button
                aria-label="Reset filters"
                variant="outline"
                size="sm"
                className="h-8 w-8 shrink-0 border-dashed p-0"
                onClick={onReset}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          {/* Tablet+: date + search + Reset in one row (same row height as filter buttons) */}
          <div className="hidden sm:flex sm:w-auto sm:min-w-0 sm:shrink items-center min-h-8 flex-nowrap gap-2 overflow-x-auto">
            {dateRangeFilter}
            {searchBar}
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
        </>
      )}

      {/* When no dateRangeFilter: original layout (searchBar may include date) */}
      {!dateRangeFilter && (searchBar || hasActiveFilters) && (
        <div className="flex w-full min-w-0 items-center flex-nowrap gap-2 overflow-x-auto sm:w-auto sm:max-w-md sm:shrink-0 md:max-w-lg lg:max-w-none lg:min-w-0 lg:shrink">
          {searchBar}
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
      )}

      {/* Right: Status, Plan, Term filters + children + View options (align with left row) */}
      <div className="flex flex-1 flex-wrap items-center min-h-8 gap-2 min-w-0 justify-start sm:justify-end overflow-x-auto sm:overflow-visible lg:flex-nowrap lg:justify-end">
        {columns.map((column) => (
          <DataTableToolbarFilter
            key={column.id}
            column={column}
            table={table}
            onManualFilterChange={onManualFilterChange}
            initialFilterValues={initialFilterValues}
          />
        ))}
        <div className="flex items-center gap-2 shrink-0">
          {children}
          <DataTableViewOptions table={table} align="end" />
        </div>
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
  // and send as search param (e.g. Agent Name filter → backend search).
  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearchValue(value);
      debouncedSetFilter(value);
    },
    [debouncedSetFilter]
  );

  // Sync local state with column filter value when it changes externally (e.g., reset button)
  const columnFilterValue = (column.getFilterValue() as string) ?? "";
  React.useEffect(() => {
    setSearchValue(columnFilterValue);
  }, [column, columnFilterValue]);

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
            inputClassName="h-8 py-0"
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
              className={cn("h-8 w-[120px] py-0", columnMeta.unit && "pr-8")}
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
