"use client";

import * as React from "react";
import { DataGridCellWrapper } from "./data-grid-cell-wrapper";
import { Badge } from "@/presentation/components/atoms/primitives/badge";
import { Checkbox } from "@/presentation/components/atoms/forms/checkbox";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/presentation/components/atoms/primitives/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/atoms/forms/select";
import { Calendar } from "@/presentation/components/atoms/primitives/calendar";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Input } from "@/presentation/components/atoms/forms/input";
import { CalendarIcon, X } from "lucide-react";
import { TooltipWrapper } from "@/presentation/components/molecules/ui/tooltip-wrapper";
import { cn } from "@/shared/helpers";
import type { CellVariantProps } from "@/types/data-grid";

export function ShortTextCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isEditing,
  isFocused,
  isSelected,
  readOnly,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue);
  const cellRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const prevInitialValueRef = React.useRef(initialValue);
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue;
    setValue(initialValue);
    if (cellRef.current && !isEditing) {
      cellRef.current.textContent = initialValue;
    }
  }

  const onBlur = React.useCallback(() => {
    const currentValue = cellRef.current?.textContent ?? "";
    if (!readOnly && currentValue !== initialValue) {
      tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
    }
    tableMeta?.onCellEditingStop?.();
  }, [tableMeta, rowIndex, columnId, initialValue, readOnly]);

  const onInput = React.useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const currentValue = event.currentTarget.textContent ?? "";
      setValue(currentValue);
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Enter") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            tableMeta?.onDataUpdate?.({
              rowIndex,
              columnId,
              value: currentValue,
            });
          }
          tableMeta?.onCellEditingStop?.({ moveToNextRow: true });
        } else if (event.key === "Tab") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            tableMeta?.onDataUpdate?.({
              rowIndex,
              columnId,
              value: currentValue,
            });
          }
          tableMeta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        } else if (event.key === "Escape") {
          event.preventDefault();
          setValue(initialValue);
          cellRef.current?.blur();
        }
      } else if (
        isFocused &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        setValue(event.key);

        queueMicrotask(() => {
          if (cellRef.current && cellRef.current.contentEditable === "true") {
            cellRef.current.textContent = event.key;
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(cellRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        });
      }
    },
    [isEditing, isFocused, initialValue, tableMeta, rowIndex, columnId],
  );

  React.useEffect(() => {
    if (isEditing && cellRef.current) {
      cellRef.current.focus();

      if (!cellRef.current.textContent && value) {
        cellRef.current.textContent = value;
      }

      if (cellRef.current.textContent) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(cellRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, [isEditing, value]);

  const displayValue = !isEditing ? (value ?? "") : "";
  const fullValue = String(initialValue ?? "");

  const contentNode = (
    <div
      role="textbox"
      data-slot="grid-cell-content"
      contentEditable={isEditing}
      tabIndex={-1}
      ref={cellRef}
      onBlur={onBlur}
      onInput={onInput}
      suppressContentEditableWarning
      className={cn(
        "block min-w-0 w-full overflow-hidden outline-none text-left",
        !isEditing && "truncate",
        isEditing && "flex min-h-full min-w-0 items-center justify-start",
        {
          "whitespace-nowrap **:inline **:whitespace-nowrap [&_br]:hidden":
            isEditing,
        },
      )}
    >
      {displayValue}
    </div>
  );

  return (
    <DataGridCellWrapper<TData>
      ref={containerRef}
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {!isEditing && fullValue ? (
        <TooltipWrapper
          content={fullValue}
          side="top"
          delayDuration={400}
          sideOffset={8}
          contentClassName="max-w-[min(40rem,90vw)] rounded-lg border border-border bg-popover px-4 py-2.5 text-sm text-popover-foreground shadow-md break-words leading-relaxed [&>svg]:fill-popover"
        >
          {contentNode}
        </TooltipWrapper>
      ) : (
        contentNode
      )}
    </DataGridCellWrapper>
  );
}

export function NumberCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
  readOnly,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as number;
  const [value, setValue] = React.useState(String(initialValue ?? ""));
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cellOpts = cell.column.columnDef.meta?.cell;
  const numberCellOpts = cellOpts?.variant === "number" ? cellOpts : null;
  const min = numberCellOpts?.min;
  const max = numberCellOpts?.max;
  const step = numberCellOpts?.step;

  const prevInitialValueRef = React.useRef(initialValue);
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue;
    setValue(String(initialValue ?? ""));
  }

  const onBlur = React.useCallback(() => {
    const numValue = value === "" ? null : Number(value);
    if (!readOnly && numValue !== initialValue) {
      tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: numValue });
    }
    tableMeta?.onCellEditingStop?.();
  }, [tableMeta, rowIndex, columnId, initialValue, value, readOnly]);

  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Enter") {
          event.preventDefault();
          const numValue = value === "" ? null : Number(value);
          if (numValue !== initialValue) {
            tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: numValue });
          }
          tableMeta?.onCellEditingStop?.({ moveToNextRow: true });
        } else if (event.key === "Tab") {
          event.preventDefault();
          const numValue = value === "" ? null : Number(value);
          if (numValue !== initialValue) {
            tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: numValue });
          }
          tableMeta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        } else if (event.key === "Escape") {
          event.preventDefault();
          setValue(String(initialValue ?? ""));
          inputRef.current?.blur();
        }
      } else if (isFocused) {
        if (event.key === "Backspace") {
          setValue("");
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          setValue(event.key);
        }
      }
    },
    [isEditing, isFocused, initialValue, tableMeta, rowIndex, columnId, value],
  );

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <DataGridCellWrapper<TData>
      ref={containerRef}
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onBlur={onBlur}
          onChange={onChange}
          className="w-full min-w-0 border-none bg-transparent p-0 text-left outline-none"
        />
      ) : (
        <span data-slot="grid-cell-content" className="text-left">{value}</span>
      )}
    </DataGridCellWrapper>
  );
}

