"use client";

import type { Table } from "@tanstack/react-table";
import {
  AlignVerticalSpaceAroundIcon,
  ChevronsDownUpIcon,
  EqualIcon,
  MinusIcon,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/presentation/components/atoms/primitives/badge";
import { Button } from "@/presentation/components/atoms/primitives/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/presentation/components/atoms/primitives/popover";

const rowHeights = [
  {
    label: "Short",
    value: "short" as const,
    icon: MinusIcon,
  },
  {
    label: "Medium",
    value: "medium" as const,
    icon: EqualIcon,
  },
  {
    label: "Tall",
    value: "tall" as const,
    icon: AlignVerticalSpaceAroundIcon,
  },
  {
    label: "Extra Tall",
    value: "extra-tall" as const,
    icon: ChevronsDownUpIcon,
  },
] as const;

interface DataGridRowHeightMenuProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
}

export function DataGridRowHeightMenu<TData>({
  table,
  ...props
}: DataGridRowHeightMenuProps<TData>) {
  const id = React.useId();
  const labelId = React.useId();
  const descriptionId = React.useId();
  const [open, setOpen] = React.useState(false);

  const rowHeight = table.options.meta?.rowHeight;
  const onRowHeightChange = table.options.meta?.onRowHeightChange;

  const selectedRowHeight = React.useMemo(() => {
    return (
      rowHeights.find((opt) => opt.value === rowHeight) ?? {
        label: "Short",
        value: "short" as const,
        icon: MinusIcon,
      }
    );
  }, [rowHeight]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-normal"
        >
          <selectedRowHeight.icon className="text-muted-foreground size-3" />
          <span className="hidden md:inline">Row height</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        className="flex w-full max-w-[var(--radix-popover-content-available-width)] flex-col gap-3.5 p-4 sm:min-w-[200px]"
        {...props}
      >
        <div className="flex flex-col gap-1">
          <h4 id={labelId} className="font-medium leading-none">
            Row height
          </h4>
          <p
            id={descriptionId}
            className="text-muted-foreground text-sm"
          >
            Adjust the height of table rows.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {rowHeights.map((option) => {
            const OptionIcon = option.icon;
            return (
              <Button
                key={option.value}
                variant={rowHeight === option.value ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => {
                  onRowHeightChange?.(option.value);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-1.5">
                  <OptionIcon className="size-4" />
                  <span className="text-xs">{option.label}</span>
                </div>
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

