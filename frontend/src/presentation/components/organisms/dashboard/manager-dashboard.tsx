'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Search, UserCheck, UserX, UserPlus, Activity, TrendingUp, AlertTriangle, Building2, UserCog } from 'lucide-react';
import { Button } from '@/presentation/components/atoms';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/atoms';
import { Input } from '@/presentation/components/atoms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms';
import { StatsCards } from '@/presentation/components/molecules/user-management';
import { AdvancedUserTable } from '@/presentation/components/organisms/user-management';
import { useUserStore } from '@/infrastructure/stores/user-store';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { UserRole } from '@/domain/entities/user-entity';

interface ManagerDashboardProps {
  className?: string;
}

export function ManagerDashboard({ className }: ManagerDashboardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const {
    users,
    loading,
    error,
    filters,
    pagination,
    fetchUsers,
    setFilters,
  } = useUserStore();

  const [searchQuery, setSearchQuery] = useState(filters.search || '');

  useEffect(() => {
    if (currentUser?.id) {
      // Fetch only users managed by this manager
      fetchUsers({ managedBy: currentUser.id });
    }
  }, [fetchUsers, currentUser?.id]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query, managedBy: currentUser?.id });
  };

  const handleStatusFilter = (status: string) => {
    const isActive = status === 'all' ? undefined : status === 'active';
    setFilters({
      ...filters,
      isActive,
      managedBy: currentUser?.id
    });
  };

  const handleCreateUser = () => {
    // TODO: Open create user modal or navigate to create section
    console.log('Create user clicked');
  };

  const handleViewUser = (userId: string) => {
    // TODO: Open view user modal or navigate to view section
    console.log('View user clicked:', userId);
  };

  const handleEditUser = (userId: string) => {
    // TODO: Open edit user modal or navigate to edit section
    console.log('Edit user clicked:', userId);
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const { updateUser } = useUserStore.getState();
      await updateUser(userId, { isActive: true });
    } catch (error) {
      console.error('Failed to activate user:', error);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const { updateUser } = useUserStore.getState();
      await updateUser(userId, { isActive: false });
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    }
  };

  const handleReassignUser = (userId: string) => {
    // TODO: Open reassign user modal or navigate to reassign section
    console.log('Reassign user clicked:', userId);
  };

  const teamMembers = users.filter(user => user.managedBy === currentUser?.id);
  const activeMembers = teamMembers.filter(user => user.isActive);

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
          <p className="text-gray-600 mt-1">Manage your team members and their assignments</p>
        </div>
        <Button onClick={handleCreateUser} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Team Member
        </Button>
      </div>

      {/* Stats Cards - 8 Cards in 2 rows */}
      <div className="space-y-6">
        {/* First Row - 4 Cards */}
        <StatsCards
          stats={[
            {
              id: 'total-active-team',
              label: 'Total Active Team Members',
              value: activeMembers.length,
              icon: Users,
              color: 'text-blue-600'
            },
            {
              id: 'new-members-month',
              label: 'New Members this month',
              value: teamMembers.filter(u => {
                if (!u.createdAt) return false;
                const created = new Date(u.createdAt);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
              }).length,
              icon: UserPlus,
              color: 'text-green-600'
            },
            {
              id: 'team-sessions-month',
              label: 'Total Team Sessions this month',
              value: '456', // TODO: Replace with actual session data
              icon: Activity,
              color: 'text-purple-600'
            },
            {
              id: 'team-activity-month',
              label: 'Total Team Activity this month',
              value: '2,345', // TODO: Replace with actual activity data
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
              id: 'total-team-size',
              label: 'Total Team Size',
              value: teamMembers.length,
              icon: Building2,
              color: 'text-indigo-600'
            },
            {
              id: 'total-staff-members',
              label: 'Total Staff Members',
              value: teamMembers.filter(u => u.role === UserRole.STAFF).length,
              icon: UserCog,
              color: 'text-cyan-600'
            },
            {
              id: 'inactive-members-7days',
              label: 'Total Inactive (7 days no active)',
              value: teamMembers.filter(u => {
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
              id: 'estimated-team-growth',
              label: 'Estimate next month Team Size',
              value: Math.round(teamMembers.length * 1.05), // 5% growth estimate
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
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search team members by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-red-600 mb-4 p-3 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <AdvancedUserTable
            users={teamMembers}
            loading={loading}
            showRoleColumn={false}
            showManagerColumn={false}
            actions={['view', 'edit', 'activate', 'deactivate']}
            onView={handleViewUser}
            onEdit={handleEditUser}
            onActivate={handleActivateUser}
            onDeactivate={handleDeactivateUser}
            pagination={pagination}
            onPageChange={(page) => fetchUsers({
              page,
              managedBy: currentUser?.id
            })}
          />

          {teamMembers.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first team member.
              </p>
              <div className="mt-6">
                <Button onClick={handleCreateUser}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Team Member
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
