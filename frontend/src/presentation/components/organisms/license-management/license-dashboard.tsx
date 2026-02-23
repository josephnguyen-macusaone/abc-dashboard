/**
 * License Dashboard Component
 * Uses license store for all data (metrics, lifecycle, bulk, SMS); no direct API or use-licenses hooks.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/primitives/card';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/atoms/primitives/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms/forms/select';
import { Input } from '@/presentation/components/atoms/forms/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/atoms/primitives/tabs';
import { Alert, AlertDescription } from '@/presentation/components/atoms/primitives/alert';
import { LoadingSpinner } from '@/presentation/components/atoms/display/loading';
import {
  useLicenseStore,
  selectLicenses,
  selectLicensePagination,
  selectLicenseLoading,
  selectLicenseError,
  selectLicenseFilters,
  selectDashboardMetrics,
  selectDashboardMetricsLoading,
  selectDashboardMetricsError,
  selectLicensesRequiringAttentionLoading,
  selectLicensesRequiringAttentionError,
  selectBulkUpdateByIdentifiersLoading,
  selectSmsPayments,
  selectSmsTotals,
  selectSmsPaymentsLoading,
} from '@/infrastructure/stores/license';

import type { DashboardMetricsAlertItem } from '@/infrastructure/api/licenses/types';
import type { LicenseStatus } from '@/types';
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  Database,
  Filter,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

/** Shape of dashboard metrics used by this component (store holds unknown). */
interface DashboardMetricsView {
  overview?: { active?: number; expiringSoon?: number };
  utilization?: {
    newLicensesThisMonth?: number;
    utilizationRate?: number;
    availableSeats?: number;
    licenseIncomeThisMonth?: number;
    smsIncomeThisMonth?: { smsSent?: number };
  };
  alerts?: {
    expiringSoon: DashboardMetricsAlertItem[];
    lowSeats: DashboardMetricsAlertItem[];
  };
}

function toLicenseStatus(value: string): LicenseStatus | undefined {
  return value === 'active' || value === 'cancel' ? value : undefined;
}

