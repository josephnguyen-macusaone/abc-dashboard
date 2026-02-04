/**
 * License Dashboard Component
 * Complete example of frontend integration using the license management hooks
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/primitives/card';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/atoms/primitives/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms/forms/select';
import { Input } from '@/presentation/components/atoms/forms/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/atoms/primitives/tabs';
import { Alert, AlertDescription } from '@/presentation/components/atoms/primitives/alert';
import { LoadingSpinner } from '@/presentation/components/atoms/display/loading';
// import { ErrorDisplay } from '@/presentation/components/atoms/display/error-display';
// import { PaginationControls } from '@/presentation/components/molecules/data/pagination-controls';
// import { MetricsGrid } from '@/presentation/components/molecules/data/metrics-grid';

import {
  useLicenses,
  useDashboardMetrics,
  useLicenseLifecycle,
  useBulkLicenseOperations,
  useSmsPayments
} from '@/presentation/hooks/use-licenses';

import {
  AlertTriangle,
  Calendar,
  CreditCard,
  Database,
  Download,
  Filter,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

export const LicenseDashboard: React.FC = () => {
  // State for filters and UI
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>([]);

  // Hooks for data management
  const {
    licenses,
    pagination,
    loading: licensesLoading,
    error: licensesError,
    goToPage,
    changeLimit,
    filter,
    refetch: refetchLicenses
  } = useLicenses({
    page: 1,
    limit: 20,
    status: statusFilter,
    dba: searchTerm,
    autoFetch: true
  });

  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useDashboardMetrics({
    autoFetch: true
  }) as any;

  const {
    getLicensesRequiringAttention,
    loading: lifecycleLoading,
    error: lifecycleError
  } = useLicenseLifecycle();

  const {
    bulkUpdate,
    loading: bulkLoading
  } = useBulkLicenseOperations();

  const {
    payments,
    totals: smsTotals,
    loading: smsLoading,
    addPayment
  } = useSmsPayments({
    autoFetch: false // Only load when needed
  });

  // Handle license selection
  const handleLicenseSelect = (licenseId: string, selected: boolean) => {
    if (selected) {
      setSelectedLicenses(prev => [...prev, licenseId]);
    } else {
      setSelectedLicenses(prev => prev.filter(id => id !== licenseId));
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedLicenses.length === 0) return;

    try {
      await bulkUpdate({
        identifiers: { appids: selectedLicenses },
        updates: { status: newStatus }
      });

      // Clear selection and refetch
      setSelectedLicenses([]);
      refetchLicenses();
      refetchMetrics();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle search
  const handleSearch = () => {
    filter({ dba: searchTerm, status: statusFilter });
  };

  // Handle refresh
  const handleRefresh = () => {
    refetchLicenses();
    refetchMetrics();
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
                    <div className="text-2xl font-semibold">{metrics.overview.active}</div>
                    <p className="text-xs text-muted-foreground">
                      +{metrics.utilization.newLicensesThisMonth} from last month
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
                      {metrics.overview.expiringSoon}
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
                      {Math.round(metrics.utilization.utilizationRate)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metrics.utilization.availableSeats} seats available
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
                      ${metrics.utilization.licenseIncomeThisMonth}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +{metrics.utilization.smsIncomeThisMonth.smsSent} SMS credits
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
          {metrics?.alerts && (
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
                      {metrics.alerts.expiringSoon.slice(0, 5).map((license: any) => (
                        <div key={license.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <div>
                            <span className="font-medium">{license.key}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              Expires in {license.daysUntilExpiry} days
                            </span>
                          </div>
                          <Badge variant="outline" className="text-orange-600">
                            {license.daysUntilExpiry} days
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
                      {metrics.alerts.lowSeats.slice(0, 5).map((license: any) => (
                        <div key={license.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <div>
                            <span className="font-medium">{license.key}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {license.seatsUsed}/{license.seatsTotal} seats used
                            </span>
                          </div>
                          <Badge variant="outline">
                            {Math.round((license.seatsUsed / license.seatsTotal) * 100)}%
                          </Badge>
                        </div>
                      ))}
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
                            {license.startsAt ? new Date(license.startsAt).toLocaleDateString() : 'N/A'}
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
                  onClick={() => getLicensesRequiringAttention()}
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
                  onClick={() => {/* Load SMS payments */ }}
                  className="mt-4"
                >
                  Load Payment History
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