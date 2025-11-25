// Shared Types - Common types used across the application

/**
 * Generic API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

/**
 * Generic Result type for operations that can succeed or fail
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Common status types
 */
export type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Theme types
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Form field types
 */
export interface FormFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

/**
 * Modal/Dialog types
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Toast notification types
 */
export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

/**
 * Generic filter types for data tables
 */
export interface FilterOption {
  label: string;
  value: string;
}

export interface TableFilters {
  search?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  [key: string]: any;
}
