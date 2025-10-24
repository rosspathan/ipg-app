import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, RefreshCw, Search, Filter } from 'lucide-react';
import { useAdminCommissions, type CommissionFilters } from '@/hooks/useAdminCommissions';
import { CommissionKPICards } from '@/components/admin/commission/CommissionKPICards';
import { CommissionTypeDistribution } from '@/components/admin/commission/CommissionTypeDistribution';
import { CommissionDataTable } from '@/components/admin/commission/CommissionDataTable';
import { exportCommissionsToCSV } from '@/lib/commissionExport';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function AdminCommissionHistory() {
  const [filters, setFilters] = useState<CommissionFilters>({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const { commissions, total, page: currentPage, totalPages, stats, isLoading, refetch } = useAdminCommissions(
    filters,
    page,
    50
  );

  const handleExport = () => {
    if (commissions.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no commissions matching your filters',
        variant: 'destructive',
      });
      return;
    }

    exportCommissionsToCSV(commissions);
    toast({
      title: 'Export successful',
      description: `Exported ${commissions.length} commission records`,
    });
  };

  const handleFilterChange = (key: keyof CommissionFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Commission History</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all platform commission activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <CommissionKPICards stats={stats} isLoading={isLoading} />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Commission Type Distribution */}
        <div className="md:col-span-1">
          <CommissionTypeDistribution stats={stats} />
        </div>

        {/* Filters & Data Table */}
        <div className="md:col-span-2 space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </CardTitle>
                  <CardDescription>Filter commissions by various criteria</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            <Collapsible open={showFilters}>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Commission Type</Label>
                      <Select
                        value={filters.commissionType || 'all'}
                        onValueChange={(value) =>
                          handleFilterChange('commissionType', value === 'all' ? undefined : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="direct">💰 Direct (10%)</SelectItem>
                          <SelectItem value="team_income">🌳 Team Income</SelectItem>
                          <SelectItem value="vip_milestone">🎁 VIP Milestones</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Destination</Label>
                      <Select
                        value={filters.destination || 'all'}
                        onValueChange={(value) =>
                          handleFilterChange('destination', value === 'all' ? undefined : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All destinations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Destinations</SelectItem>
                          <SelectItem value="withdrawable">Withdrawable</SelectItem>
                          <SelectItem value="holding">Holding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Min Amount (BSK)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.minAmount || ''}
                        onChange={(e) =>
                          handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Max Amount (BSK)</Label>
                      <Input
                        type="number"
                        placeholder="No limit"
                        value={filters.maxAmount || ''}
                        onChange={(e) =>
                          handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={clearFilters} variant="outline" size="sm" className="flex-1">
                      Clear Filters
                    </Button>
                    <Button onClick={() => refetch()} size="sm" className="flex-1">
                      <Search className="w-4 h-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Commissions</CardTitle>
              <CardDescription>
                Showing {commissions.length} of {total} total commissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommissionDataTable
                commissions={commissions}
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
