import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Gift,
  Users,
  Shield,
  Sparkles,
  ArrowRightLeft,
  Award,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  ArrowDownRight,
  Banknote,
  Wallet,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';
import { useUnifiedBSKHistory } from '@/hooks/useUnifiedBSKHistory';
import { BSKHistoryEmptyState } from './BSKHistoryEmptyState';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface UnifiedBSKHistoryProps {
  userId?: string;
  className?: string;
}

// Icon mapping for transaction types
const getTransactionIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'transfer_out':
      return Send;
    case 'transfer_in':
      return ArrowDownRight;
    case 'withdrawal':
      return Banknote;
    case 'loan_disbursement':
    case 'loan_repayment':
    case 'loan':
      return Wallet;
    case 'badge_bonus':
    case 'badge_purchase':
      return Award;
    case 'referral_commission':
    case 'referral_bonus':
      return Users;
    case 'insurance_claim':
    case 'insurance_premium':
      return Shield;
    case 'staking_reward':
    case 'ad_reward':
    case 'ad_subscription':
      return Sparkles;
    case 'promotion_bonus':
    case 'admin_credit':
    case 'admin_debit':
    case 'admin_operation':
      return Gift;
    case 'manual_purchase':
      return ShoppingCart;
    case 'holding_to_withdrawable':
      return ArrowRightLeft;
    case 'deposit':
    case 'credit':
      return CreditCard;
    default:
      return DollarSign;
  }
};

// Color coding for transaction types
const getTransactionColor = (amount: number) => {
  if (amount > 0) return 'text-success';
  if (amount < 0) return 'text-destructive';
  return 'text-muted-foreground';
};

const getBalanceTypeBadgeVariant = (balanceType: string) => {
  return balanceType === 'withdrawable' ? 'default' : 'secondary';
};

const getStatusBadge = (status?: string) => {
  if (!status) return null;
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'completed' || statusLower === 'approved') {
    return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Completed</Badge>;
  }
  if (statusLower === 'pending') {
    return <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">Pending</Badge>;
  }
  if (statusLower === 'processing') {
    return <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400">Processing</Badge>;
  }
  if (statusLower === 'rejected' || statusLower === 'failed') {
    return <Badge variant="destructive">Failed</Badge>;
  }
  return null;
};

