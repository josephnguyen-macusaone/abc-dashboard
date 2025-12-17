/**
 * Unified Data Display Types
 *
 * Provides consistent type definitions for DataTable and DataGrid components
 * to enable unified API and easier component switching.
 */

import type { ColumnDef } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// Core Display Configuration
// ============================================================================

/**
 * Display mode determines which component to use
 * - 'table': Server-paginated table with filtering (DataTable)
 * - 'grid': Excel-like editable grid (DataGrid)
 * - 'auto': Automatically choose based on data size and features
 */
export type DisplayMode = 'table' | 'grid' | 'auto';

/**
 * Main configuration interface for data display components
 */
export interface DataDisplayConfig<TData = unknown> {
  // Display settings
  mode: DisplayMode;
  height?: number; // For grid mode

  // Core data
  data: TData[];
  columns: ColumnDef<TData>[];

  // Search configuration
  search?: SearchConfig;

  // Filter configuration
  filters?: FilterConfig[];

  // Pagination configuration
  pagination: PaginationConfig;

  // Sorting configuration
  sorting?: SortingConfig;

  // Actions configuration
  actions?: ActionsConfig<TData>;

  // State persistence
  persistence?: PersistenceConfig;

  // Performance & optimization
  optimization?: OptimizationConfig;
}

// ============================================================================
// Search Configuration
// ============================================================================

export interface SearchConfig {
  /** Enable search functionality */
  enabled: boolean;

  /** Search mode */
  mode: 'single' | 'multi-field' | 'advanced';

  /** Fields to search across (for multi-field mode) */
  fields?: SearchField[];

  /** Default search field (for single mode) */
  defaultField?: string;

  /** Placeholder text */
  placeholder?: string;

  /** Enable fuzzy matching */
  fuzzySearch?: boolean;

  /** Debounce delay in milliseconds */
  debounceMs?: number;

  /** Callback when search changes */
  onSearchChange?: (query: string, field?: string) => void;
}

export interface SearchField {
  /** Field identifier */
  key: string;

  /** Display label */
  label: string;

  /** Field type for input validation */
  type: 'text' | 'email' | 'phone' | 'number';

  /** Optional placeholder */
  placeholder?: string;

  /** Icon for the field */
  icon?: LucideIcon;
}

// ============================================================================
// Filter Configuration
// ============================================================================

export interface FilterConfig {
  /** Unique filter identifier */
  id: string;

  /** Display label */
  label: string;

  /** Filter type */
  type: FilterType;

  /** Options for select/multi-select filters */
  options?: FilterOption[];

  /** Whether this filter uses server-side filtering */
  serverSide?: boolean;

  /** Default value */
  defaultValue?: FilterValue;

  /** Whether the filter is required */
  required?: boolean;

  /** Help text or description */
  description?: string;

  /** Icon for the filter */
  icon?: LucideIcon;

  /** Custom render function */
  render?: (props: FilterRenderProps) => React.ReactNode;
}

export type FilterType =
  | 'text'
  | 'select'
  | 'multi-select'
  | 'date'
  | 'date-range'
  | 'number'
  | 'number-range'
  | 'boolean'
  | 'custom';

export interface FilterOption {
  /** Option value */
  value: string | number | boolean;

  /** Display label */
  label: string;

  /** Optional icon */
  icon?: LucideIcon;

  /** Optional description */
  description?: string;

  /** Whether this option is disabled */
  disabled?: boolean;
}

export type FilterValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | DateRange
  | NumberRange
  | null
  | undefined;

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface NumberRange {
  min?: number;
  max?: number;
}

export interface FilterRenderProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  config: FilterConfig;
}

// ============================================================================
// Pagination Configuration
// ============================================================================

export interface PaginationConfig {
  /** Enable pagination */
  enabled: boolean;

  /** Pagination mode */
  mode: 'client' | 'server';

