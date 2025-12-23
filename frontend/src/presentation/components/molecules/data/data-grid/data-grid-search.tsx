"use client";

import type { Table } from "@tanstack/react-table";
import * as React from "react";

import { SearchBar } from "@/presentation/components/molecules";
import { cn } from "@/shared/helpers";

interface DataGridSearchProps<TData>
  extends React.ComponentProps<"div"> {
  table: Table<TData>;
  placeholder?: string;
  columnId?: string;
}

export function DataGridSearch<TData>({
  table,
  placeholder = "Search...",
  columnId = "dba",
  className,
  ...props
}: DataGridSearchProps<TData>) {
  const [value, setValue] = React.useState("");

  // Check if table is using manual filtering (server-side)
  const isManualFiltering = table.options.manualFiltering;

  // Get the column for filtering
  const searchColumn = React.useMemo(
    () => table.getAllColumns().find((column) => column.id === columnId),
    [table, columnId],
  );

  // For manual filtering, use global filter which will be picked up by the onQueryChange effect
  // For client-side filtering, use column filter as before
  React.useEffect(() => {
    if (isManualFiltering) {
      // Set global filter which will trigger the search in the query
      table.setGlobalFilter(value || undefined);
    } else if (searchColumn) {
      // Use column filter for client-side filtering
      searchColumn.setFilterValue(value || undefined);
    }
  }, [value, isManualFiltering, searchColumn, table]);

  // Check if there's an active filter
  const hasFilters = isManualFiltering 
    ? table.getState().globalFilter !== undefined && table.getState().globalFilter !== ""
    : searchColumn ? searchColumn.getFilterValue() !== undefined && searchColumn.getFilterValue() !== "" : false;

  const handleClear = React.useCallback(() => {
    setValue("");
  }, []);

  return (
    <div
      className={cn("relative", className)}
      {...props}
    >
      <SearchBar
        placeholder={placeholder}
        value={value}
        onValueChange={setValue}
        onClear={handleClear}
        allowClear
        className="w-40 lg:w-56"
        inputClassName="h-8"
      />
    </div>
  );
}
