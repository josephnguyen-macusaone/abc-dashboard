'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Columns3,
  X,
} from 'lucide-react';
import { cn } from '@/shared/helpers';
import { Typography } from '@/presentation/components/atoms';
import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { Button } from '@/presentation/components/atoms/primitives/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/presentation/components/atoms/primitives/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/atoms/primitives/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/atoms/forms/select';
import { Separator } from '@/presentation/components/atoms/primitives/separator';
import {
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/presentation/components/atoms/primitives/table';
import { DataTableDateRangeFilter } from '@/presentation/components/molecules/data/data-table';
import type { SmsPaymentRecord } from '@/infrastructure/api/licenses/types';
import type { SmsPaymentsMeta } from '@/domain/repositories/i-license-repository';
import { LicenseStatusBadge } from '@/presentation/components/molecules/domain/license-management/badges';

// ─── Formatters ──────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const [datePart, timePart] = dateStr.split(' ');
    const [month, day, year] = datePart.split('/');
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}${timePart ? `T${timePart}:00` : ''}`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplayDate(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toApiDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmsPaymentHistoryQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface SmsPaymentHistorySectionProps {
  payments: SmsPaymentRecord[];
  pagination: SmsPaymentsMeta | null;
  isLoading?: boolean;
  /** Only for non-recoverable API failures (network, 5xx). "No data" cases use empty state like My Licenses. */
  fetchError?: string | null;
  /** Shown in the empty state (muted) when there is no fetch error — e.g. license missing App ID / email for SMS scope */
  emptyStateDetail?: string | null;
  onQueryChange: (params: SmsPaymentHistoryQueryParams) => void;
  className?: string;
}

/** Taller list area: min height + scroll when many rows */
const SMS_PAYMENT_TABLE_VIEWPORT_CLASS =
  'sms-payment-history-viewport w-full min-h-[min(30rem,55vh)] max-h-[min(75vh,52rem)] overflow-auto rounded-md border';

// ─── Column definitions (for view options) ───────────────────────────────────

const TOGGLEABLE_COLUMNS = [
  { id: 'txnId', label: 'Transaction ID' },
  { id: 'authCode', label: 'Auth Code' },
  { id: 'card', label: 'Card' },
] as const;

type ToggleableColumnId = (typeof TOGGLEABLE_COLUMNS)[number]['id'];
type HiddenCols = Set<ToggleableColumnId>;

const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
];

// ─── Status filter ────────────────────────────────────────────────────────────

interface SmsStatusFilterProps {
  selected: Set<string>;
  onChange: (values: Set<string>) => void;
}

function SmsStatusFilter({ selected, onChange }: SmsStatusFilterProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(
    (value: string) => {
      const next = new Set(selected);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      onChange(next);
    },
    [selected, onChange],
  );

  const clear = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onChange(new Set());
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 shrink-0 border-dashed p-0 font-normal sm:h-8 sm:w-auto sm:min-w-0 sm:px-3 sm:py-0"
          aria-label="Status"
        >
          {selected.size > 0 ? (
            <div
              role="button"
              aria-label="Clear Status filter"
              tabIndex={0}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={clear}
            >
              <X className="size-4" />
            </div>
          ) : (
            <span className="text-muted-foreground text-xs font-medium px-0.5">+</span>
          )}
          <span className="hidden sm:inline">Status</span>
          {selected.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 hidden data-[orientation=vertical]:h-4 sm:block"
              />
              <div className="hidden items-center gap-1 lg:flex">
                {selected.size > 1 ? (
                  <Badge variant="secondary" size="sm" className="rounded-sm font-normal">
                    {selected.size} selected
                  </Badge>
                ) : (
                  STATUS_OPTIONS.filter((o) => selected.has(o.value)).map((o) => (
                    <Badge key={o.value} variant="secondary" size="sm" className="rounded-sm font-normal">
                      {o.label}
                    </Badge>
                  ))
                )}
              </div>
              <Badge
                variant="secondary"
                size="sm"
                className="hidden rounded-sm font-normal sm:inline-flex lg:hidden"
              >
                {selected.size}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {STATUS_OPTIONS.map((option) => {
                const isSelected = selected.has(option.value);
                return (
                  <CommandItem key={option.value} onSelect={() => toggle(option.value)}>
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border border-primary',
                        isSelected ? 'bg-primary' : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <Check />
                    </div>
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => clear()} className="justify-center text-center">
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
            <CommandEmpty>No options.</CommandEmpty>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── View options ─────────────────────────────────────────────────────────────

interface SmsViewOptionsProps {
  hiddenCols: HiddenCols;
  onChange: (hiddenCols: HiddenCols) => void;
}

function SmsViewOptions({ hiddenCols, onChange }: SmsViewOptionsProps) {
  const toggle = useCallback(
    (id: ToggleableColumnId) => {
      const next = new Set(hiddenCols);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(next);
    },
    [hiddenCols, onChange],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Toggle columns"
          role="combobox"
          variant="outline"
          size="sm"
          className="h-8 w-8 shrink-0 p-0 font-normal sm:h-8 sm:w-auto sm:min-w-0 sm:px-3 sm:py-0"
        >
          <Columns3 className="size-4 text-muted-foreground" aria-hidden />
          <span className="hidden sm:ml-1 sm:inline">View</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" align="end">
        <Command>
          <CommandList>
            <CommandGroup>
              {TOGGLEABLE_COLUMNS.map((col) => {
                const isVisible = !hiddenCols.has(col.id);
                return (
                  <CommandItem key={col.id} onSelect={() => toggle(col.id)}>
                    <span className="truncate">{col.label}</span>
                    <Check
                      className={cn(
                        'ml-auto size-4 shrink-0',
                        isVisible ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Status badge (same component + tokens as My Licenses: active / cancel) ───

function PaymentStatusBadge({ responseCode }: { responseCode?: string }) {
  const approved = responseCode === '1';
  return (
    <LicenseStatusBadge
      status={approved ? 'active' : 'cancel'}
      label={approved ? 'Approved' : 'Declined'}
      variant="table"
      showIcon
    />
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 40];

interface SmsTablePaginationProps {
  pagination: SmsPaymentsMeta;
  isLoading: boolean;
  startDate?: string;
  endDate?: string;
  onQueryChange: (params: SmsPaymentHistoryQueryParams) => void;
}

function SmsTablePagination({
  pagination,
  isLoading,
  startDate,
  endDate,
  onQueryChange,
}: SmsTablePaginationProps) {
  const { page, limit, total, totalPages, hasNext, hasPrev } = pagination;
  const pageStart = total > 0 ? (page - 1) * limit + 1 : 0;
  const pageEnd = Math.min(page * limit, total);

  const nav = (toPage: number) => onQueryChange({ page: toPage, limit, startDate, endDate });

  return (
    <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
      <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
        Showing {pageStart} to {pageEnd} of {total} entries
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap font-medium text-sm">Rows per page</p>
          <Select
            value={`${limit}`}
            onValueChange={(value) =>
              onQueryChange({ page: 1, limit: Number(value), startDate, endDate })
            }
            disabled={isLoading}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue placeholder={limit} />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={`${opt}`}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center font-medium text-sm">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => nav(1)}
            disabled={!hasPrev || isLoading}
          >
            <ChevronsLeft />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => nav(page - 1)}
            disabled={!hasPrev || isLoading}
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => nav(page + 1)}
            disabled={!hasNext || isLoading}
          >
            <ChevronRight />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => nav(totalPages)}
            disabled={!hasNext || isLoading}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SmsPaymentHistorySection({
  payments,
  pagination,
  isLoading = false,
  fetchError = null,
  emptyStateDetail = null,
  onQueryChange,
  className,
}: SmsPaymentHistorySectionProps) {
  // Date range local state — needed so the filter button shows the label and
  // pagination carries the active dates forward.
  const [activeDateRange, setActiveDateRange] = useState<{ from?: Date; to?: Date } | null>(null);

  // Status filter — client-side, applied to the current page's rows.
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  // Column visibility — tracks hidden toggleable columns.
  const [hiddenCols, setHiddenCols] = useState<HiddenCols>(new Set());

  const activeDates = useMemo(
    () => ({
      startDate: activeDateRange?.from ? toApiDateString(activeDateRange.from) : undefined,
      endDate: activeDateRange?.to ? toApiDateString(activeDateRange.to) : undefined,
    }),
    [activeDateRange],
  );

  const hasActiveFilters = activeDateRange !== null || statusFilter.size > 0;

  // Apply client-side status filter to the current page's payments
  const visiblePayments = useMemo(() => {
    if (statusFilter.size === 0) return payments;
    return payments.filter((p) => {
      const code = p.joption?.transactionResponse?.responseCode;
      const isApproved = code === '1';
      if (statusFilter.has('approved') && statusFilter.has('declined')) return true;
      if (statusFilter.has('approved')) return isApproved;
      if (statusFilter.has('declined')) return !isApproved;
      return true;
    });
  }, [payments, statusFilter]);

  const handleDateRangeChange = useCallback(
    (range: { from?: Date; to?: Date } | null) => {
      setActiveDateRange(range ?? null);
      onQueryChange({
        page: 1,
        startDate: range?.from ? toApiDateString(range.from) : undefined,
        endDate: range?.to ? toApiDateString(range.to) : undefined,
      });
    },
    [onQueryChange],
  );

  const handleReset = useCallback(() => {
    setActiveDateRange(null);
    setStatusFilter(new Set());
    onQueryChange({ page: 1 });
  }, [onQueryChange]);

  const showSkeleton = isLoading && payments.length === 0;
  const showEmpty = !isLoading && visiblePayments.length === 0;

  const colHide = (id: ToggleableColumnId) => hiddenCols.has(id);

  // Pixel col widths + min table width (like DataTable stretch): scroll horizontally instead of crushing columns.
  const { smsColWidthsPx, smsTableMinWidth } = useMemo(() => {
    const widths: number[] = [200, 100];
    if (!hiddenCols.has('txnId')) widths.push(220);
    if (!hiddenCols.has('authCode')) widths.push(120);
    if (!hiddenCols.has('card')) widths.push(200);
    widths.push(130);
    return {
      smsColWidthsPx: widths,
      smsTableMinWidth: widths.reduce((a, b) => a + b, 0),
    };
  }, [hiddenCols]);

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl shadow-sm space-y-3 px-6 pb-6',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <Typography variant="title-l" className="text-foreground">
            SMS Payment History
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground mt-0.5">
            {pagination
              ? `${pagination.total} payment${pagination.total !== 1 ? 's' : ''} total`
              : 'SMS payment transactions'}
          </Typography>
        </div>
      </div>

      {fetchError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {fetchError}
        </div>
      ) : null}

      {/* Toolbar */}
      <div
        role="toolbar"
        aria-orientation="horizontal"
        className="flex w-full flex-wrap items-center gap-2 min-h-8"
      >
        {/* Left: date + status filter + reset */}
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <DataTableDateRangeFilter
            value={activeDateRange}
            onDateRangeChange={handleDateRangeChange}
            title="Date Range"
            align="start"
          />
          <SmsStatusFilter selected={statusFilter} onChange={setStatusFilter} />
          {hasActiveFilters && (
            <Button
              aria-label="Reset filters"
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0 border-dashed p-0 sm:h-8 sm:w-auto sm:min-w-0 sm:px-3 sm:py-0"
              onClick={handleReset}
            >
              <X className="size-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>

        {/* Right: view options */}
        <div className="flex items-center gap-2 shrink-0">
          <SmsViewOptions hiddenCols={hiddenCols} onChange={setHiddenCols} />
        </div>
      </div>

      {/* Table — empty state is a standalone bordered block (same pattern as My Licenses DataTable) so row hover styles never apply */}
      {showEmpty && !showSkeleton ? (
        <div
          className={`p-12 text-center flex flex-col items-center justify-center ${SMS_PAYMENT_TABLE_VIEWPORT_CLASS}`}
        >
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <Typography variant="title-s" className="text-foreground mb-2">
            No SMS payments found
          </Typography>
          {hasActiveFilters ? (
            <>
              <Typography variant="body-s" color="muted" className="text-muted-foreground mb-4">
                No payment records match the active filters. Try adjusting your filters.
              </Typography>
              <Button variant="default" size="sm" onClick={handleReset}>
                Clear filters
              </Button>
            </>
          ) : emptyStateDetail ? (
            <Typography variant="body-s" color="muted" className="text-muted-foreground max-w-md mx-auto">
              {emptyStateDetail}
            </Typography>
          ) : (
            <Typography variant="body-s" color="muted" className="text-muted-foreground">
              No payment records are available at this time.
            </Typography>
          )}
        </div>
      ) : (
        <div className={SMS_PAYMENT_TABLE_VIEWPORT_CLASS}>
          <table
            className="caption-bottom text-sm table-fixed w-full"
            style={{
              tableLayout: 'fixed',
              width: '100%',
              minWidth: smsTableMinWidth,
            }}
          >
            <colgroup>
              {smsColWidthsPx.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {!colHide('txnId') && (
                  <TableHead className="hidden md:table-cell">Transaction ID</TableHead>
                )}
                {!colHide('authCode') && (
                  <TableHead className="hidden lg:table-cell">Auth Code</TableHead>
                )}
                {!colHide('card') && (
                  <TableHead className="hidden sm:table-cell">Card</TableHead>
                )}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {Array.from({ length: smsColWidthsPx.length }).map((__, j) => (
                      <TableCell key={j}>
                        <div
                          className="h-4 rounded bg-muted animate-pulse"
                          style={{ width: `${55 + (j % 3) * 20}%` }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!showSkeleton &&
                visiblePayments.map((payment) => {
                  const txn = payment.joption?.transactionResponse;
                  return (
                    <TableRow key={payment.id} className="even:bg-muted/20">
                      <TableCell className="whitespace-nowrap">
                        {formatDisplayDate(payment.date)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {currencyFmt.format(payment.amount)}
                      </TableCell>
                      {!colHide('txnId') && (
                        <TableCell className="text-muted-foreground font-mono text-xs hidden md:table-cell truncate max-w-[160px]">
                          {txn?.transId ?? '—'}
                        </TableCell>
                      )}
                      {!colHide('authCode') && (
                        <TableCell className="text-muted-foreground font-mono text-xs hidden lg:table-cell">
                          {txn?.authCode ?? '—'}
                        </TableCell>
                      )}
                      {!colHide('card') && (
                        <TableCell className="text-muted-foreground text-xs hidden sm:table-cell whitespace-nowrap">
                          {txn?.accountType && txn?.accountNumber
                            ? `${txn.accountType} ${txn.accountNumber}`
                            : '—'}
                        </TableCell>
                      )}
                      <TableCell>
                        <PaymentStatusBadge responseCode={txn?.responseCode} />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <SmsTablePagination
          pagination={pagination}
          isLoading={isLoading}
          startDate={activeDates.startDate}
          endDate={activeDates.endDate}
          onQueryChange={onQueryChange}
        />
      )}
    </div>
  );
}
