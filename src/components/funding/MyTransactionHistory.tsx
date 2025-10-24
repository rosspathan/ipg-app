import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye,
  Download,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

export const MyTransactionHistory = () => {
  const { data: transactions, isLoading, refetch } = useTransactionHistory();
  const [filter, setFilter] = useState<'all' | 'deposits' | 'withdrawals'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'rejected':
      case 'canceled':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
      case 'verifying':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      approved: 'default',
      completed: 'default',
      rejected: 'destructive',
      canceled: 'destructive',
      pending: 'secondary',
      verifying: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'default'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const exportToCSV = () => {
    if (!transactions) return;
    
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Fee', 'Net Amount', 'Status', 'Reference'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
      t.type,
      t.category,
      `${t.amount} ${t.currency}`,
      `${t.fee} ${t.currency}`,
      `${t.net_amount} ${t.currency}`,
      t.status,
      t.reference || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const filteredTransactions = transactions?.filter(t => {
    if (filter === 'deposits' && t.type !== 'deposit') return false;
    if (filter === 'withdrawals' && t.type !== 'withdrawal') return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="deposits" className="flex-1">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" className="flex-1">Withdrawals</TabsTrigger>
          </TabsList>

          <div className="mt-4 flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('all')}
            >
              All Methods
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === 'INR_BANK' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('INR_BANK')}
            >
              INR Bank
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === 'INR_UPI' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('INR_UPI')}
            >
              INR UPI
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === 'CRYPTO' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('CRYPTO')}
            >
              Crypto
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === 'CRYPTO_TO_INR' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('CRYPTO_TO_INR')}
            >
              Crypto→INR
            </Button>
          </div>

          <TabsContent value={filter} className="mt-4">
            <ScrollArea className="h-[600px] pr-4">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No transactions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => (
                    <Card key={transaction.id} className="hover:bg-accent/5 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-full bg-primary/10">
                              {transaction.type === 'deposit' ? (
                                <ArrowDownLeft className="h-4 w-4 text-primary" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-primary" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm">
                                  {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                </p>
                                {transaction.asset_logo && (
                                  <img 
                                    src={transaction.asset_logo} 
                                    alt={transaction.currency}
                                    className="h-4 w-4 rounded-full"
                                  />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {transaction.method}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Amount: </span>
                                  <span className="font-medium">
                                    {transaction.amount.toLocaleString()} {transaction.currency}
                                  </span>
                                </div>
                                {transaction.fee > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Fee: </span>
                                    <span className="font-medium">
                                      {transaction.fee.toLocaleString()} {transaction.currency}
                                    </span>
                                  </div>
                                )}
                                {transaction.category === 'CRYPTO_TO_INR' && (
                                  <div>
                                    <span className="text-muted-foreground">Net INR: </span>
                                    <span className="font-medium text-success">
                                      ₹{transaction.net_amount.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 text-xs text-muted-foreground">
                                <div>Submitted: {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}</div>
                                {transaction.decided_at && (
                                  <div>
                                    {transaction.status === 'approved' ? 'Approved' : 'Decided'}: {format(new Date(transaction.decided_at), 'MMM dd, yyyy HH:mm')}
                                  </div>
                                )}
                              </div>

                              {transaction.reference && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Ref:</span>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {transaction.reference.slice(0, 20)}...
                                  </code>
                                  {transaction.category === 'CRYPTO' && transaction.reference && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-6 px-2"
                                      onClick={() => window.open(`https://etherscan.io/tx/${transaction.reference}`, '_blank')}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}

                              {transaction.admin_notes && (
                                <div className="mt-2 p-2 bg-muted rounded text-xs">
                                  <span className="font-semibold">Admin Note: </span>
                                  {transaction.admin_notes}
                                </div>
                              )}

                              {transaction.proof_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 h-7"
                                  onClick={() => window.open(transaction.proof_url, '_blank')}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Proof
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(transaction.status)}
                            {getStatusIcon(transaction.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
