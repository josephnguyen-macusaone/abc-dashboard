import React, { createContext, useContext, ReactNode, TableHTMLAttributes } from 'react';
import { cn } from '@/shared/utils';
import { Loading } from '@/presentation/components/atoms/display';

// Context for compound component state
interface DataTableContextType {
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
}

const DataTableContext = createContext<DataTableContextType | null>(null);

interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
}

/**
 * Root DataTable component - compound component pattern
 * Provides context for loading states and error handling
 */
export function DataTable({
  children,
  isLoading = false,
  error = null,
  emptyMessage = "No data available",
  className,
  ...props
}: DataTableProps) {
  return (
    <DataTableContext.Provider value={{ isLoading, error, emptyMessage, className }}>
      <div className={cn("relative w-full overflow-auto", className)}>
        {error ? (
          <DataTableError message={error} />
        ) : (
          <table
            className={cn("w-full caption-bottom text-sm", className)}
            {...props}
          >
            {children}
          </table>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Loading />
          </div>
        )}
      </div>
    </DataTableContext.Provider>
  );
}

/**
 * DataTable Header component
 */
interface DataTableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function DataTableHeader({ children, className }: DataTableHeaderProps) {
  return (
    <thead className={cn("[&_tr]:border-b", className)}>
      {children}
    </thead>
  );
}

/**
 * DataTable Body component
 */
interface DataTableBodyProps {
  children: ReactNode;
  className?: string;
}

export function DataTableBody({ children, className }: DataTableBodyProps) {
  const context = useContext(DataTableContext);

  if (context?.isLoading) {
    return (
      <tbody className={className}>
        <tr>
          <td colSpan={999} className="h-24 text-center">
            <Loading />
          </td>
        </tr>
      </tbody>
    );
  }

  if (!React.Children.count(children)) {
    return (
      <tbody className={className}>
        <tr>
          <td colSpan={999} className="h-24 text-center text-muted-foreground">
            {context?.emptyMessage || "No data available"}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)}>
      {children}
    </tbody>
  );
}

/**
 * DataTable Footer component
 */
interface DataTableFooterProps {
  children: ReactNode;
  className?: string;
}

export function DataTableFooter({ children, className }: DataTableFooterProps) {
  return (
    <tfoot className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}>
      {children}
    </tfoot>
  );
}

/**
 * DataTable Row component
 */
interface DataTableRowProps {
  children: ReactNode;
  className?: string;
}

export function DataTableRow({ children, className }: DataTableRowProps) {
  return (
    <tr className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}>
      {children}
    </tr>
  );
}

/**
 * DataTable Head component
 */
interface DataTableHeadProps {
  children: ReactNode;
  className?: string;
}

export function DataTableHead({ children, className }: DataTableHeadProps) {
  return (
    <th className={cn("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className)}>
      {children}
    </th>
  );
}

/**
 * DataTable Cell component
 */
interface DataTableCellProps {
  children: ReactNode;
  className?: string;
}

export function DataTableCell({ children, className }: DataTableCellProps) {
  return (
    <td className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}>
      {children}
    </td>
  );
}

/**
 * DataTable Caption component
 */
interface DataTableCaptionProps {
  children: ReactNode;
  className?: string;
}

export function DataTableCaption({ children, className }: DataTableCaptionProps) {
  return (
    <caption className={cn("mt-4 text-sm text-muted-foreground", className)}>
      {children}
    </caption>
  );
}

/**
 * DataTable Error component
 */
interface DataTableErrorProps {
  message: string;
  className?: string;
}

export function DataTableError({ message, className }: DataTableErrorProps) {
  return (
    <div className={cn("flex h-24 items-center justify-center text-center text-muted-foreground", className)}>
      <div>
        <p className="text-sm font-medium text-destructive">Error loading data</p>
        <p className="text-xs text-muted-foreground mt-1">{message}</p>
      </div>
    </div>
  );
}

// Export all components
DataTable.Header = DataTableHeader;
DataTable.Body = DataTableBody;
DataTable.Footer = DataTableFooter;
DataTable.Row = DataTableRow;
DataTable.Head = DataTableHead;
DataTable.Cell = DataTableCell;
DataTable.Caption = DataTableCaption;
DataTable.Error = DataTableError;

// Hook to access DataTable context
export function useDataTable() {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error('useDataTable must be used within a DataTable component');
  }
  return context;
}