export function CheckboxCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isFocused,
  isSelected,
  readOnly,
}: Omit<CellVariantProps<TData>, "isEditing">) {
  const initialValue = cell.getValue() as boolean;
  const [value, setValue] = React.useState(Boolean(initialValue));
  const containerRef = React.useRef<HTMLDivElement>(null);

  const prevInitialValueRef = React.useRef(initialValue);
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue;
    setValue(Boolean(initialValue));
  }

  const onCheckedChange = React.useCallback(
    (checked: boolean) => {
      if (readOnly) return;
      setValue(checked);
      tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: checked });
    },
    [tableMeta, rowIndex, columnId, readOnly],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        isFocused &&
        !readOnly &&
        (event.key === " " || event.key === "Enter")
      ) {
        event.preventDefault();
        event.stopPropagation();
        onCheckedChange(!value);
      } else if (isFocused && event.key === "Tab") {
        event.preventDefault();
        tableMeta?.onCellEditingStop?.({
          direction: event.shiftKey ? "left" : "right",
        });
      }
    },
    [isFocused, value, onCheckedChange, tableMeta, readOnly],
  );

  const onWrapperClick = React.useCallback(
    (event: React.MouseEvent) => {
      if (isFocused && !readOnly) {
        event.preventDefault();
        event.stopPropagation();
        onCheckedChange(!value);
      }
    },
    [isFocused, value, onCheckedChange, readOnly],
  );

  return (
    <DataGridCellWrapper<TData>
      ref={containerRef}
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={false}
      isFocused={isFocused}
      isSelected={isSelected}
      className="flex size-full justify-center"
      onClick={onWrapperClick}
      onKeyDown={onWrapperKeyDown}
    >
      <Checkbox
        checked={value}
        onCheckedChange={onCheckedChange}
        disabled={readOnly}
        className="border-primary"
      />
    </DataGridCellWrapper>
  );
}

