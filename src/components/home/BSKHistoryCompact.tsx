import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowDownRight,
  Send,
  Banknote,
  Wallet,
  CreditCard,
  Users,
  Sparkles,
  Gift,
  TrendingUp,
  ArrowRightLeft,
  DollarSign,
  ChevronRight,
  History,
} from 'lucide-react';
import { useUnifiedBSKHistory, UnifiedBSKTransaction } from '@/hooks/useUnifiedBSKHistory';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface BSKHistoryCompactProps {
  userId?: string;
  className?: string;
}

const getTransactionIcon = (tx: UnifiedBSKTransaction) => {
  if (tx.transaction_type === 'transfer_in') return ArrowDownRight;
  if (tx.transaction_type === 'transfer_out') return Send;
  if (tx.transaction_type === 'withdrawal') return Banknote;
  if (tx.transaction_type === 'deposit' || tx.transaction_type === 'credit') return CreditCard;
  if (tx.transaction_type.includes('referral')) return Users;
  if (tx.transaction_type.includes('ad_')) return Sparkles;
  if (tx.transaction_type.includes('badge') || tx.transaction_type.includes('bonus')) return Gift;
  if (tx.transaction_type.includes('staking')) return TrendingUp;
  if (tx.transaction_type === 'holding_to_withdrawable') return ArrowRightLeft;
  if (tx.transaction_type.includes('loan')) return Wallet;
  return DollarSign;
};

const getTransactionTitle = (tx: UnifiedBSKTransaction): string => {
  if (tx.transaction_type === 'transfer_in') {
    return tx.metadata?.sender_display_name || tx.metadata?.sender_username || 'Received Transfer';
  }
  if (tx.transaction_type === 'transfer_out') {
    return tx.metadata?.recipient_display_name || tx.metadata?.recipient_username || 'Sent Transfer';
  }
  if (tx.transaction_type === 'withdrawal') return 'Withdrawal';
  if (tx.transaction_type === 'deposit') return 'Deposit';
  if (tx.transaction_type.includes('referral')) return 'Referral Reward';
  if (tx.transaction_type.includes('ad_')) return 'Ad Reward';
  if (tx.transaction_type.includes('badge')) return 'Badge Reward';
  if (tx.transaction_type.includes('bonus')) return 'Bonus';
  if (tx.transaction_type.includes('staking')) return 'Staking Reward';
  if (tx.transaction_type === 'holding_to_withdrawable') return 'Wallet Conversion';
  if (tx.transaction_type.includes('loan')) return tx.transaction_type.includes('disbursement') ? 'Loan Received' : 'Loan Payment';
  return tx.transaction_type.replace(/_/g, ' ');
};

const getTransactionSubtitle = (tx: UnifiedBSKTransaction): string => {
  if (tx.transaction_type === 'transfer_in' || tx.transaction_type === 'transfer_out') {
    const fromWallet = tx.metadata?.from_wallet_type || 'withdrawable';
    const toWallet = tx.metadata?.to_wallet_type || tx.balance_type;
    return `${fromWallet} → ${toWallet}`;
  }
  return tx.description.length > 40 ? tx.description.slice(0, 40) + '...' : tx.description;
};

export function BSKHistoryCompact({ userId, className }: BSKHistoryCompactProps) {
  const navigate = useNavigate();
  const { transactions, isLoading } = useUnifiedBSKHistory(userId, {});

  const recentTransactions = transactions.slice(0, 8);

  if (isLoading) {
    return (
      <div className={cn('px-4', className)}>
        <div className="rounded-3xl border border-border/40 bg-card/30 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold">Recent Activity</h3>
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recentTransactions.length === 0) {
    return (
      <div className={cn('px-4', className)}>
        <div className="rounded-3xl border border-border/40 bg-card/30 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold">Recent Activity</h3>
            </div>
          </div>
          <div className="py-8 text-center">
            <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Your BSK activity will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('px-4', className)}>
      <div className="rounded-3xl border border-border/40 bg-card/30 backdrop-blur-xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold">Recent Activity</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/wallet/history')}
            className="h-8 text-xs"
          >
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Transaction List */}
        <div className="space-y-2">
          {recentTransactions.map((tx) => {
            const Icon = getTransactionIcon(tx);
            const isPositive = tx.amount_bsk > 0;
            
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate('/app/wallet/history')}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    isPositive
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getTransactionTitle(tx)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getTransactionSubtitle(tx)}
                  </p>
                </div>

                {/* Amount & Time */}
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      isPositive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {tx.amount_bsk.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Button */}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => navigate('/app/wallet/history')}
        >
          View Full History
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
