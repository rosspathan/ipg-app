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
} from 'lucide-react';
import { useUnifiedBSKHistory } from '@/hooks/useUnifiedBSKHistory';
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
const getTransactionColor = (amount: number, type: string) => {
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-success">
                  {statistics.totalEarned.toLocaleString()} BSK
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-destructive">
                  {statistics.totalSpent.toLocaleString()} BSK
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Net Change</p>
                <p className={cn(
                  'text-2xl font-bold',
                  statistics.netChange >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {statistics.netChange >= 0 ? '+' : ''}
                  {statistics.netChange.toLocaleString()} BSK
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Balance Distribution</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs">Withdrawable:</span>
                  <span className="text-xs font-semibold">
                    {statistics.withdrawableTotal.toLocaleString()} BSK
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs">Holding:</span>
                  <span className="text-xs font-semibold">
                    {statistics.holdingTotal.toLocaleString()} BSK
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} size="icon">
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

            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Balance Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const Icon = getTransactionIcon(tx.transaction_type);
                const isExpanded = expandedRow === tx.id;

                return (
                  <>
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedRow(isExpanded ? null : tx.id)}
                    >
                      <TableCell>
                        {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{tx.transaction_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{tx.description}</p>
                          {tx.transaction_subtype && (
                            <p className="text-xs text-muted-foreground">
                              {tx.transaction_subtype}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBalanceTypeBadgeVariant(tx.balance_type)}>
                          {tx.balance_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-semibold',
                          getTransactionColor(tx.amount_bsk, tx.transaction_type)
                        )}>
                          {tx.amount_bsk >= 0 ? '+' : ''}
                          {tx.amount_bsk.toLocaleString()} BSK
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {tx.balance_after?.toLocaleString() || '-'}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold">Transaction ID:</span> {tx.id}
                            </p>
                            {tx.reference_id && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold">Reference ID:</span>{' '}
                                {tx.reference_id}
                              </p>
                            )}
                            {tx.balance_before !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold">Balance Before:</span>{' '}
                                {tx.balance_before.toLocaleString()} BSK
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold">Source:</span> {tx.source_table}
                            </p>
                            {tx.metadata && Object.keys(tx.metadata).length > 0 && (
                              <details className="text-xs">
                                <summary className="cursor-pointer font-semibold text-muted-foreground">
                                  Additional Details
                                </summary>
                                <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto">
                                  {JSON.stringify(tx.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of{' '}
              {totalCount} transactions
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
