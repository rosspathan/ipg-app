import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Clock, CheckCircle2, XCircle, Download } from 'lucide-react';
import { useBSKPurchaseHistory, useBSKPurchaseStats } from '@/hooks/useBSKPurchaseHistory';
import { useAuthUser } from '@/hooks/useAuthUser';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function BSKPurchaseHistory() {
  const { user } = useAuthUser();
  const { data: history, isLoading } = useBSKPurchaseHistory(user?.id);
  const { data: stats } = useBSKPurchaseStats(user?.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportToCSV = () => {
    if (!history || history.length === 0) return;

    const headers = ['Date', 'Amount (BSK)', 'Payment Method', 'Status', 'Total Received', 'Admin Notes'];
    const rows = history.map(h => [
      new Date(h.created_at).toLocaleDateString(),
      h.purchase_amount.toString(),
      h.payment_method,
      h.status,
      h.total_received?.toString() || '0',
      h.admin_notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bsk-purchase-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Purchase History</CardTitle>
            <CardDescription>Your BSK purchase requests and status</CardDescription>
          </div>
          {history && history.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-success">{stats.approved}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-2xl font-bold">{stats.totalReceived.toLocaleString()} BSK</p>
            </div>
          </div>
        )}

        {!history || history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No purchase history yet</p>
            <p className="text-sm mt-2">Your BSK purchase requests will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {history.map((request) => (
                <div
                  key={request.id}
                  className={cn(
                    'p-4 rounded-lg border transition-colors',
                    request.status === 'approved' && 'bg-success/5 border-success/20',
                    request.status === 'rejected' && 'bg-destructive/5 border-destructive/20',
                    request.status === 'pending' && 'bg-warning/5 border-warning/20'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-lg">
                          {request.purchase_amount.toLocaleString()} BSK
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Payment Method</p>
                      <p className="font-medium">{request.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Received</p>
                      <p className="font-medium">
                        {request.status === 'approved' 
                          ? `${request.total_received.toLocaleString()} BSK` 
                          : '—'
                        }
                      </p>
                    </div>
                    {request.payment_method === 'BEP20' && request.transaction_hash && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Transaction Hash</p>
                        <p className="font-mono text-xs truncate">{request.transaction_hash}</p>
                      </div>
                    )}
                    {(request.payment_method === 'UPI' || request.payment_method === 'IMPS') && request.utr_number && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">UTR Number</p>
                        <p className="font-mono text-xs">{request.utr_number}</p>
                      </div>
                    )}
                  </div>

                  {request.status === 'approved' && (
                    <div className="mt-3 p-3 bg-success/5 border border-success/20 rounded-md">
                      <p className="text-sm font-semibold text-success mb-1">✅ Approved</p>
                      <div className="flex justify-between text-xs">
                        <span>Withdrawable: {request.withdrawable_amount.toLocaleString()} BSK</span>
                        <span>Holding: {request.holding_bonus_amount.toLocaleString()} BSK</span>
                      </div>
                    </div>
                  )}

                  {request.status === 'rejected' && request.rejected_reason && (
                    <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-md">
                      <p className="text-sm font-semibold text-destructive mb-1">❌ Rejection Reason</p>
                      <p className="text-xs text-muted-foreground">{request.rejected_reason}</p>
                    </div>
                  )}

                  {request.bscscan_link && (
                    <div className="mt-3">
                      <a
                        href={request.bscscan_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View on BSCScan <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {request.screenshot_url && (
                    <div className="mt-3">
                      <a
                        href={request.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View Screenshot <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