  /** Current page (1-based) */
  page?: number;

  /** Items per page */
  pageSize?: number;

  /** Available page size options */
  pageSizeOptions?: number[];

  /** Total number of items (for server mode) */
  totalCount?: number;

  /** Total number of pages (for server mode) */
  pageCount?: number;

  /** Callback when pagination changes */
  onPaginationChange?: (page: number, pageSize: number) => void;
}

// ============================================================================
// Sorting Configuration
// ============================================================================

export interface SortingConfig {
  /** Enable sorting */
  enabled: boolean;

  /** Sorting mode */
  mode: 'client' | 'server';

  /** Default sort column */
  defaultColumn?: string;

  /** Default sort order */
  defaultOrder?: 'asc' | 'desc';

  /** Allow multi-column sorting */
  multiSort?: boolean;

  /** Callback when sorting changes */
  onSortingChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

// ============================================================================
// Actions Configuration
// ============================================================================

export interface ActionsConfig<TData = unknown> {
  /** Create/add action */
  create?: ActionConfig<TData>;

  /** Edit action */
  edit?: ActionConfig<TData>;

  /** Delete action */
  delete?: ActionConfig<TData>;

  /** Bulk operations */
  bulk?: BulkActionConfig<TData>[];

  /** Export functionality */
  export?: ExportConfig;

  /** Row-level actions (for each row) */
  rowActions?: RowActionConfig<TData>[];

  /** Custom actions */
  custom?: CustomActionConfig<TData>[];
}

export interface ActionConfig<TData = unknown> {
  /** Action identifier */
  id: string;

  /** Display label */
  label: string;

  /** Icon */
  icon?: LucideIcon;

  /** Action handler */
  action: () => void | Promise<void>;

  /** Whether the action is disabled */
  disabled?: boolean;

  /** Variant for styling */
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';

  /** Show confirmation dialog */
  confirmMessage?: string;
}

export interface BulkActionConfig<TData = unknown> {
  /** Action identifier */
  id: string;

  /** Display label */
  label: string;

  /** Icon */
  icon?: LucideIcon;

  /** Action handler - receives selected rows */
  action: (rows: TData[]) => void | Promise<void>;

  /** Whether the action is disabled */
  disabled?: boolean;

  /** Variant for styling */
  variant?: 'default' | 'destructive' | 'outline';

  /** Show confirmation dialog */
  confirmMessage?: string;

  /** Minimum number of selected rows required */
  minSelections?: number;

  /** Maximum number of selected rows allowed */
  maxSelections?: number;
}

export interface RowActionConfig<TData = unknown> {
  /** Action identifier */
  id: string;

  /** Display label */
  label: string;

  /** Icon */
  icon?: LucideIcon;

  /** Action handler - receives the row data */
  action: (row: TData) => void | Promise<void>;

  /** Whether the action is visible for this row */
  visible?: (row: TData) => boolean;

  /** Whether the action is disabled for this row */
  disabled?: (row: TData) => boolean;

  /** Variant for styling */
  variant?: 'default' | 'destructive';

  /** Show confirmation dialog */
  confirmMessage?: string | ((row: TData) => string);
}

export interface CustomActionConfig<TData = unknown> {
  /** Action identifier */
  id: string;

  /** Custom render function */
  render: (props: CustomActionRenderProps<TData>) => React.ReactNode;

  /** Position in the toolbar */
  position?: 'left' | 'right';
}

export interface CustomActionRenderProps<TData = unknown> {
  data: TData[];
  selectedRows: TData[];
  table: any; // TanStack Table instance
}

export interface ExportConfig {
  /** Enabled export formats */
  formats: ExportFormat[];

  /** Include current filters in export */
  includeFilters: boolean;

  /** Default filename (without extension) */
  filename?: string;

