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
import { CalendarIcon, History, X } from "lucide-react";
import { TooltipWrapper } from "@/presentation/components/molecules/ui/tooltip-wrapper";
import { LicenseStatusBadge } from "@/presentation/components/molecules/domain/license-management/badges";
import { getRowHeightValue } from "@/shared/lib/data-grid";
import { cn } from "@/shared/helpers";
import type { CellAlign, CellSelectOption, CellVariantProps } from "@/types/data-grid";
import type { LicenseStatus } from "@/types/license";
import type { LicenseRecord } from "@/types";

const LICENSE_ROW_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeShortTextForPlaceholder(raw: unknown): string {
  if (raw == null) {
    return "";
  }
  const s = String(raw).trim();
  if (s === "" || s === "0") {
    return "";
  }
  return s;
}

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
  const cellOpts = cell.column.columnDef.meta?.cell;
  const placeholder =
    cellOpts?.variant === "short-text" ? cellOpts.placeholder : undefined;
  const rawCellValue = cell.getValue();
  const initialValue = placeholder
    ? normalizeShortTextForPlaceholder(rawCellValue)
    : String(rawCellValue ?? "");
  const [value, setValue] = React.useState(initialValue);
  const cellRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const applyNormalizedCommit = React.useCallback(() => {
    if (readOnly) {
      return;
    }
    const raw = cellRef.current?.textContent ?? "";
    const committed = placeholder
      ? normalizeShortTextForPlaceholder(raw)
      : String(raw).trim();
    const baseline = placeholder
      ? initialValue
      : String(initialValue ?? "").trim();
    setValue(committed);
    if (committed !== baseline) {
      tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: committed });
    }
  }, [
    placeholder,
    initialValue,
    readOnly,
    tableMeta,
    rowIndex,
    columnId,
  ]);

  const onBlur = React.useCallback(() => {
    applyNormalizedCommit();
    tableMeta?.onCellEditingStop?.();
  }, [applyNormalizedCommit, tableMeta]);

  const onInput = React.useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const currentValue = event.currentTarget.textContent ?? "";
      setValue(currentValue);
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing && !readOnly) {
        if (event.key === "Enter") {
          event.preventDefault();
          applyNormalizedCommit();
          tableMeta?.onCellEditingStop?.({ moveToNextRow: true });
        } else if (event.key === "Tab") {
          event.preventDefault();
          applyNormalizedCommit();
          tableMeta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        } else if (event.key === "Escape") {
          event.preventDefault();
          setValue(initialValue);
          cellRef.current?.blur();
        }
      } else if (isEditing && readOnly) {
        if (event.key === "Escape") {
          event.preventDefault();
          tableMeta?.onCellEditingStop?.();
        }
      } else if (
        isFocused &&
        !readOnly &&
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
    [isEditing, isFocused, initialValue, readOnly, tableMeta, applyNormalizedCommit],
  );

  React.useEffect(() => {
    if (isEditing && !readOnly && cellRef.current) {
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
  }, [isEditing, readOnly, value]);

  const cellMeta = cell.column.columnDef.meta?.cell as { align?: CellAlign } | undefined;
  const align = cellMeta?.align;
  const wrapperAlignClass =
    align === "end"
      ? "justify-end text-end"
      : align === "center"
        ? "justify-center text-center"
        : undefined;

  const fullValue = String(initialValue ?? "");
  const contentHeight = Math.max(
    getRowHeightValue(tableMeta?.rowHeight ?? "medium") - 24,
    20,
  );

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
        "block min-w-0 w-full overflow-hidden outline-none",
        align === "end" ? "text-right" : align === "center" ? "text-center" : "text-left",
        !isEditing && "truncate",
        isEditing && "w-full min-w-0",
        {
          "whitespace-nowrap **:inline **:whitespace-nowrap [&_br]:hidden":
            isEditing,
        },
      )}
      style={
        isEditing
          ? { height: contentHeight, lineHeight: `${contentHeight}px` }
          : undefined
      }
    >
      {(!isEditing || readOnly) ? (value ?? "") : ""}
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
      className={wrapperAlignClass}
    >
      {!isEditing && placeholder && !fullValue ? (
        <span
          data-slot="grid-cell-content"
          className={cn(
            "block min-w-0 w-full select-none truncate text-muted-foreground",
            align === "end"
              ? "text-right"
              : align === "center"
                ? "text-center"
                : "text-left",
          )}
        >
          {placeholder}
        </span>
      ) : !isEditing && fullValue ? (
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

  React.useEffect(() => {
    setValue(String(initialValue ?? ""));
  }, [initialValue]);

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
      if (isEditing && !readOnly) {
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
      } else if (isEditing && readOnly) {
        if (event.key === "Escape") {
          event.preventDefault();
          tableMeta?.onCellEditingStop?.();
        }
      } else if (isFocused && !readOnly) {
        if (event.key === "Backspace") {
          setValue("");
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          setValue(event.key);
        }
      }
    },
    [isEditing, isFocused, initialValue, readOnly, tableMeta, rowIndex, columnId, value],
  );

  React.useEffect(() => {
    if (isEditing && !readOnly && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, readOnly]);

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
      className="justify-end text-end"
    >
      {isEditing && !readOnly ? (
        <input
          ref={inputRef}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onBlur={onBlur}
          onChange={onChange}
          className="w-full min-w-0 border-none bg-transparent p-0 text-right outline-none"
        />
      ) : (
        <span data-slot="grid-cell-content" className="text-right tabular-nums">{value}</span>
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

  React.useEffect(() => {
    setValue(Boolean(initialValue));
  }, [initialValue]);

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
  const options: CellSelectOption[] =
    cellOpts?.variant === "select" ? cellOpts.options : [];

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

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
    options.find((opt) => opt.value === value)?.label ?? (value || (options[0]?.label ?? ""));

  const cellMeta = cellOpts as { align?: CellAlign } | undefined;
  const align = cellMeta?.align;
  const alignClass =
    align === "end"
      ? "justify-end text-end"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start text-start";
  const textAlignClass = align === "end" ? "text-end" : align === "center" ? "text-center" : "text-start";

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
      className={alignClass}
    >
      {isEditing && !readOnly ? (
        <Select
          value={value}
          onValueChange={onValueChange}
          open={isEditing && !readOnly}
          onOpenChange={onOpenChange}
        >
          <SelectTrigger className={cn("size-full min-w-0 border-none p-0 shadow-none focus-visible:ring-0 dark:bg-transparent [&_svg]:hidden", align === "end" ? "items-center justify-end" : align === "center" ? "items-center justify-center" : "items-center justify-start", textAlignClass)}>
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
        <span data-slot="grid-cell-content" className={textAlignClass}>{displayLabel}</span>
      )}
    </DataGridCellWrapper>
  );
}

/** License status cell: badge when not editing, select when editing (like data-table) */
export function LicenseStatusCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
  readOnly,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as LicenseStatus;
  const [value, setValue] = React.useState(initialValue);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cellOpts = cell.column.columnDef.meta?.cell as { variant: "license-status"; options?: { value: string; label: string }[]; align?: CellAlign } | undefined;
  const options = cellOpts?.options ?? [];
  const align = cellOpts?.align;
  const alignClass = align === "end" ? "justify-end text-end" : align === "center" ? "justify-center text-center" : "justify-start text-start";
  const triggerAlignClass = align === "end" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const textAlignClass = align === "end" ? "text-end" : align === "center" ? "text-center" : "text-start";

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onValueChange = React.useCallback(
    (newValue: string) => {
      if (readOnly) return;
      setValue(newValue as LicenseStatus);
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
      className={alignClass}
    >
      {isEditing && !readOnly ? (
        <Select
          value={value}
          onValueChange={onValueChange}
          open={isEditing && !readOnly}
          onOpenChange={onOpenChange}
        >
          <SelectTrigger className={cn("size-full min-w-0 items-center border-none p-0 shadow-none focus-visible:ring-0 dark:bg-transparent [&_svg]:hidden", triggerAlignClass, textAlignClass)}>
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
        <div className={cn("flex items-center w-full", triggerAlignClass)} data-slot="grid-cell-content">
          <LicenseStatusBadge status={value} variant="table" showIcon />
        </div>
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
  const [inputValue, setInputValue] = React.useState(() =>
    formatDateForDisplay(initialValue ?? ""),
  );
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setValue(initialValue ?? "");
    setInputValue(formatDateForDisplay(initialValue ?? ""));
  }, [initialValue]);

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
      if (readOnly) return;
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
    [readOnly, tableMeta, rowIndex, columnId, value],
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

  const cellMeta = cell.column.columnDef.meta?.cell as { align?: CellAlign } | undefined;
  const align = cellMeta?.align;
  const wrapperAlignClass =
    align === "end"
      ? "justify-end text-end"
      : align === "center"
        ? "justify-center text-center"
        : undefined;
  const innerJustifyClass =
    align === "end"
      ? "justify-end"
      : align === "center"
        ? "justify-center"
        : "justify-start";
  const textAlignClass =
    align === "end"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

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
      className={wrapperAlignClass}
    >
      <div className={cn("flex size-full min-w-0 overflow-hidden items-center", innerJustifyClass)}>
        <Popover open={isEditing && !readOnly} onOpenChange={onOpenChange}>
          <PopoverAnchor asChild>
            <span
              data-slot="grid-cell-content"
              className={cn(
                "inline-flex items-center",
                textAlignClass,
                !value && "text-muted-foreground"
              )}
            >
              {formatDateForDisplay(value) || "—"}
            </span>
          </PopoverAnchor>
          {isEditing && !readOnly && (
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
  const options: CellSelectOption[] =
    cellOpts?.variant === "multi-select" ? cellOpts.options : [];

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
      className="justify-center text-center"
    >
      {displayLabels.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-1 overflow-hidden">
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

/** Plan module options for license plan cell */
const PLAN_MODULE_OPTIONS = [
  { label: 'Basic', value: 'Basic' },
  { label: 'Print Check', value: 'Print Check' },
  { label: 'Staff Performance', value: 'Staff Performance' },
  { label: 'Unlimited SMS', value: 'Unlimited SMS' },
];

export function PlanModulesCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
  readOnly,
}: CellVariantProps<TData>) {
  const row = cell.row.original as Record<string, unknown>;
  const planValue = (row?.plan ?? cell.getValue()) as string | undefined;
  const pkg = row?.Package as Record<string, unknown> | undefined;
  const initialModules: string[] = React.useMemo(() => {
    if (pkg && typeof pkg === 'object') {
      const arr: string[] = [];
      if (pkg.basic) arr.push('Basic');
      if (pkg.print_check) arr.push('Print Check');
      if (pkg.staff_performance) arr.push('Staff Performance');
      if (pkg.sms_package_6000) arr.push('Unlimited SMS');
      return arr;
    }
    if (typeof planValue === 'string' && planValue.trim()) {
      return planValue.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [planValue, pkg]);

  const [selectedModules, setSelectedModules] = React.useState<string[]>(initialModules);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setSelectedModules(initialModules);
  }, [initialModules]);

  const onToggle = React.useCallback(
    (value: string, checked: boolean) => {
      if (readOnly) return;
      const next = checked
        ? [...selectedModules, value]
        : selectedModules.filter((v) => v !== value);
      setSelectedModules(next);
      const planStr = next.join(', ');
      const nextPackage = {
        basic: next.includes('Basic'),
        print_check: next.includes('Print Check'),
        staff_performance: next.includes('Staff Performance'),
        sms_package_6000: next.includes('Unlimited SMS'),
      };
      tableMeta?.onDataUpdate?.([
        { rowIndex, columnId, value: planStr },
        { rowIndex, columnId: 'Package', value: nextPackage },
      ]);
    },
    [tableMeta, rowIndex, columnId, selectedModules, readOnly],
  );

  const displayLabels = selectedModules;

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) tableMeta?.onCellEditingStop?.();
    },
    [tableMeta],
  );

  const displayText = displayLabels.length > 0 ? displayLabels.join(', ') : null;

  const cellMeta = cell.column.columnDef.meta?.cell as { align?: CellAlign } | undefined;
  const align = cellMeta?.align;
  const alignClass =
    align === "end"
      ? "justify-end text-end"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start text-start";
  const textAlignClass = align === "end" ? "text-end" : align === "center" ? "text-center" : "text-start";

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
      className={alignClass}
    >
      <div className={cn("flex size-full min-w-0 items-center overflow-hidden", align === "end" ? "justify-end" : align === "center" ? "justify-center" : "justify-start")}>
        <Popover open={isEditing && !readOnly} onOpenChange={onOpenChange}>
          <PopoverAnchor asChild>
            <div
              data-slot="grid-cell-content"
              className={cn("min-w-0 py-1 text-sm", textAlignClass)}
            >
              {displayText !== null ? (
                <span className={cn("truncate block", textAlignClass)} title={displayText}>
                  {displayText}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          </PopoverAnchor>
          {isEditing && !readOnly && (
            <PopoverContent
              data-grid-cell-editor=""
              align="start"
              side="top"
              sideOffset={4}
              className="w-auto min-w-fit p-3"
              collisionPadding={8}
            >
              <div className="flex flex-col gap-1.5">
                {PLAN_MODULE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 py-0.5 text-sm cursor-pointer rounded-sm hover:bg-muted/50 px-1 -mx-1"
                  >
                    <Checkbox
                      checked={selectedModules.includes(opt.value)}
                      onCheckedChange={(checked) =>
                        onToggle(opt.value, checked === true)
                      }
                      className="border-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </PopoverContent>
          )}
        </Popover>
      </div>
    </DataGridCellWrapper>
  );
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
  const agentsName = (row?.agentsName ?? row?.[columnId]) as string | undefined;
  const initialText = typeof agentsName === 'string' ? agentsName : '';
  const [editValue, setEditValue] = React.useState(initialText);
  const cellRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const nextText = typeof agentsName === 'string' ? agentsName : '';
    setEditValue(nextText);
  }, [agentsName]);

  React.useEffect(() => {
    if (!isEditing && cellRef.current) {
      const nextText = typeof agentsName === 'string' ? agentsName : '';
      cellRef.current.textContent = nextText;
    }
  }, [agentsName, isEditing]);

  const commitEdit = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      const currentValue = typeof agentsName === 'string' ? agentsName : '';
      if (trimmed !== currentValue) {
        tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: trimmed });
      }
      tableMeta?.onCellEditingStop?.();
    },
    [tableMeta, rowIndex, columnId, agentsName],
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
      const text = initialText ?? "";
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
  }, [isEditing, initialText]);

  const displayText = !isEditing ? (editValue ?? initialText) : "";
  const fullText = initialText || "";
  const contentHeight = Math.max(
    getRowHeightValue(tableMeta?.rowHeight ?? "medium") - 24,
    20,
  );

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
        isEditing && "w-full min-w-0",
        {
          "whitespace-nowrap **:inline **:whitespace-nowrap [&_br]:hidden":
            isEditing,
        },
      )}
      style={
        isEditing
          ? { height: contentHeight, lineHeight: `${contentHeight}px` }
          : undefined
      }
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

export function AuditHistoryCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isEditing,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const row = cell.row.original as LicenseRecord;
  const id = row.id;
  const canOpen = typeof id === "string" && LICENSE_ROW_UUID_RE.test(id);
  const label = row.dba?.trim() || String(id ?? "");

  return (
    <DataGridCellWrapper<TData>
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
    >
      <div className="flex h-full w-full items-center justify-center px-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="View activity log"
          title={canOpen ? "Activity log" : "Save the license to view activity"}
          disabled={!canOpen || !tableMeta?.onOpenLicenseAuditHistory}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!canOpen || !tableMeta?.onOpenLicenseAuditHistory) return;
            tableMeta.onOpenLicenseAuditHistory({
              licenseId: String(id),
              label,
            });
          }}
        >
          <History className="size-4" />
        </Button>
      </div>
    </DataGridCellWrapper>
  );
}
