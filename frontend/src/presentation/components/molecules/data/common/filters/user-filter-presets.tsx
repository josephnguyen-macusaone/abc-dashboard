'use client';

import { Users, Clock, UserPlus, Shield, UserCheck } from 'lucide-react';
import { subDays, startOfMonth, startOfWeek } from 'date-fns';
import type { FilterPreset } from '@/shared/types/data-display';

/**
 * Predefined filter presets for user management
 */
export const USER_FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'active-staff',
    name: 'Active Staff',
    description: 'All active staff members',
    filters: {
      role: 'staff',
      isActive: true,
    },
    system: true,
    icon: Users,
  },
  {
    id: 'active-managers',
    name: 'Active Managers',
    description: 'All active manager accounts',
    filters: {
      role: 'manager',
      isActive: true,
    },
    system: true,
    icon: Shield,
  },
  {
    id: 'recent-logins',
    name: 'Recent Logins',
    description: 'Users who logged in within last 7 days',
    filters: {
      lastLoginFrom: subDays(new Date(), 7).toISOString(),
    },
    system: true,
    icon: Clock,
  },
  {
    id: 'new-users-month',
    name: 'New This Month',
    description: 'Users created this month',
    filters: {
      createdAtFrom: startOfMonth(new Date()).toISOString(),
    },
    system: true,
    icon: UserPlus,
  },
  {
    id: 'new-users-week',
    name: 'New This Week',
    description: 'Users created this week',
    filters: {
      createdAtFrom: startOfWeek(new Date()).toISOString(),
    },
    system: true,
    icon: UserPlus,
  },
  {
    id: 'inactive-users',
    name: 'Inactive Users',
    description: 'Users who are currently inactive',
    filters: {
      isActive: false,
    },
    system: true,
    icon: UserCheck,
  },
];
