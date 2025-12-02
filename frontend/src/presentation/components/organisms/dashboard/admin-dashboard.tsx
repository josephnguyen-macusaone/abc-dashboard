'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Search, Filter, Download, Upload, UserPlus, Activity, TrendingUp, AlertTriangle, UserCheck, UserX, Building2, UserCog } from 'lucide-react';
import { Button } from '@/presentation/components/atoms';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/atoms';
import { Input } from '@/presentation/components/atoms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms';
import { StatsCards } from '@/presentation/components/molecules/user-management';
import { AdvancedUserTable } from '@/presentation/components/organisms/user-management';
import { useUserStore } from '@/infrastructure/stores/user-store';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { UserRole } from '@/domain/entities/user-entity';

interface AdminDashboardProps {
  className?: string;
}

export function AdminDashboard({ className }: AdminDashboardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const {
    users,
    loading,
    error,
    filters,
    pagination,
    selectedUsers,
    fetchUsers,
    setFilters,
    setSelectedUsers,
  } = useUserStore();

  const [searchQuery, setSearchQuery] = useState(filters.search || '');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query });
  };

  const handleRoleFilter = (role: string) => {
    const roleValue = role === 'all' ? undefined : role as UserRole;
    setFilters({ ...filters, role: roleValue });
  };

  const handleStatusFilter = (status: string) => {
    const isActive = status === 'all' ? undefined : status === 'active';
    setFilters({ ...filters, isActive });
  };

  const handleCreateUser = () => {
    // TODO: Open create user modal or navigate to create section
    console.log('Create user clicked');
  };

  const handleEditUser = (userId: string) => {
    // TODO: Open edit user modal or navigate to edit section
    console.log('Edit user clicked:', userId);
  };

  const handleViewUser = (userId: string) => {
    // TODO: Open view user modal or navigate to view section
    console.log('View user clicked:', userId);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const { deleteUser } = useUserStore.getState();
        await deleteUser(userId);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) {
      try {
        const { deleteUser } = useUserStore.getState();
        await Promise.all(selectedUsers.map(id => deleteUser(id)));
        setSelectedUsers([]);
      } catch (error) {
        console.error('Failed to delete users:', error);
      }
    }
  };

  const availableRoles = currentUser?.role === UserRole.ADMIN
    ? [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]
    : [UserRole.MANAGER, UserRole.STAFF];

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
        </div>
        <Button onClick={handleCreateUser} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create User
        </Button>
      </div>

      {/* Stats Cards - 8 Cards in 2 rows */}
      <div className="space-y-6">
        {/* First Row - 4 Cards */}
        <StatsCards
          stats={[
            {
              id: 'total-active-users',
              label: 'Total Active Users',
              value: users.filter(u => u.isActive).length,
              icon: Users,
              color: 'text-blue-600'
            },
            {
              id: 'new-users-month',
              label: 'New Users this month',
              value: users.filter(u => {
                if (!u.createdAt) return false;
                const created = new Date(u.createdAt);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
              }).length,
              icon: UserPlus,
              color: 'text-green-600'
            },
            {
              id: 'total-sessions-month',
              label: 'Total Sessions this month',
              value: '1,234', // TODO: Replace with actual session data
              icon: Activity,
              color: 'text-purple-600'
            },
            {
              id: 'total-activity-month',
              label: 'Total Activity this month',
              value: '5,678', // TODO: Replace with actual activity data
              icon: TrendingUp,
              color: 'text-orange-600'
            }
          ]}
          columns={4}
          isLoading={loading}
          className="px-0"
        />

        {/* Second Row - 4 Cards */}
        <StatsCards
          stats={[
            {
              id: 'total-internal-users',
              label: 'Total Internal Users',
              value: users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.MANAGER || u.role === UserRole.STAFF).length,
              icon: Building2,
              color: 'text-indigo-600'
            },
            {
              id: 'total-external-users',
              label: 'Total External Users',
              value: users.filter(u => !u.role || ![UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF].includes(u.role)).length,
              icon: UserCog,
              color: 'text-cyan-600'
            },
            {
              id: 'inactive-users-7days',
              label: 'Total Inactive (7 days no active)',
              value: users.filter(u => {
                if (!u.lastLogin) return true;
                const lastLogin = new Date(u.lastLogin);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return lastLogin < sevenDaysAgo && !u.isActive;
              }).length,
              icon: AlertTriangle,
              color: 'text-red-600'
            },
            {
              id: 'estimated-growth-next-month',
              label: 'Estimate next month Users',
              value: Math.round(pagination.total * 1.1), // 10% growth estimate
              icon: TrendingUp,
              color: 'text-green-600'
            }
          ]}
          columns={4}
          isLoading={loading}
          className="px-0"
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.role || 'all'} onValueChange={handleRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={
                filters.isActive === undefined ? 'all' :
                filters.isActive ? 'active' : 'inactive'
              }
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedUsers.length} user(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedUsers([])}>
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={loading}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 mb-4 p-3 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <AdvancedUserTable
            users={users}
            loading={loading}
            showRoleColumn={true}
            showManagerColumn={true}
            showCreatedAtColumn={true}
            actions={['view', 'edit', 'delete']}
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
            onView={handleViewUser}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            pagination={pagination}
            onPageChange={(page) => fetchUsers({ page })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