export function UnifiedBSKHistory({ userId, className }: UnifiedBSKHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBalanceType, setSelectedBalanceType] = useState<string>('all');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const {
    transactions,
    totalCount,
    statistics,
    isLoading,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    exportToCSV,
  } = useUnifiedBSKHistory(userId, {});

  const handleSearch = () => {
    setFilters({ ...filters, searchTerm });
    setPage(1);
  };

  const handleBalanceTypeFilter = (value: string) => {
    setSelectedBalanceType(value);
    setFilters({
      ...filters,
      balanceTypes: value === 'all' ? undefined : [value as 'withdrawable' | 'holding'],
    });
    setPage(1);
  };

  const handleTransactionTypeFilter = (value: string) => {
    setSelectedTransactionType(value);
    setFilters({
      ...filters,
      transactionTypes: value === 'all' ? undefined : [value],
    });
    setPage(1);
  };

  // Show empty state if no transactions and not loading
  if (!isLoading && transactions.length === 0 && !searchTerm && selectedBalanceType === 'all' && selectedTransactionType === 'all') {
    return (
      <div className={cn('', className)}>
        <BSKHistoryEmptyState />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Statistics Overview - Enhanced Design */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Earned */}
          <Card className="relative overflow-hidden p-6 border-success/20 bg-gradient-to-br from-success/5 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full blur-3xl" />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <Badge variant="outline" className="text-xs border-success/30">
                  +{((statistics.totalEarned / (statistics.totalEarned + statistics.totalSpent || 1)) * 100).toFixed(0)}%
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                <p className="text-3xl font-bold text-success mt-1">
                  {statistics.totalEarned.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">BSK</p>
              </div>
            </div>
          </Card>

          {/* Total Spent */}
          <Card className="relative overflow-hidden p-6 border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full blur-3xl" />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
                <Badge variant="outline" className="text-xs border-destructive/30">
                  -{((statistics.totalSpent / (statistics.totalEarned + statistics.totalSpent || 1)) * 100).toFixed(0)}%
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-3xl font-bold text-destructive mt-1">
                  {statistics.totalSpent.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">BSK</p>
              </div>
            </div>
          </Card>

          {/* Net Change */}
          <Card className={cn(
            "relative overflow-hidden p-6 border-primary/20",
            statistics.netChange >= 0 
              ? "bg-gradient-to-br from-success/5 to-transparent" 
              : "bg-gradient-to-br from-destructive/5 to-transparent"
          )}>
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl",
              statistics.netChange >= 0 ? "bg-success/10" : "bg-destructive/10"
            )} />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  statistics.netChange >= 0 ? "bg-success/10" : "bg-destructive/10"
                )}>
                  <DollarSign className={cn(
                    "w-6 h-6",
                    statistics.netChange >= 0 ? "text-success" : "text-destructive"
                  )} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Change</p>
                <p className={cn(
                  'text-3xl font-bold mt-1',
                  statistics.netChange >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {statistics.netChange >= 0 ? '+' : ''}
                  {statistics.netChange.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">BSK</p>
              </div>
            </div>
          </Card>

          {/* Balance Distribution */}
          <Card className="relative overflow-hidden p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ArrowRightLeft className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Distribution</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Withdrawable:</span>
                    <span className="text-sm font-bold text-foreground">
                      {statistics.withdrawableTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Holding:</span>
                    <span className="text-sm font-bold text-foreground">
                      {statistics.holdingTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search - Enhanced Design */}
      <Card className="p-4 border-border/50">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search transactions by type, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} size="icon" variant="secondary">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={selectedBalanceType} onValueChange={handleBalanceTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Balance Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Balance Types</SelectItem>
                  <SelectItem value="withdrawable">Withdrawable</SelectItem>
                  <SelectItem value="holding">Holding</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedTransactionType} onValueChange={handleTransactionTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="transfer_in">Transfers In</SelectItem>
                  <SelectItem value="transfer_out">Transfers Out</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="loan">Loans</SelectItem>
                  <SelectItem value="referral_commission">Commissions</SelectItem>
                  <SelectItem value="badge_bonus">Badge Bonuses</SelectItem>
                  <SelectItem value="ad_reward">Ad Rewards</SelectItem>
                  <SelectItem value="admin_operation">Admin Ops</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={exportToCSV} className="gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Transactions Table - Enhanced with Expandable Rows */}
      <Card className="overflow-hidden border-border/50">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No transactions found</p>
            {(searchTerm || selectedBalanceType !== 'all' || selectedTransactionType !== 'all') && (
              <Button
                variant="link"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBalanceType('all');
                  setSelectedTransactionType('all');
                  setFilters({});
                  setPage(1);
                }}
                className="text-primary"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx, index) => {
                const Icon = getTransactionIcon(tx.transaction_type);
                const isExpanded = expandedRow === tx.id;

                return (
                  <Collapsible key={tx.id} open={isExpanded} onOpenChange={() => setExpandedRow(isExpanded ? null : tx.id)}>
                    <TableRow
                      className={cn(
                        "transition-colors",
                        "hover:bg-muted/50",
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(new Date(tx.created_at), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'HH:mm:ss')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium capitalize">
                            {tx.transaction_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-xs truncate">{tx.description}</p>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tx.transaction_subtype)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getBalanceTypeBadgeVariant(tx.balance_type)}
                          className="capitalize text-xs"
                        >
                          {tx.balance_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-bold text-base',
                          getTransactionColor(tx.amount_bsk)
                        )}>
                          {tx.amount_bsk >= 0 ? '+' : ''}
                          {tx.amount_bsk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">BSK</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/20 p-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Balance Information */}
                              {(tx.balance_before !== null || tx.balance_after !== null) && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">Balance Information</p>
                                  {tx.balance_before !== null && (
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">Before:</span>
                                      <span className="text-sm font-medium">{Number(tx.balance_before).toLocaleString(undefined, { minimumFractionDigits: 2 })} BSK</span>
                                    </div>
                                  )}
                                  {tx.balance_after !== null && (
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">After:</span>
                                      <span className="text-sm font-medium">{Number(tx.balance_after).toLocaleString(undefined, { minimumFractionDigits: 2 })} BSK</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Transaction Details */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Transaction Details</p>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">ID:</span>
                                  <span className="text-sm font-mono">{tx.id.slice(0, 8)}...</span>
                                </div>
                                {tx.source_table && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Source:</span>
                                    <span className="text-sm capitalize">{tx.source_table.replace(/_/g, ' ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Metadata - Transfer/Withdrawal/Loan specific details */}
                            {tx.metadata && Object.keys(tx.metadata).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Additional Details</p>
                                <div className="p-3 bg-background rounded border space-y-2 text-sm">
                                  {tx.metadata.transaction_ref && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Ref:</span>
                                      <span className="font-mono text-xs">{tx.metadata.transaction_ref}</span>
                                    </div>
                                  )}
                                  {tx.metadata.recipient_id && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Recipient:</span>
                                      <span className="font-mono text-xs">{tx.metadata.recipient_id}</span>
                                    </div>
                                  )}
                                  {tx.metadata.sender_id && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Sender:</span>
                                      <span className="font-mono text-xs">{tx.metadata.sender_id}</span>
                                    </div>
                                  )}
                                  {tx.metadata.withdrawal_type && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Withdrawal:</span>
                                      <span className="capitalize">{tx.metadata.withdrawal_type}</span>
                                    </div>
                                  )}
                                  {tx.metadata.bank_name && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Bank:</span>
                                      <span>{tx.metadata.bank_name}</span>
                                    </div>
                                  )}
                                  {tx.metadata.account_number && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Account:</span>
                                      <span className="font-mono">***{String(tx.metadata.account_number).slice(-4)}</span>
                                    </div>
                                  )}
                                  {tx.metadata.crypto_symbol && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Crypto:</span>
                                      <span>{tx.metadata.crypto_symbol} ({tx.metadata.crypto_network})</span>
                                    </div>
                                  )}
                                  {tx.metadata.loan_id && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Loan ID:</span>
                                      <span className="font-mono text-xs">{tx.metadata.loan_id}</span>
                                    </div>
                                  )}
                                  {tx.metadata.notes && (
                                    <div className="pt-2 border-t">
                                      <span className="text-muted-foreground font-medium">Notes:</span>
                                      <p className="mt-1">{tx.metadata.notes}</p>
                                    </div>
                                  )}
                                  {tx.metadata.admin_notes && (
                                    <div className="pt-2 border-t">
                                      <span className="text-muted-foreground font-medium">Admin Notes:</span>
                                      <p className="mt-1">{tx.metadata.admin_notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {!isLoading && transactions.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {transactions.length} of {totalCount} transactions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="text-sm">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