export function SelectCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
  readOnly,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cellOpts = cell.column.columnDef.meta?.cell;
  const options = cellOpts?.variant === "select" ? cellOpts.options : [];

  const prevInitialValueRef = React.useRef(initialValue);
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue;
    setValue(initialValue);
  }

  const onValueChange = React.useCallback(
    (newValue: string) => {
      if (readOnly) return;
      setValue(newValue);
      tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: newValue });
      tableMeta?.onCellEditingStop?.();
    },
    [tableMeta, rowIndex, columnId, readOnly],
  );

  const onOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (isOpen && !readOnly) {
        tableMeta?.onCellEditingStart?.(rowIndex, columnId);
      } else {
        tableMeta?.onCellEditingStop?.();
      }
    },
    [tableMeta, rowIndex, columnId, readOnly],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing && event.key === "Escape") {
        event.preventDefault();
        setValue(initialValue);
        tableMeta?.onCellEditingStop?.();
      } else if (!isEditing && isFocused && event.key === "Tab") {
        event.preventDefault();
        tableMeta?.onCellEditingStop?.({
          direction: event.shiftKey ? "left" : "right",
        });
      }
    },
    [isEditing, isFocused, initialValue, tableMeta],
  );

  const displayLabel =
    options.find((opt) => opt.value === value)?.label ?? value;

  return (
    <DataGridCellWrapper<TData>
      ref={containerRef}
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {isEditing ? (
        <Select
          value={value}
          onValueChange={onValueChange}
          open={isEditing}
          onOpenChange={onOpenChange}
        >
          <SelectTrigger className="size-full min-w-0 items-center justify-start border-none p-0 text-left shadow-none focus-visible:ring-0 dark:bg-transparent [&_svg]:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            data-grid-cell-editor=""
            align="start"
            alignOffset={-8}
            sideOffset={-8}
            className="min-w-[calc(var(--radix-select-trigger-width)+16px)]"
          >
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span data-slot="grid-cell-content" className="text-left">{displayLabel}</span>
      )}
    </DataGridCellWrapper>
  );
}

