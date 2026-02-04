"use client";

import type { Column } from "@tanstack/react-table";
import { Check, PlusCircle, XCircle } from "lucide-react";
import * as React from "react";

import { Badge } from "@/presentation/components/atoms/primitives/badge";
import { Button } from "@/presentation/components/atoms/primitives/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/presentation/components/atoms/primitives/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/presentation/components/atoms/primitives/popover";
import { Separator } from "@/presentation/components/atoms/primitives/separator";
import { cn } from "@/shared/helpers";
import type { Option } from "@/types/data-table";

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: Option[];
  multiple?: boolean;
  manualFiltering?: boolean;
  onFilterChange?: (values: string[]) => void;
  initialValues?: string[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  multiple,
  manualFiltering = false,
  onFilterChange,
  initialValues = [],
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [open, setOpen] = React.useState(false);

  // For manual filtering, manage selected values completely locally
  // Initialize from initialValues, but sync when initialValues change
  const [selectedValues, setSelectedValues] = React.useState<Set<string>>(() => new Set(initialValues));

  // For regular filtering, sync with column filter value
  const columnFilterValue = column?.getFilterValue();
  React.useEffect(() => {
    if (!manualFiltering && column) {
      const filterValues = Array.isArray(columnFilterValue)
        ? columnFilterValue
        : columnFilterValue
          ? [columnFilterValue]
          : [];
      setSelectedValues(new Set(filterValues));
    }
  }, [columnFilterValue, manualFiltering, column]);

  // Track pending filter changes to notify parent after render
  const pendingFilterChangeRef = React.useRef<string[] | null>(null);
  const isUserInteractionRef = React.useRef(false);

  // Notify parent of filter changes after render completes (only for user interactions)
  React.useEffect(() => {
    if (pendingFilterChangeRef.current !== null && manualFiltering && isUserInteractionRef.current) {
      const values = pendingFilterChangeRef.current;
      pendingFilterChangeRef.current = null;
      isUserInteractionRef.current = false;
      onFilterChange?.(values);
    }
  }, [selectedValues, manualFiltering, onFilterChange]);

  // Sync initialValues for manual filtering - this ensures checkbox state matches parent state
  // Only sync when initialValues actually changes (not on every render)
  const prevInitialValuesRef = React.useRef<string>(JSON.stringify([...initialValues].sort()));
  React.useEffect(() => {
    if (manualFiltering) {
      const currentValuesStr = JSON.stringify([...initialValues].sort());
      if (currentValuesStr !== prevInitialValuesRef.current) {
        prevInitialValuesRef.current = currentValuesStr;
        setSelectedValues(new Set(initialValues));
      }
    }
  }, [initialValues, manualFiltering]);

  const onItemSelect = React.useCallback(
    (option: Option, isSelected: boolean) => {
      if (manualFiltering) {
        // For manual filtering, manage state locally and notify parent
        // Calculate new values first
        const newSelectedValues = new Set(selectedValues);
        if (isSelected) {
          newSelectedValues.delete(option.value);
        } else {
          newSelectedValues.add(option.value);
        }

        // Mark this as a user interaction
        isUserInteractionRef.current = true;

        // Update local state
        setSelectedValues(newSelectedValues);

        // Store pending filter change to notify parent after render
        const filterValues = Array.from(newSelectedValues);
        pendingFilterChangeRef.current = filterValues;

        if (!multiple) {
          setOpen(false);
        }
      } else if (column) {
        // For regular filtering, use column filter values
        if (multiple) {
          const newSelectedValues = new Set(selectedValues);
          if (isSelected) {
            newSelectedValues.delete(option.value);
          } else {
            newSelectedValues.add(option.value);
          }
          const filterValues = Array.from(newSelectedValues);
          column.setFilterValue(filterValues.length ? filterValues : undefined);
          setSelectedValues(newSelectedValues);
        } else {
          const newValue = isSelected ? undefined : [option.value];
          column.setFilterValue(newValue);
          setSelectedValues(isSelected ? new Set() : new Set([option.value]));
          setOpen(false);
        }
      }
    },
    [column, multiple, manualFiltering, selectedValues],
  );

  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();

      if (manualFiltering) {
        // For manual filtering, clear local state and notify parent
        setSelectedValues(new Set());
        onFilterChange?.([]);
      } else {
        // For regular filtering, clear column filter
        column?.setFilterValue(undefined);
      }
    },
    [column, manualFiltering, onFilterChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 shrink-0 border-dashed p-0 font-normal sm:h-8 sm:w-auto sm:min-w-0 sm:px-3 sm:py-0"
          aria-label={title}
        >
          {selectedValues?.size > 0 ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onReset}
            >
              <XCircle className="size-4" />
            </div>
          ) : (
            <PlusCircle className="size-4" />
          )}
          <span className="hidden sm:inline">{title}</span>
          {selectedValues?.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 hidden data-[orientation=vertical]:h-4 sm:block"
              />
              <Badge
                variant="secondary"
                size="sm"
                className="hidden rounded-sm font-normal sm:inline-flex lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden items-center gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    size="sm"
                    className="rounded-sm font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        size="sm"
                        key={option.value}
                        className="rounded-sm font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-50 p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      // Calculate isSelected from current state at click time, not render time
                      const currentlySelected = selectedValues.has(option.value);
                      onItemSelect(option, currentlySelected);
                    }}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check />
                    </div>
                    {option.icon && <option.icon />}
                    <span className="truncate">{option.label}</span>
                    {option.count && (
                      <span className="ml-auto font-mono text-xs">
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onReset()}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