  /** Custom export handler */
  onExport?: (format: ExportFormat, data: unknown[]) => void | Promise<void>;
}

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

// ============================================================================
// State Persistence Configuration
// ============================================================================

export interface PersistenceConfig {
  /** Enable URL state persistence */
  url?: boolean;

  /** Enable localStorage persistence */
  localStorage?: boolean;

  /** LocalStorage key */
  storageKey?: string;

  /** What state to persist */
  persistState?: PersistableState[];

  /** History mode for URL updates */
  historyMode?: 'push' | 'replace';
}

export type PersistableState =
  | 'pagination'
  | 'sorting'
  | 'filters'
  | 'search'
  | 'columnVisibility'
  | 'columnOrder';

// ============================================================================
// Optimization Configuration
// ============================================================================

export interface OptimizationConfig {
  /** Enable virtual scrolling */
  virtualScrolling?: boolean;

  /** Debounce delay for filters (ms) */
  debounceMs?: number;

  /** Throttle delay for scroll (ms) */
  throttleMs?: number;

  /** Enable memoization */
  memoize?: boolean;

  /** Row height for virtualization */
  rowHeight?: 'short' | 'medium' | 'tall' | number;
}

// ============================================================================
// Query Parameters (for server-side operations)
// ============================================================================

export interface QueryParams {
  /** Current page (1-based) */
  page: number;

  /** Items per page */
  limit: number;

  /** Sort column */
  sortBy?: string;

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Search query */
  search?: string;

  /** Active filters */
  filters?: Record<string, FilterValue>;

  /** Additional custom parameters */
  [key: string]: unknown;
}

// ============================================================================
// Saved Filter Presets
// ============================================================================

export interface FilterPreset {
  /** Preset identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description?: string;

  /** Icon */
  icon?: LucideIcon;

  /** Preset filters */
  filters: Record<string, FilterValue>;

  /** Whether this is a system preset (not user-created) */
  system?: boolean;

  /** Whether this preset is shared with other users */
  shared?: boolean;

  /** Created by user ID */
  createdBy?: string;

  /** Created timestamp */
  createdAt?: Date;
}

// ============================================================================
// Component State
// ============================================================================

export interface DataDisplayState {
  /** Current search query */
  search: {
    query: string;
    field?: string;
  };

  /** Active filters */
  filters: Record<string, FilterValue>;

  /** Pagination state */
  pagination: {
    page: number;
    pageSize: number;
  };

  /** Sorting state */
  sorting: {
    column: string;
    order: 'asc' | 'desc';
  }[];

  /** Selected rows */
  selectedRows: unknown[];

  /** Column visibility */
  columnVisibility: Record<string, boolean>;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;
}

// ============================================================================
// Component Callbacks
// ============================================================================

export interface DataDisplayCallbacks<TData = unknown> {
  /** Called when query parameters change (for server-side) */
  onQueryChange?: (params: QueryParams) => void;

  /** Called when data changes (for grid mode editing) */
  onDataChange?: (data: TData[]) => void;

  /** Called when row is added */
  onRowAdd?: () => TData | Promise<TData>;

  /** Called when rows are deleted */
  onRowsDelete?: (rows: TData[], indices: number[]) => void | Promise<void>;

  /** Called when data needs to be saved */
  onSave?: (data: TData[]) => void | Promise<void>;

  /** Called when filters change */
  onFiltersChange?: (filters: Record<string, FilterValue>) => void;

  /** Called when search changes */
  onSearchChange?: (query: string, field?: string) => void;

  /** Called when selection changes */
  onSelectionChange?: (selectedRows: TData[]) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper type to infer data type from columns
 */
export type InferDataType<T extends ColumnDef<any>[]> =
  T extends ColumnDef<infer D>[] ? D : never;

/**
 * Helper type for partial configuration (for defaults)
 */
export type PartialDataDisplayConfig<TData = unknown> =
  Partial<DataDisplayConfig<TData>> & {
    data: TData[];
    columns: ColumnDef<TData>[];
  };


