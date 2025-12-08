"use client";

import type { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/presentation/components/atoms/primitives/button";
import { Input } from "@/presentation/components/atoms/forms/input";
import { cn } from "@/shared/utils";

interface DataGridSearchProps<TData>
  extends React.ComponentProps<"div"> {
  table: Table<TData>;
  placeholder?: string;
}

export function DataGridSearch<TData>({
  table,
  placeholder = "Search...",
  className,
  ...props
}: DataGridSearchProps<TData>) {
  const [value, setValue] = React.useState("");

  // Get DBA column specifically for search
  const dbaColumn = React.useMemo(
    () => table.getAllColumns().find((column) => column.id === "dbA"),
    [table],
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
      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-8 w-40 pl-8 pr-8 lg:w-56"
      />
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
          onClick={handleClear}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
