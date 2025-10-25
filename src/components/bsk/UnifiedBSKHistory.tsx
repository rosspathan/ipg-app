import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    case 'badge_bonus':
    case 'badge_purchase':
      return Award;
    case 'referral_commission':
    case 'referral_bonus':
      return Users;
    case 'insurance_claim':
      return Shield;
    case 'staking_reward':
    case 'ad_reward':
      return Sparkles;
    case 'promotion_bonus':
    case 'admin_credit':
      return Gift;
    case 'withdrawal':
    case 'transfer_out':
      return TrendingDown;
    case 'holding_to_withdrawable':
      return ArrowRightLeft;
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

export function UnifiedBSKHistory({ userId, className }: UnifiedBSKHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBalanceType, setSelectedBalanceType] = useState<string>('all');
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

  // Show empty state if no transactions and not loading
  if (!isLoading && transactions.length === 0 && !searchTerm && selectedBalanceType === 'all') {
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

      {/* Filters and Search - Modern Design */}
      <Card className="p-4 border-border/50">
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

          <div className="flex gap-2">
            <Select value={selectedBalanceType} onValueChange={handleBalanceTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Balance Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="withdrawable">Withdrawable</SelectItem>
                <SelectItem value="holding">Holding</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>

            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Transactions Table - Enhanced Design */}
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
            {(searchTerm || selectedBalanceType !== 'all') && (
              <Button
                variant="link"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBalanceType('all');
                  setFilters({});
                  setPage(1);
                }}
                className="text-primary"
              >
                Clear filters
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
                <TableHead>Balance Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx, index) => {
                const Icon = getTransactionIcon(tx.transaction_type);
                const isExpanded = expandedRow === tx.id;

                return (
                  <>
                    <TableRow
                      key={tx.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        "hover:bg-muted/50",
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      )}
                      onClick={() => setExpandedRow(isExpanded ? null : tx.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(new Date(tx.created_at), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'HH:mm')}
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
                        <div className="max-w-xs">
                          <p className="text-sm truncate">{tx.description}</p>
                          {tx.transaction_subtype && (
                            <p className="text-xs text-muted-foreground truncate">
                              {tx.transaction_subtype}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getBalanceTypeBadgeVariant(tx.balance_type)}
                          className="capitalize"
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
                          {tx.amount_bsk.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">BSK</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-sm text-muted-foreground">
                            {tx.balance_after?.toLocaleString() || '-'}
                          </span>
                          <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/20 p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase">
                                Transaction Details
                              </p>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Transaction ID:</span>
                                  <span className="text-sm font-mono">{tx.id.slice(0, 8)}...</span>
                                </div>
                                {tx.reference_id && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Reference ID:</span>
                                    <span className="text-sm font-mono">{tx.reference_id.slice(0, 8)}...</span>
                                  </div>
                                )}
                                {tx.balance_before !== null && tx.balance_before !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Balance Before:</span>
                                    <span className="text-sm font-semibold">
                                      {tx.balance_before.toLocaleString()} BSK
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Source:</span>
                                  <span className="text-sm capitalize">
                                    {tx.source_table.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {tx.metadata && Object.keys(tx.metadata).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">
                                  Additional Information
                                </p>
                                <div className="p-3 bg-background/50 rounded-lg border border-border/50 max-h-32 overflow-auto">
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                                    {JSON.stringify(tx.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination - Enhanced Design */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold">{((page - 1) * 20) + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(page * 20, totalCount)}</span> of{' '}
              <span className="font-semibold">{totalCount}</span> transactions
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1 px-3">
                <span className="text-sm font-medium">Page {page}</span>
                <span className="text-sm text-muted-foreground">of {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="gap-2"
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