function formatDateForDisplay(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

export function DateCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
  readOnly,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue ?? "");
  const [inputValue, setInputValue] = React.useState(formatDateForDisplay(value));
  const containerRef = React.useRef<HTMLDivElement>(null);

  const prevInitialValueRef = React.useRef(initialValue);
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue;
    setValue(initialValue ?? "");
    setInputValue(formatDateForDisplay(initialValue ?? ""));
  }

  const selectedDate = value ? new Date(value) : undefined;

  const onDateSelect = React.useCallback(
    (date: Date | undefined) => {
      if (!date || readOnly) return;

      const formattedDate = date.toISOString().split("T")[0] ?? "";
      setValue(formattedDate);
      setInputValue(formatDateForDisplay(formattedDate));
      tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: formattedDate });
      tableMeta?.onCellEditingStop?.();
    },
    [tableMeta, rowIndex, columnId, readOnly],
  );

  const onQuickSelect = React.useCallback(
    (daysOffset: number) => {
      if (readOnly) return;

      const date = new Date();
      date.setDate(date.getDate() + daysOffset);
      const formattedDate = date.toISOString().split("T")[0] ?? "";
      setValue(formattedDate);
      setInputValue(formatDateForDisplay(formattedDate));
      tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: formattedDate });
      tableMeta?.onCellEditingStop?.();
    },
    [tableMeta, rowIndex, columnId, readOnly],
  );

  const onInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
    },
    [],
  );

  const onInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        // Try to parse the input as a date
        const parsedDate = new Date(event.currentTarget.value);
        if (!isNaN(parsedDate.getTime())) {
          const formattedDate = parsedDate.toISOString().split("T")[0] ?? "";
          setValue(formattedDate);
          setInputValue(formatDateForDisplay(formattedDate));
          tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: formattedDate });
          tableMeta?.onCellEditingStop?.();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setInputValue(formatDateForDisplay(value));
        tableMeta?.onCellEditingStop?.();
      }
    },
    [tableMeta, rowIndex, columnId, value],
  );

  const onOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (isOpen && !readOnly) {
        tableMeta?.onCellEditingStart?.(rowIndex, columnId);
      } else if (!isOpen) {
        tableMeta?.onCellEditingStop?.();
      }
    },
    [tableMeta, rowIndex, columnId, readOnly],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing && event.key === "Escape") {
        event.preventDefault();
        setValue(initialValue);
        setInputValue(formatDateForDisplay(initialValue));
        tableMeta?.onCellEditingStop?.();
      } else if (!isEditing && isFocused && event.key === "Tab") {
        event.preventDefault();
        tableMeta?.onCellEditingStop?.({
          direction: event.shiftKey ? "left" : "right",
        });
      }
    },
    [isEditing, isFocused, initialValue, tableMeta],
  );

  return (
    <DataGridCellWrapper<TData>
      ref={containerRef}
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      <div className="flex size-full min-w-0 overflow-hidden items-center justify-start">
        <Popover open={isEditing} onOpenChange={onOpenChange}>
          <PopoverAnchor asChild>
            <span data-slot="grid-cell-content" className="inline-flex items-center text-left">
              {formatDateForDisplay(value)}
            </span>
          </PopoverAnchor>
          {isEditing && (
            <PopoverContent
              data-grid-cell-editor=""
              align="start"
              alignOffset={-8}
              className="w-80 p-0"
              side="bottom"
              sideOffset={4}
            >
              <div className="p-4 space-y-3">
                {/* Quick Select Buttons */}
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onQuickSelect(0)}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onQuickSelect(-1)}
                  >
                    Yesterday
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onQuickSelect(1)}
                  >
                    Tomorrow
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onQuickSelect(7)}
                  >
                    +7 days
                  </Button>
                </div>

                {/* Date Input */}
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={inputValue}
                    onChange={onInputChange}
                    onKeyDown={onInputKeyDown}
                    placeholder="MM/DD/YYYY"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  {value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted"
                      onClick={() => {
                        setValue("");
                        setInputValue("");
                        tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: "" });
                        tableMeta?.onCellEditingStop?.();
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Calendar */}
                <div className="border-t pt-3">
                  <Calendar
                    mode="single"
                    defaultMonth={selectedDate ?? new Date()}
                    selected={selectedDate}
                    onSelect={onDateSelect}
                    className="rounded-md"
                  />
                </div>
              </div>
            </PopoverContent>
          )}
        </Popover>
      </div>
    </DataGridCellWrapper>
  );
}

export function MultiSelectCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: CellVariantProps<TData>) {
  const cellValue = React.useMemo(() => {
    const value = cell.getValue() as string[];
    return value ?? [];
  }, [cell]);

  const [selectedValues] = React.useState<string[]>(cellValue);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cellOpts = cell.column.columnDef.meta?.cell;
  const options = cellOpts?.variant === "multi-select" ? cellOpts.options : [];

  const displayLabels = selectedValues
    .map((val) => options.find((opt) => opt.value === val)?.label ?? val)
    .filter(Boolean);

  return (
    <DataGridCellWrapper<TData>
      ref={containerRef}
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
    >
      {displayLabels.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 overflow-hidden">
          {displayLabels.slice(0, 3).map((label, index) => (
            <Badge
              key={selectedValues[index]}
              variant="secondary"
              className="h-5 shrink-0 px-1.5 text-xs"
            >
              {label}
            </Badge>
          ))}
          {displayLabels.length > 3 && (
            <Badge
              variant="outline"
              className="h-5 shrink-0 px-1.5 text-muted-foreground text-xs"
            >
              +{displayLabels.length - 3}
            </Badge>
          )}
        </div>
      ) : null}
    </DataGridCellWrapper>
  );
}

