import { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Gift,
  Users,
  Sparkles,
  ArrowRightLeft,
  Award,
  Loader2,
  Send,
  ArrowDownRight,
  Banknote,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { useUnifiedBSKHistory, UnifiedBSKTransaction } from '@/hooks/useUnifiedBSKHistory';
import { BSKHistoryEmptyState } from './BSKHistoryEmptyState';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface UnifiedBSKHistoryProps {
  userId?: string;
  className?: string;
}

interface TransactionDisplay {
  label: string;
  secondaryInfo: string;
  icon: any;
  color: string;
  bgColor: string;
}

// Truncate crypto address
const truncateAddress = (address?: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Capitalize wallet type
const capitalizeWallet = (walletType: string) => {
  return walletType.charAt(0).toUpperCase() + walletType.slice(1);
};

// Get transaction display information
const getTransactionDisplay = (tx: UnifiedBSKTransaction): TransactionDisplay => {
  const isIncoming = tx.amount > 0;
  
  // Transfer transactions
  if (tx.transaction_type === 'transfer_in') {
    const senderName = tx.metadata?.sender_display_name || tx.metadata?.sender_username || 'Unknown User';
    const fromWallet = tx.metadata?.from_wallet_type || 'withdrawable';
    const toWallet = tx.metadata?.to_wallet_type || tx.balance_type;
    
    return {
      label: 'Received from',
      secondaryInfo: `${senderName} • ${capitalizeWallet(fromWallet)} → ${capitalizeWallet(toWallet)}`,
      icon: ArrowDownRight,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    };
  }
  
  if (tx.transaction_type === 'transfer_out') {
    const recipientName = tx.metadata?.recipient_display_name || tx.metadata?.recipient_username || 'Unknown User';
    const fromWallet = tx.metadata?.from_wallet_type || tx.balance_type;
    const toWallet = tx.metadata?.to_wallet_type || 'withdrawable';
    
    return {
      label: 'Sent to',
      secondaryInfo: `${recipientName} • ${capitalizeWallet(fromWallet)} → ${capitalizeWallet(toWallet)}`,
      icon: Send,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
    };
  }
  
  // Withdrawal transactions
  if (tx.transaction_type === 'withdrawal') {
    const withdrawalType = tx.metadata?.withdrawal_type;
    const fromWallet = tx.metadata?.from_wallet_type || tx.balance_type;
    
    if (withdrawalType === 'bank') {
      const bankInfo = tx.metadata?.bank_name && tx.metadata?.account_holder_name 
        ? `${tx.metadata.bank_name} - ${tx.metadata.account_holder_name}` 
        : 'Bank Account';
      
      return {
        label: `Withdrawn from ${capitalizeWallet(fromWallet)}`,
        secondaryInfo: `To ${bankInfo}`,
        icon: Banknote,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      };
    }
    
    if (withdrawalType === 'crypto') {
      const cryptoInfo = tx.metadata?.crypto_symbol && tx.metadata?.crypto_address
        ? `${tx.metadata.crypto_symbol} (${truncateAddress(tx.metadata.crypto_address)})`
        : 'Crypto Wallet';
      
      return {
        label: `Withdrawn from ${capitalizeWallet(fromWallet)}`,
        secondaryInfo: `To ${cryptoInfo}`,
        icon: Wallet,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      };
    }
    
    return {
      label: `Withdrawn from ${capitalizeWallet(fromWallet)}`,
      secondaryInfo: tx.description,
      icon: Banknote,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    };
  }
  
  // Deposit/Credit
  if (tx.transaction_type === 'deposit' || tx.transaction_type === 'credit') {
    return {
      label: 'Deposit',
      secondaryInfo: 'Added to your account',
      icon: CreditCard,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    };
  }
  
  // Referral earnings
  if (tx.transaction_type.includes('referral')) {
    return {
      label: 'Referral Reward',
      secondaryInfo: tx.description || 'Commission earned',
      icon: Users,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    };
  }
  
  // Ad rewards
  if (tx.transaction_type.includes('ad_')) {
    return {
      label: 'Ad Reward',
      secondaryInfo: tx.description || 'Earned from viewing ads',
      icon: Sparkles,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    };
  }
  
  // Badge/Bonus
  if (tx.transaction_type.includes('badge') || tx.transaction_type.includes('bonus')) {
    return {
      label: 'Bonus Reward',
      secondaryInfo: tx.description,
      icon: Gift,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    };
  }
  
  // Staking
  if (tx.transaction_type.includes('staking')) {
    return {
      label: 'Staking Reward',
      secondaryInfo: tx.description || 'Interest earned',
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    };
  }
  
  // Internal conversion
  if (tx.transaction_type === 'holding_to_withdrawable') {
    return {
      label: 'Converted',
      secondaryInfo: 'From Holding Wallet → To Withdrawable Wallet',
      icon: ArrowRightLeft,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    };
  }

  // Loan transactions
  if (tx.transaction_type.includes('loan')) {
    return {
      label: tx.transaction_type.includes('disbursement') ? 'Loan Received' : 'Loan Payment',
      secondaryInfo: tx.description,
      icon: Wallet,
      color: tx.amount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400',
      bgColor: tx.amount > 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-orange-50 dark:bg-orange-950/30',
    };
  }
  
  // Default fallback
  return {
    label: tx.transaction_type.replace(/_/g, ' '),
    secondaryInfo: tx.description,
    icon: DollarSign,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950/30',
  };
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
  const [selectedBalanceType, setSelectedBalanceType] = useState<string>('all');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('all');
  const [transactionDirection, setTransactionDirection] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(false);

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

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleDirectionFilter = (value: string) => {
    setTransactionDirection(value);
    if (value === 'incoming') {
      setFilters({ ...filters, minAmount: 0.01 });
    } else if (value === 'outgoing') {
      setFilters({ ...filters, maxAmount: -0.01 });
    } else {
      const { minAmount, maxAmount, ...rest } = filters;
      setFilters(rest);
    }
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
      {/* Statistics Overview */}
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

      {/* Filters and Search */}
      <Card className="p-4 border-border/50">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search transactions..."
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
              <Select value={transactionDirection} onValueChange={handleDirectionFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="incoming">💰 Incoming</SelectItem>
                  <SelectItem value="outgoing">📤 Outgoing</SelectItem>
                </SelectContent>
              </Select>

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
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="referral_commission">Referrals</SelectItem>
                  <SelectItem value="ad_reward">Ad Rewards</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={exportToCSV} className="gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Transactions Display */}
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
                  setTransactionDirection('all');
                  setFilters({});
                  setPage(1);
                }}
                className="text-primary"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : isMobile ? (
          // Mobile Card View
          <div className="space-y-3 p-4">
            {transactions.map(tx => {
              const displayInfo = getTransactionDisplay(tx);
              const IconComponent = displayInfo.icon;
              
              return (
                <Card key={tx.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", displayInfo.bgColor)}>
                      <IconComponent className={cn("w-6 h-6", displayInfo.color)} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-semibold text-sm">{displayInfo.label}</p>
                        <p className={cn("text-lg font-bold", tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <p className="text-xs text-muted-foreground truncate mb-2">{displayInfo.secondaryInfo}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM dd, hh:mm a')}
                        </span>
                        <Badge variant={tx.balance_type === 'withdrawable' ? 'default' : 'secondary'} className="text-xs">
                          {tx.balance_type === 'withdrawable' ? '💰 Withdrawable' : '🔒 Holding'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          // Desktop Table View
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-14"></TableHead>
                <TableHead>Type & Details</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status & Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const displayInfo = getTransactionDisplay(tx);
                const IconComponent = displayInfo.icon;

                return (
                  <TableRow key={tx.id} className="hover:bg-muted/30">
                    {/* Icon Column */}
                    <TableCell className="w-14">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", displayInfo.bgColor)}>
                        <IconComponent className={cn("w-5 h-5", displayInfo.color)} />
                      </div>
                    </TableCell>
                    
                    {/* Type & Details Column */}
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{displayInfo.label}</p>
                        <p className="text-xs text-muted-foreground">{displayInfo.secondaryInfo}</p>
                      </div>
                    </TableCell>
                    
                    {/* Date & Time Column */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{format(new Date(tx.created_at), 'MMM dd, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'hh:mm a')}</p>
                      </div>
                    </TableCell>
                    
                    {/* Amount Column */}
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <p className={cn(
                          "text-lg font-bold",
                          tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">BSK</p>
                      </div>
                    </TableCell>
                    
                    {/* Status & Balance Type Column */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={tx.balance_type === 'withdrawable' ? 'default' : 'secondary'} className="text-xs">
                          {tx.balance_type === 'withdrawable' ? '💰 Withdrawable' : '🔒 Holding'}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
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
