'use client';

import { CheckCircle, XCircle, TrendingUp, Package, Crown, Star } from 'lucide-react';
import type { FilterPreset } from '@/types/data-display';

/**
 * Predefined filter presets for license management.
 * Plan: Basic, Premium only. Status: active, cancel only. Term: monthly, yearly only.
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
    id: 'cancelled',
    name: 'Cancelled Licenses',
    description: 'Licenses that have been cancelled',
    filters: {
      status: 'cancel',
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
    id: 'basic-plan',
    name: 'Basic Plan',
    description: 'All Basic plan licenses',
    filters: {
      plan: 'Basic',
    },
    system: true,
    icon: Star,
  },
  {
    id: 'premium-plan',
    name: 'Premium Plan',
    description: 'All Premium plan licenses',
    filters: {
      plan: 'Premium',
    },
    system: true,
    icon: Crown,
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
  {
    id: 'yearly-subscriptions',
    name: 'Yearly Subscriptions',
    description: 'Licenses on yearly billing',
    filters: {
      term: 'yearly',
      status: 'active',
    },
    system: true,
    icon: Package,
  },
];