export const LicenseDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>([]);

  const licenses = useLicenseStore(selectLicenses);
  const pagination = useLicenseStore(selectLicensePagination);
  const licensesLoading = useLicenseStore(selectLicenseLoading);
  const licensesError = useLicenseStore(selectLicenseError);
  const setFilters = useLicenseStore((s) => s.setFilters);
  const fetchLicenses = useLicenseStore((s) => s.fetchLicenses);
  const fetchDashboardMetrics = useLicenseStore((s) => s.fetchDashboardMetrics);
  const fetchLicensesRequiringAttention = useLicenseStore((s) => s.fetchLicensesRequiringAttention);
  const bulkUpdateByIdentifiers = useLicenseStore((s) => s.bulkUpdateByIdentifiers);
  const fetchSmsPayments = useLicenseStore((s) => s.fetchSmsPayments);
  const addSmsPayment = useLicenseStore((s) => s.addSmsPayment);

  const metrics = useLicenseStore(selectDashboardMetrics) as DashboardMetricsView | null | undefined;
  const metricsLoading = useLicenseStore(selectDashboardMetricsLoading);
  const metricsError = useLicenseStore(selectDashboardMetricsError);
  const lifecycleLoading = useLicenseStore(selectLicensesRequiringAttentionLoading);
  const lifecycleError = useLicenseStore(selectLicensesRequiringAttentionError);
  const bulkLoading = useLicenseStore(selectBulkUpdateByIdentifiersLoading);
  const payments = useLicenseStore(selectSmsPayments);
  const smsTotals = useLicenseStore(selectSmsTotals);
  const smsLoading = useLicenseStore(selectSmsPaymentsLoading);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [fetchDashboardMetrics]);

  useEffect(() => {
    setFilters({ search: searchTerm || undefined, status: toLicenseStatus(statusFilter) });
    fetchLicenses({
      page: 1,
      limit: 20,
      search: searchTerm || undefined,
      status: toLicenseStatus(statusFilter),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial fetch only

  const handleLicenseSelect = (licenseId: string, selected: boolean) => {
    if (selected) {
      setSelectedLicenses((prev) => [...prev, licenseId]);
    } else {
      setSelectedLicenses((prev) => prev.filter((id) => id !== licenseId));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedLicenses.length === 0) return;
    try {
      await bulkUpdateByIdentifiers({ appids: selectedLicenses }, { status: newStatus });
      setSelectedLicenses([]);
      fetchLicenses();
      fetchDashboardMetrics();
    } catch {
      // Error shown by store toast
    }
  };

  const handleSearch = () => {
    setFilters({ search: searchTerm || undefined, status: toLicenseStatus(statusFilter) });
    fetchLicenses({
      page: 1,
      limit: 20,
      search: searchTerm || undefined,
      status: toLicenseStatus(statusFilter),
    });
  };

  const handleRefresh = () => {
    fetchLicenses();
    fetchDashboardMetrics();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">License Management</h1>
          <p className="text-muted-foreground">
            Comprehensive license lifecycle management and analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add License
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {(licensesError || metricsError || lifecycleError) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {licensesError || metricsError || lifecycleError}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="licenses">Licenses</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="payments">SMS Payments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Dashboard Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metricsLoading ? (
              <div className="col-span-full">
                <LoadingSpinner />
              </div>
            ) : metrics ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{metrics.overview?.active ?? '—'}</div>
                    <p className="text-xs text-muted-foreground">
                      +{metrics.utilization?.newLicensesThisMonth ?? 0} from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-orange-600">
                      {metrics.overview?.expiringSoon ?? '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Within 30 days
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">
                      {Math.round(metrics.utilization?.utilizationRate ?? 0)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metrics.utilization?.availableSeats ?? 0} seats available
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">
                      ${metrics.utilization?.licenseIncomeThisMonth ?? '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +{metrics.utilization?.smsIncomeThisMonth?.smsSent ?? 0} SMS credits
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="col-span-full">
                <div>Failed to load dashboard metrics</div>
              </div>
            )}
          </div>

          {/* Alerts Section */}
          {metrics?.alerts && (metrics.alerts.expiringSoon.length > 0 || metrics.alerts.lowSeats.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  Attention Required
                </CardTitle>
                <CardDescription>
                  Licenses requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.alerts.expiringSoon.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Expiring Soon ({metrics.alerts.expiringSoon.length})</h4>
                    <div className="space-y-2">
                      {metrics.alerts.expiringSoon.slice(0, 5).map((item: DashboardMetricsAlertItem) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <div>
                            <span className="font-medium">{item.key ?? item.dba ?? item.id}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              Expires in {item.daysUntilExpiry} days
                            </span>
                          </div>
                          <Badge variant="outline" className="text-orange-600">
                            {item.daysUntilExpiry} days
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {metrics.alerts.lowSeats.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Low Seat Utilization ({metrics.alerts.lowSeats.length})</h4>
                    <div className="space-y-2">
                      {metrics.alerts.lowSeats.slice(0, 5).map((item: DashboardMetricsAlertItem) => {
                        const seatsUsed = item.seatsUsed ?? item.usedSeats ?? 0;
                        const seatsTotal = item.seatsTotal ?? 1;
                        return (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <div>
                              <span className="font-medium">{item.key ?? item.dba ?? item.id}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {seatsUsed}/{seatsTotal} seats used
                              </span>
                            </div>
                            <Badge variant="outline">
                              {seatsTotal > 0 ? Math.round((seatsUsed / seatsTotal) * 100) : 0}%
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Licenses Tab */}
        <TabsContent value="licenses" className="space-y-6">
          {/* Filters and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by business name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancel">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            {selectedLicenses.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedLicenses.length} selected
                </span>
                <Select onValueChange={handleBulkStatusUpdate} disabled={bulkLoading}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Bulk actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Set Active</SelectItem>
                    <SelectItem value="cancel">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Licenses Table */}
          <Card>
            <CardContent className="p-0">
              {licensesLoading ? (
                <div className="p-8 text-center">
                  <LoadingSpinner />
                </div>
              ) : licensesError ? (
                <div className="p-8">
                  <div>{licensesError}</div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedLicenses.length === licenses.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLicenses(licenses.map(l => String(l.id)));
                              } else {
                                setSelectedLicenses([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>License Key</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {licenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedLicenses.includes(String(license.id))}
                              onChange={(e) => handleLicenseSelect(String(license.id), e.target.checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{license.key}</TableCell>
                          <TableCell>{license.dba}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                license.status === 'active' ? 'default' :
                                  license.status === 'cancel' ? 'secondary' : 'outline'
                              }
                            >
                              {license.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{license.plan}</TableCell>
                          <TableCell>
                            {license.term === 'yearly' && license.dueDate ? (
                              new Date(license.dueDate).toLocaleDateString()
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {license.seatsUsed}/{license.seatsTotal}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                              <Button variant="outline" size="sm">
                                <Zap className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="p-4 border-t">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lifecycle Tab */}
        <TabsContent value="lifecycle" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>License Lifecycle Management</CardTitle>
              <CardDescription>
                Automated license lifecycle operations and monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button
                  onClick={() => fetchLicensesRequiringAttention()}
                  disabled={lifecycleLoading}
                  className="h-20"
                >
                  <AlertTriangle className="h-6 w-6 mr-2" />
                  Check Attention
                </Button>

                <Button variant="outline" className="h-20">
                  <Calendar className="h-6 w-6 mr-2" />
                  Renewal Reminders
                </Button>

                <Button variant="outline" className="h-20">
                  <Database className="h-6 w-6 mr-2" />
                  Bulk Operations
                </Button>
              </div>

              {lifecycleError && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Some lifecycle features may not be available: {lifecycleError}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMS Payment Management</CardTitle>
              <CardDescription>
                Track and manage SMS payment records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  SMS payment management integration ready
                </p>
                <Button
                  onClick={() => fetchSmsPayments()}
                  disabled={smsLoading}
                  className="mt-4"
                >
                  {smsLoading ? 'Loading…' : 'Load Payment History'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LicenseDashboard;