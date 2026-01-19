import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, Download, Search, Filter, Eye, FileSpreadsheet, 
  TrendingUp, TrendingDown, ArrowRightLeft, Shield, Gift, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useAdminBSKLedger, 
  useBSKLedgerStats, 
  exportBSKLedgerToCSV, 
  exportBSKLedgerToExcel,
  type BSKLedgerFilters,
  type BSKLedgerEntry 
} from '@/hooks/useAdminBSKLedger';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminBSKLedgerComplete() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BSKLedgerFilters>({});
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<BSKLedgerEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data, isLoading } = useAdminBSKLedger(filters, page, 50);
  const { data: stats } = useBSKLedgerStats(filters);

  const handleExportCSV = () => {
    if (data?.entries) {
      exportBSKLedgerToCSV(data.entries);
    }
  };

  const handleExportExcel = () => {
    if (data?.entries) {
      exportBSKLedgerToExcel(data.entries);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'reversed': return 'bg-muted text-muted-foreground border-muted';
      case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'user_to_user': return 'bg-primary/10 text-primary border-primary/20';
      case 'admin_to_user': return 'bg-success/10 text-success border-success/20';
      case 'user_to_admin': return 'bg-warning/10 text-warning border-warning/20';
      case 'referral_reward': return 'bg-accent/10 text-accent-foreground border-accent/20';
      case 'reward': return 'bg-chart-4/10 text-chart-4 border-chart-4/20';
      case 'badge_system': return 'bg-chart-5/10 text-chart-5 border-chart-5/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'user_to_user': return 'User → User';
      case 'admin_to_user': return 'Admin → User';
      case 'user_to_admin': return 'User → Admin';
      case 'referral_reward': return 'Referral';
      case 'reward': return 'Reward';
      case 'badge_system': return 'Badge';
      case 'loan': return 'Loan';
      case 'purchase': return 'Purchase';
      case 'spin_wheel': return 'Spin';
      default: return category;
    }
  };

  const handleViewDetails = (entry: BSKLedgerEntry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">BSK Complete Ledger</h1>
              <p className="text-sm text-muted-foreground">
                Immutable audit trail of all BSK movements across the platform
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Total Transactions</span>
                <ArrowRightLeft className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {stats?.totalTransactions?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Total Credits</span>
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div className="text-2xl font-bold text-success">
                +{stats?.totalCredits?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Total Debits</span>
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
              <div className="text-2xl font-bold text-destructive">
                -{stats?.totalDebits?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">User Transfers</span>
                <ArrowRightLeft className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {stats?.userTransfers?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Admin Ops</span>
                <Shield className="w-4 h-4 text-warning" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {stats?.adminOperations?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Pending</span>
                <Clock className="w-4 h-4 text-warning" />
              </div>
              <div className="text-2xl font-bold text-warning">
                {stats?.pendingCount?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 bg-card border-border">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Category</label>
              <Select
                value={filters.transferCategory || 'all'}
                onValueChange={(value) => {
                  setFilters(prev => ({ ...prev, transferCategory: value === 'all' ? undefined : value }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="user_to_user">User → User</SelectItem>
                  <SelectItem value="admin_to_user">Admin → User</SelectItem>
                  <SelectItem value="user_to_admin">User → Admin</SelectItem>
                  <SelectItem value="referral_reward">Referral Rewards</SelectItem>
                  <SelectItem value="reward">System Rewards</SelectItem>
                  <SelectItem value="badge_system">Badge System</SelectItem>
                  <SelectItem value="loan">Loans</SelectItem>
                  <SelectItem value="purchase">Purchases</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => {
                  setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reversed">Reversed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Start Date</label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, startDate: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">End Date</label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, endDate: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Reference ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference..."
                  value={filters.referenceId || ''}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, referenceId: e.target.value }));
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">User ID</label>
              <Input
                placeholder="Filter by user ID..."
                value={filters.userId || ''}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, userId: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
          </div>
        </Card>

        {/* Ledger Table */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading ledger entries...
              </div>
            ) : data?.entries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No transactions found matching your filters
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/20 border-b border-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">From</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">To</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Reference</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.entries.map((entry: BSKLedgerEntry) => (
                    <tr key={entry.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                      <td className="p-4 text-sm text-foreground whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        {entry.from_user ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={entry.from_user.avatar_url} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {entry.from_user.display_name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {entry.from_user.display_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {entry.from_user.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {entry.sender_recipient || 'System'}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {entry.to_user ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={entry.to_user.avatar_url} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {entry.to_user.display_name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {entry.to_user.display_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {entry.to_user.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-sm font-semibold ${entry.is_credit ? 'text-success' : 'text-destructive'}`}>
                          {entry.is_credit ? '+' : '-'}{Number(entry.amount).toLocaleString()} BSK
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge className={getCategoryColor(entry.transfer_category)}>
                          {getCategoryLabel(entry.transfer_category)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[100px] block">
                          {entry.reference_id?.substring(0, 12) || '—'}...
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(entry)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Page {page} of {data.totalPages} ({data.totalCount} total entries)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Transaction Details</DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-6">
              {/* Amount Display */}
              <div className="text-center py-6 bg-muted/20 rounded-lg border border-border">
                <div className={`text-4xl font-bold ${selectedEntry.is_credit ? 'text-success' : 'text-destructive'}`}>
                  {selectedEntry.is_credit ? '+' : '-'}{Number(selectedEntry.amount).toLocaleString()} BSK
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {selectedEntry.description}
                </div>
              </div>

              {/* From/To Users */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">From</h4>
                  <div className="p-3 bg-muted/20 rounded-lg border border-border">
                    {selectedEntry.from_user ? (
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={selectedEntry.from_user.avatar_url} />
                          <AvatarFallback>{selectedEntry.from_user.display_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{selectedEntry.from_user.display_name}</div>
                          <div className="text-xs text-muted-foreground">{selectedEntry.from_user.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{selectedEntry.sender_recipient || 'System'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">To</h4>
                  <div className="p-3 bg-muted/20 rounded-lg border border-border">
                    {selectedEntry.to_user ? (
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={selectedEntry.to_user.avatar_url} />
                          <AvatarFallback>{selectedEntry.to_user.display_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{selectedEntry.to_user.display_name}</div>
                          <div className="text-xs text-muted-foreground">{selectedEntry.to_user.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Transaction Details</h4>
                <div className="grid gap-2">
                  <DetailRow label="Transaction ID" value={selectedEntry.id} />
                  <DetailRow label="Reference ID" value={selectedEntry.reference_id || 'N/A'} />
                  <DetailRow label="Type" value={selectedEntry.transaction_subtype} />
                  <DetailRow label="Category" value={getCategoryLabel(selectedEntry.transfer_category)} />
                  <DetailRow label="Balance Type" value={selectedEntry.balance_type} />
                  <DetailRow label="Status" value={selectedEntry.status} />
                  <DetailRow label="Date & Time" value={new Date(selectedEntry.created_at).toLocaleString()} />
                  {selectedEntry.notes && <DetailRow label="Notes" value={selectedEntry.notes} />}
                </div>
              </div>

              {/* Metadata */}
              {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Metadata</h4>
                  <pre className="p-3 bg-muted/20 rounded-lg border border-border text-xs overflow-x-auto">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-muted/10 rounded border border-border">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
