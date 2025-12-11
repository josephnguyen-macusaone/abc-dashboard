"use client";

import type { Table } from "@tanstack/react-table";
import * as React from "react";

import { SearchBar } from "@/presentation/components/molecules";
import { cn } from "@/shared/utils";

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

  // Get DBA column specifically for search
  const dbaColumn = React.useMemo(
    () => table.getAllColumns().find((column) => column.id === columnId),
    [table, columnId],
  );

  // Update DBA column filter when search value changes
  React.useEffect(() => {
    if (dbaColumn) {
      dbaColumn.setFilterValue(value || undefined);
    }
  }, [value, dbaColumn]);

  // Check if DBA column has a filter value
  const hasFilters = dbaColumn ? dbaColumn.getFilterValue() !== undefined && dbaColumn.getFilterValue() !== "" : false;

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
