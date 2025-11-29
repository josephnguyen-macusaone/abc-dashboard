'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserManagementService } from '@/presentation/hooks/use-user-management-service';
import { User, UserListParams } from '@/application/dto/user-dto';
import { USER_ROLE_LABELS } from '@/shared/constants';
import { CanManageUsers, CanUpdateUsers, CanDeleteUsers } from '@/presentation/components/atoms/permission-guard';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms/ui/select';
import { Badge } from '@/presentation/components/atoms/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/atoms/ui/avatar';
import { Pagination } from '@/presentation/components/molecules/common/pagination';
import { SearchBar } from '@/presentation/components/molecules/common/search-bar';
import { Skeleton } from '@/presentation/components/atoms/ui/skeleton';
import { Alert, AlertDescription } from '@/presentation/components/atoms/ui/alert';
import { Typography } from '@/presentation/components/atoms';

import { Users, UserPlus, Edit, Trash2 } from 'lucide-react';

interface UsersListProps {
  onCreateUser?: () => void;
  onEditUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
  refreshTrigger?: number;
}

export function UsersList({
  onCreateUser,
  onEditUser,
  onDeleteUser,
  refreshTrigger
}: UsersListProps) {
  const userManagementService = useUserManagementService();

  // State for users data
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(10);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load users function
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: UserListParams = {
        page: currentPage,
        limit: pageSize,
      };

      // Add search term as email filter for now
      if (searchTerm.trim()) {
        params.email = searchTerm.trim();
      }

      // Add role filter
      if (roleFilter !== 'all') {
        // Note: This would need backend support for role filtering
        // For now, we'll filter client-side
      }

      const result = await userManagementService.getUsers(params);

      // Client-side filtering for role and status
      let filteredUsers = result.users;

      if (roleFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
      }

      if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
      }

      setUsers(filteredUsers);
      setTotalUsers(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, roleFilter, statusFilter, userManagementService]);

  // Load users when dependencies change
  useEffect(() => {
    loadUsers();
  }, [loadUsers, refreshTrigger]);

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  // Get user initials for avatar
  const getUserInitials = (user: User) => {
    return (user.displayName || user.name || user.email || 'U')
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users
                </CardTitle>
                <CardDescription>Loading users...</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-[100px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage system users, roles, and permissions
              </CardDescription>
            </div>
            <CanManageUsers>
              <Button onClick={onCreateUser} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </CanManageUsers>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardContent className="pt-6">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {/* MAC USA ONE Typography: Body M for empty state */}
              <Typography variant="body-m" color="muted">
                No users found matching your criteria.
              </Typography>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="border-b">
                    {/* MAC USA ONE Typography: Label S for table headers */}
                    <th className="text-left px-4 py-3">
                      <Typography variant="label-s" as="span">User</Typography>
                    </th>
                    <th className="text-left px-4 py-3">
                      <Typography variant="label-s" as="span">Role</Typography>
                    </th>
                    <th className="text-left px-4 py-3">
                      <Typography variant="label-s" as="span">Status</Typography>
                    </th>
                    <th className="text-left px-4 py-3">
                      <Typography variant="label-s" as="span">Created</Typography>
                    </th>
                    <th className="text-left px-4 py-3">
                      <Typography variant="label-s" as="span">Actions</Typography>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.displayName} />
                            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                          </Avatar>
                          <div>
                            {/* MAC USA ONE Typography: Body M for user name */}
                            <Typography variant="body-m" className="font-medium" as="p">
                              {user.displayName}
                            </Typography>
                            {/* MAC USA ONE Typography: Body S for email */}
                            <Typography variant="body-s" color="muted" as="p">
                              {user.email}
                            </Typography>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            user.role === 'admin' ? 'destructive' :
                            user.role === 'manager' ? 'secondary' : 'default'
                          }
                        >
                          {USER_ROLE_LABELS[user.role as keyof typeof USER_ROLE_LABELS] || user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {/* MAC USA ONE Typography: Label S for status badges */}
                        <span className={`px-2 py-1 text-label-s rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {/* MAC USA ONE Typography: Body S for dates */}
                        <Typography variant="body-s" color="muted" as="span">
                          {user.createdAt ? formatDate(user.createdAt.toISOString()) : 'N/A'}
                        </Typography>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <CanUpdateUsers>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditUser?.(user)}
                              className="h-8 w-8 p-0"
                              title="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </CanUpdateUsers>
                          <CanDeleteUsers>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteUser?.(user)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CanDeleteUsers>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalUsers}
            itemsPerPage={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Results Summary */}
      <div className="text-center">
        {/* MAC USA ONE Typography: Body S for summary */}
        <Typography variant="body-s" color="muted" as="p">
          Showing {users.length} of {totalUsers} users
        </Typography>
      </div>
    </div>
  );
}