/** Parse comma-separated string into trimmed non-empty agent names (Excel-like). */
function parseAgentsNameInput(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AgentsNameCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isEditing,
  isFocused,
  isSelected,
  readOnly,
}: CellVariantProps<TData>) {
  const row = cell.row.original as Record<string, unknown>;
  const agentsName = (row?.agentsName ?? row?.[columnId]) as string[] | undefined;
  const list = Array.isArray(agentsName) ? agentsName : [];
  const initialText = list.length === 0 ? "" : list.join(", ");
  const [editValue, setEditValue] = React.useState(initialText);
  const cellRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const prevListRef = React.useRef(list);
  if (list !== prevListRef.current) {
    prevListRef.current = list;
    const nextText = list.length === 0 ? "" : list.join(", ");
    setEditValue(nextText);
    if (cellRef.current && !isEditing) {
      cellRef.current.textContent = nextText;
    }
  }

  const commitEdit = React.useCallback(
    (raw: string) => {
      const parsed = parseAgentsNameInput(raw);
      const same =
        list.length === parsed.length &&
        list.every((v, i) => v === parsed[i]);
      if (!same) {
        tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: parsed });
      }
      tableMeta?.onCellEditingStop?.();
    },
    [tableMeta, rowIndex, columnId, list],
  );

  const onBlur = React.useCallback(() => {
    const currentValue = cellRef.current?.textContent ?? editValue;
    if (!readOnly) {
      commitEdit(currentValue);
    } else {
      tableMeta?.onCellEditingStop?.();
    }
  }, [tableMeta, readOnly, editValue, commitEdit]);

  const onInput = React.useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      setEditValue(event.currentTarget.textContent ?? "");
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Enter") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? editValue;
          commitEdit(currentValue);
          tableMeta?.onCellEditingStop?.({ moveToNextRow: true });
        } else if (event.key === "Tab") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? editValue;
          commitEdit(currentValue);
          tableMeta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        } else if (event.key === "Escape") {
          event.preventDefault();
          setEditValue(initialText);
          if (cellRef.current) {
            cellRef.current.textContent = initialText;
          }
          tableMeta?.onCellEditingStop?.();
        }
      } else if (
        isFocused &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        setEditValue(event.key);
        queueMicrotask(() => {
          if (cellRef.current && cellRef.current.contentEditable === "true") {
            cellRef.current.textContent = event.key;
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(cellRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        });
      }
    },
    [isEditing, isFocused, initialText, editValue, tableMeta, commitEdit],
  );

  React.useEffect(() => {
    if (isEditing && cellRef.current) {
      cellRef.current.focus();
      const text = list.length === 0 ? "" : list.join(", ");
      if (!cellRef.current.textContent && text) {
        cellRef.current.textContent = text;
      }
      if (cellRef.current.textContent) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(cellRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, [isEditing, list]);

  const displayText = !isEditing ? (editValue ?? initialText) : "";
  const fullText = initialText || "";

  const contentNode = (
    <div
      role="textbox"
      data-slot="grid-cell-content"
      contentEditable={isEditing && !readOnly}
      tabIndex={-1}
      ref={cellRef}
      onBlur={onBlur}
      onInput={onInput}
      suppressContentEditableWarning
      className={cn(
        "block min-w-0 w-full overflow-hidden outline-none text-left",
        !isEditing && "truncate",
        isEditing && "flex min-h-full min-w-0 items-center justify-start",
        {
          "whitespace-nowrap **:inline **:whitespace-nowrap [&_br]:hidden":
            isEditing,
        },
      )}
    >
      {displayText}
    </div>
  );

  return (
    <DataGridCellWrapper<TData>
      ref={containerRef}
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {!isEditing && !fullText ? (
        <span className="text-left text-muted-foreground" data-slot="grid-cell-content">
          No agents
        </span>
      ) : !isEditing && fullText ? (
        <TooltipWrapper
          content={fullText}
          side="top"
          delayDuration={400}
          sideOffset={8}
          contentClassName="max-w-[min(40rem,90vw)] rounded-lg border border-border bg-popover px-4 py-2.5 text-sm text-popover-foreground shadow-md break-words leading-relaxed [&>svg]:fill-popover"
        >
          {contentNode}
        </TooltipWrapper>
      ) : (
        contentNode
      )}
    </DataGridCellWrapper>
  );
}

