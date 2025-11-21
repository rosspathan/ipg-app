import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CleanMetricCard } from '@/components/admin/clean/CleanMetricCard';
import { Download, Search, TrendingUp, Users, Gift, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import {
  useAdminOfferPurchaseHistory,
  useOfferPurchaseAnalytics,
  exportPurchaseHistoryToCSV,
  type PurchaseHistoryFilters,
} from '@/hooks/useAdminOfferPurchaseHistory';
import { useAdminPurchaseOffers } from '@/hooks/useAdminPurchaseOffers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PurchaseClaimDetailModal } from '@/components/admin/purchase-offers/PurchaseClaimDetailModal';
import type { OfferPurchaseClaim } from '@/hooks/useAdminOfferPurchaseHistory';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function AdminOfferPurchaseHistory() {
  const [filters, setFilters] = useState<PurchaseHistoryFilters>({
    bonusType: 'all',
  });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<OfferPurchaseClaim | null>(null);

  const { data: offersData } = useAdminPurchaseOffers();
  const { data: historyData, isLoading: historyLoading } = useAdminOfferPurchaseHistory(filters, page, 50);
  const { data: analytics, isLoading: analyticsLoading } = useOfferPurchaseAnalytics(filters);

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput }));
    setPage(1);
  };

  const handleExport = () => {
    if (historyData?.claims) {
      exportPurchaseHistoryToCSV(historyData.claims);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">BSK Offer Purchase History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and analyze all promotional offer claims
          </p>
        </div>
        <Button onClick={handleExport} disabled={!historyData?.claims?.length}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <CleanMetricCard
              label="Total Claims"
              value={analytics?.totalClaims || 0}
              icon={TrendingUp}
            />
            <CleanMetricCard
              label="Purchase Volume"
              value={`${(analytics?.totalPurchaseVolume || 0).toFixed(0)} BSK`}
              icon={DollarSign}
            />
            <CleanMetricCard
              label="Bonuses Distributed"
              value={`${(analytics?.totalBonusesDistributed || 0).toFixed(0)} BSK`}
              icon={Gift}
            />
            <CleanMetricCard
              label="Unique Users"
              value={analytics?.uniqueUsers || 0}
              icon={Users}
            />
          </>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={e => {
                setFilters(prev => ({ ...prev, startDate: e.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={e => {
                setFilters(prev => ({ ...prev, endDate: e.target.value }));
                setPage(1);
              }}
            />
          </div>

          {/* Offer Filter */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Offer</label>
            <Select
              value={filters.bonusId || 'all'}
              onValueChange={value => {
                setFilters(prev => ({ ...prev, bonusId: value === 'all' ? undefined : value }));
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Offers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offers</SelectItem>
                {offersData?.map(offer => (
                  <SelectItem key={offer.id} value={offer.id}>
                    {offer.campaign_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bonus Type Filter */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bonus Type</label>
            <Select
              value={filters.bonusType || 'all'}
              onValueChange={value => {
                setFilters(prev => ({ ...prev, bonusType: value as any }));
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="withdrawable">Withdrawable Only</SelectItem>
                <SelectItem value="holding">Holding Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Search by user email, name, phone, or order ID..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        {historyLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : historyData?.claims && historyData.claims.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Offer</TableHead>
                    <TableHead className="text-right">Purchase</TableHead>
                    <TableHead className="text-right">Withdrawable Bonus</TableHead>
                    <TableHead className="text-right">Holding Bonus</TableHead>
                    <TableHead className="text-right">Total Bonus</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.claims.map(claim => {
                    const totalBonus = claim.withdrawable_bonus_bsk + claim.holding_bonus_bsk;
                    return (
                      <TableRow key={claim.id}>
                        <TableCell className="text-xs">
                          {format(new Date(claim.claimed_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{claim.user_full_name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{claim.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{claim.campaign_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {claim.purchase_amount_bsk.toFixed(2)} BSK
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono text-sm">{claim.withdrawable_bonus_bsk.toFixed(2)} BSK</div>
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                            {claim.withdrawable_bonus_percent}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono text-sm">{claim.holding_bonus_bsk.toFixed(2)} BSK</div>
                          <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600">
                            {claim.holding_bonus_percent}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {totalBonus.toFixed(2)} BSK
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {claim.order_id.slice(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedClaim(claim)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card Grid */}
            <div className="lg:hidden p-4 space-y-4">
              {historyData.claims.map(claim => {
                const totalBonus = claim.withdrawable_bonus_bsk + claim.holding_bonus_bsk;
                return (
                  <Card key={claim.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{claim.user_full_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{claim.user_email}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClaim(claim)}
                      >
                        View
                      </Button>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{claim.campaign_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(claim.claimed_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Purchase</div>
                        <div className="font-mono">{claim.purchase_amount_bsk.toFixed(2)} BSK</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Total Bonus</div>
                        <div className="font-mono font-semibold">{totalBonus.toFixed(2)} BSK</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {historyData.totalPages > 1 && (
              <div className="border-t p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {historyData.totalPages} ({historyData.totalCount} total claims)
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink>{page}</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(p => Math.min(historyData.totalPages, p + 1))}
                        className={page === historyData.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No purchase claims found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedClaim && (
        <PurchaseClaimDetailModal
          claim={selectedClaim}
          open={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  );
}
