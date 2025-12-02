'use client';

import { useState, useMemo } from 'react';
import { Typography, Button } from '@/presentation/components/atoms';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/atoms/ui/table';
import { UserTableRow } from './user-table-row';
import { Users, UserPlus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, List } from 'lucide-react';
import type { User } from '@/domain/entities/user-entity';

type SortField = 'name' | 'role' | 'isActive';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface UserTableProps {
  users: User[];
  currentUser: User;
  canEdit: (user: User) => boolean;
  canDelete: (user: User) => boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onCreateFirst?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function UserTable({
  users,
  currentUser,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onCreateFirst,
  isLoading = false,
  className,
}: UserTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting logic
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const { field, direction } = sortConfig;
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'name':
          aValue = a.displayName || a.name || a.email;
          bValue = b.displayName || b.name || b.email;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'isActive':
          aValue = a.isActive;
          bValue = b.isActive;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

  // Handle sort
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Generate pagination buttons with ellipsis for large page counts
  const getPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      // Show pages with ellipsis
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);

      // Always show first page
      if (startPage > 1) {
        buttons.push(1);
        if (startPage > 2) {
          buttons.push('...');
        }
      }

      // Show current page range
      for (let i = startPage; i <= endPage; i++) {
        buttons.push(i);
      }

      // Always show last page
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          buttons.push('...');
        }
        buttons.push(totalPages);
      }
    }

    return buttons;
  };
  if (isLoading) {
    return (
      <div className={`p-12 text-center border-t border-border ${className || ''}`}>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <Typography variant="title-s" className="text-foreground mb-2">
          Loading users...
        </Typography>
        <Typography variant="body-s" color="muted" className="text-muted-foreground">
          Fetching user data from API
        </Typography>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className={`p-12 mt-12 text-center border-t border-border ${className || ''}`}>
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <Typography variant="title-s" className="text-foreground mb-2">
          No users found
        </Typography>
        <Typography variant="body-s" color="muted" className="text-muted-foreground mb-4">
          Try adjusting your search or filters to find users
        </Typography>
        {onCreateFirst && currentUser.role === 'admin' && (
          <Button onClick={onCreateFirst} variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            <span className='mb-0.5 text-xs'>Create First User</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-56">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Typography variant="label-s" className="text-muted-foreground uppercase tracking-wider">
                  User
                </Typography>
                {sortConfig.field === 'name' ? (
                  sortConfig.direction === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead className="w-72">
              <Typography variant="label-s" className="text-muted-foreground uppercase tracking-wider">
                Email
              </Typography>
            </TableHead>
            <TableHead className="w-32">
              <Typography variant="label-s" className="text-muted-foreground uppercase tracking-wider">
                Phone
              </Typography>
            </TableHead>
            <TableHead className="w-28">
              <button
                onClick={() => handleSort('role')}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Typography variant="label-s" className="text-muted-foreground uppercase tracking-wider">
                  Role
                </Typography>
                {sortConfig.field === 'role' ? (
                  sortConfig.direction === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead className="w-28">
              <button
                onClick={() => handleSort('isActive')}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Typography variant="label-s" className="text-muted-foreground uppercase tracking-wider">
                  Status
                </Typography>
                {sortConfig.field === 'isActive' ? (
                  sortConfig.direction === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead className="w-36 text-right">
              <Typography variant="label-s" className="text-muted-foreground uppercase tracking-wider">
                Actions
              </Typography>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedUsers.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              currentUser={currentUser}
              canEdit={canEdit(user)}
              canDelete={canDelete(user)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {users.length > 0 && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <List className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, sortedUsers.length)} of {sortedUsers.length.toLocaleString()} users
              </span>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {getPaginationButtons().map((page, index) => (
                  typeof page === 'number' ? (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ) : (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  )
                ))}
              </div>

              <Button
                variant="outline"
                size="xs"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}