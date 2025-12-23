'use client';

import { CheckCircle, AlertCircle, XCircle, TrendingUp, Package } from 'lucide-react';
import { addDays } from 'date-fns';
import type { FilterPreset } from '@/types/data-display';

/**
 * Predefined filter presets for license management
 */
export const LICENSE_FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'active-licenses',
    name: 'Active Licenses',
    description: 'All currently active licenses',
    filters: {
      status: 'active',
    },
    system: true,
    icon: CheckCircle,
  },
  {
    id: 'expiring-soon',
    name: 'Expiring Soon',
    description: 'Licenses expiring within 30 days',
    filters: {
      status: 'expiring',
      expiresAtTo: addDays(new Date(), 30).toISOString(),
    },
    system: true,
    icon: AlertCircle,
  },
  {
    id: 'expired',
    name: 'Expired Licenses',
    description: 'Licenses that have expired',
    filters: {
      status: 'expired',
    },
    system: true,
    icon: XCircle,
  },
  {
    id: 'high-utilization',
    name: 'High Utilization',
    description: 'Licenses with 80%+ seat usage',
    filters: {
      utilizationMin: 80,
    },
    system: true,
    icon: TrendingUp,
  },
  {
    id: 'available-seats',
    name: 'Has Available Seats',
    description: 'Licenses with available seat capacity',
    filters: {
      hasAvailableSeats: true,
    },
    system: true,
    icon: Package,
  },
  {
    id: 'enterprise-plan',
    name: 'Enterprise Plan',
    description: 'All Enterprise plan licenses',
    filters: {
      plan: 'Enterprise',
    },
    system: true,
    icon: Package,
  },
  {
    id: 'monthly-subscriptions',
    name: 'Monthly Subscriptions',
    description: 'Licenses on monthly billing',
    filters: {
      term: 'monthly',
      status: 'active',
    },
    system: true,
    icon: Package,
  },
];
