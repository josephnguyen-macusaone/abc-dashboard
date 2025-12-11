"use client";

import type { Table } from "@tanstack/react-table";
import { Check, Settings2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/presentation/components/atoms/primitives/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/presentation/components/atoms/primitives/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/presentation/components/atoms/primitives/popover";
import { cn } from "@/shared/utils";

interface DataGridViewMenuProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
}

export function DataGridViewMenu<TData>({
  table,
  className,
  ...props
}: DataGridViewMenuProps<TData>) {
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== "undefined" && column.getCanHide(),
        ),
    [table],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Toggle columns"
          role="combobox"
          variant="outline"
          size="sm"
          className="ms-auto h-8 font-normal flex"
        >
          <Settings2 className="text-muted-foreground" />
          <span className="hidden md:inline ml-1">View</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-44 p-0", className)}
        {...props}
      >
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }
                >
                  <span className="truncate">
                    {column.columnDef.meta?.label ?? column.id}
                  </span>
                  <Check
                    className={cn(
                      "ms-auto size-4 shrink-0",
                      column.getIsVisible() ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

