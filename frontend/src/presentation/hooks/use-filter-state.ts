import * as React from 'react';
import type { FilterValue, DateRange, NumberRange } from '@/shared/types/data-display';

// ============================================================================
// Types
// ============================================================================

export interface FilterStateOptions {
  /** Enable URL state persistence */
  persistToUrl?: boolean;

  /** Enable localStorage persistence */
  persistToLocalStorage?: boolean;

  /** LocalStorage key */
  storageKey?: string;

  /** Default filter values */
  defaultFilters?: Record<string, FilterValue>;

  /** Debounce delay for URL updates (ms) */
  debounceMs?: number;
}

export interface UseFilterStateReturn {
  /** Current filter values */
  filters: Record<string, FilterValue>;

  /** Update a single filter */
  updateFilter: (key: string, value: FilterValue) => void;

  /** Update multiple filters at once */
  setFilters: (filters: Record<string, FilterValue>) => void;

  /** Reset all filters to defaults */
  resetFilters: () => void;

  /** Check if any filters are active */
  hasActiveFilters: boolean;

  /** Get active filter count */
  activeFilterCount: number;
}

// ============================================================================
// Local Storage Helper
// ============================================================================

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = React.useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}

// ============================================================================
// Filter State Hook
// ============================================================================

export function useFilterState(options: FilterStateOptions = {}): UseFilterStateReturn {
  const {
    persistToUrl = false, // Disabled by default to avoid conflicts with existing useDataTable
    persistToLocalStorage = true,
    storageKey = 'data-filters',
    defaultFilters = {},
    debounceMs = 300,
  } = options;

  // State management based on persistence mode
  const [localStorageFilters, setLocalStorageFilters] = useLocalStorage<
    Record<string, FilterValue>
  >(storageKey, defaultFilters);

  const [inMemoryFilters, setInMemoryFilters] = React.useState<Record<string, FilterValue>>(
    defaultFilters
  );

  // Choose storage based on options
  const [filters, setFiltersInternal] = persistToLocalStorage
    ? [localStorageFilters, setLocalStorageFilters]
    : [inMemoryFilters, setInMemoryFilters];

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Debounced setter
  const setFilters = React.useCallback(
    (newFilters: Record<string, FilterValue> | ((prev: Record<string, FilterValue>) => Record<string, FilterValue>)) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const filtersToSet =
        typeof newFilters === 'function' ? newFilters(filters) : newFilters;

      // Immediate state update for UI responsiveness
      setFiltersInternal(filtersToSet);

      // Debounce URL updates if enabled
      if (persistToUrl) {
        debounceTimerRef.current = setTimeout(() => {
          // URL update logic would go here
          // (Disabled by default to avoid conflicts with existing useDataTable)
        }, debounceMs);
      }
    },
    [filters, setFiltersInternal, persistToUrl, debounceMs]
  );

  // Update a single filter
  const updateFilter = React.useCallback(
    (key: string, value: FilterValue) => {
      setFilters((prev) => {
        // Remove filter if value is empty/null/undefined
        if (value === null || value === undefined || value === '') {
          const newFilters = { ...prev };
          delete newFilters[key];
          return newFilters;
        }

        // Remove filter if array is empty
        if (Array.isArray(value) && value.length === 0) {
          const newFilters = { ...prev };
          delete newFilters[key];
          return newFilters;
        }

        // Remove filter if date range is empty
        if (
          typeof value === 'object' &&
          'from' in value &&
          'to' in value &&
          !value.from &&
          !value.to
        ) {
          const newFilters = { ...prev };
          delete newFilters[key];
          return newFilters;
        }

        // Remove filter if number range is empty
        if (
          typeof value === 'object' &&
          'min' in value &&
          'max' in value &&
          value.min === undefined &&
          value.max === undefined
        ) {
          const newFilters = { ...prev };
          delete newFilters[key];
          return newFilters;
        }

        return { ...prev, [key]: value };
      });
    },
    [setFilters]
  );

  // Reset filters
  const resetFilters = React.useCallback(() => {
    setFilters(defaultFilters);
  }, [setFilters, defaultFilters]);

  // Calculate active filters
  const hasActiveFilters = React.useMemo(() => {
    return Object.keys(filters).some((key) => {
      const value = filters[key];
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && 'from' in value && 'to' in value) {
        return value.from !== undefined || value.to !== undefined;
      }
      if (typeof value === 'object' && 'min' in value && 'max' in value) {
        return value.min !== undefined || value.max !== undefined;
      }
      return true;
    });
  }, [filters]);

  const activeFilterCount = React.useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && 'from' in value && 'to' in value) {
        return value.from !== undefined || value.to !== undefined;
      }
      if (typeof value === 'object' && 'min' in value && 'max' in value) {
        return value.min !== undefined || value.max !== undefined;
      }
      return true;
    }).length;
  }, [filters]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    filters,
    updateFilter,
    setFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
