import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Filter, ArrowLeft, Eye } from 'lucide-react';
import { useAdminBSKTransfers, exportTransfersToCSV, type TransferFilters } from '@/hooks/useAdminBSKTransfers';
import { BSKTransferAnalytics } from '@/components/admin/bsk/BSKTransferAnalytics';
import { TransferDetailModal } from '@/components/admin/bsk/TransferDetailModal';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

export default function AdminBSKTransferHistory() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TransferFilters>({
    transferTypes: [],
    startDate: '',
    endDate: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data, isLoading } = useAdminBSKTransfers(filters, page, 50);

  const handleExport = () => {
    if (data?.transfers) {
      exportTransfersToCSV(data.transfers);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transfer_in':
        return 'bg-success/10 text-success border-success/20';
      case 'transfer_out':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'admin_credit':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'admin_debit':
        return 'bg-danger/10 text-danger border-danger/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleViewDetails = (transfer: any) => {
    setSelectedTransfer(transfer);
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/unified')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">BSK Transfer History</h1>
              <p className="text-sm text-muted-foreground">
                Monitor all platform transfers and admin operations
              </p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Analytics */}
        <BSKTransferAnalytics filters={filters} />

        {/* Filters */}
        <Card className="p-6 bg-card border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="text-sm text-muted-foreground mb-2 block">Transfer Type</label>
              <Select
                value={filters.transferTypes?.[0] || 'all'}
                onValueChange={(value) => {
                  setFilters(prev => ({
                    ...prev,
                    transferTypes: value === 'all' ? [] : [value],
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="transfer_in">User Transfers (In)</SelectItem>
                  <SelectItem value="transfer_out">User Transfers (Out)</SelectItem>
                  <SelectItem value="admin_credit">Admin Credits</SelectItem>
                  <SelectItem value="admin_debit">Admin Debits</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1">
              <label className="text-sm text-muted-foreground mb-2 block">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, startDate: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-sm text-muted-foreground mb-2 block">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, endDate: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-sm text-muted-foreground mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Email, username, or ID..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, search: e.target.value }));
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Transfer Table */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading transfers...
              </div>
            ) : data?.transfers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No transfers found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/20 border-b border-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Balance Type</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.transfers.map((transfer: any) => (
                    <tr key={transfer.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                      <td className="p-4 text-sm text-foreground">
                        {new Date(transfer.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <Badge className={getTypeColor(transfer.transaction_type)}>
                          {transfer.transaction_type?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {transfer.sender ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={transfer.sender.avatar_url} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {transfer.sender.display_name?.[0] || transfer.sender.email?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {transfer.sender.display_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {transfer.sender.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-semibold text-foreground">
                          {Number(transfer.amount).toLocaleString()} BSK
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {transfer.balance_type || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(transfer)}
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
                Page {page} of {data.totalPages} ({data.totalCount} total transfers)
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
      <TransferDetailModal
        transfer={selectedTransfer}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />
    </div>
  );
}
