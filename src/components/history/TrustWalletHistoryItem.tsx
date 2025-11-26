import { ArrowDownLeft, ArrowUpRight, Gift, Target, Trophy, Users, Wallet, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export interface TrustWalletTransaction {
  id: string;
  created_at: string;
  amount: number;
  transaction_type: string;
  balance_type: 'withdrawable' | 'holding';
  description: string;
  metadata?: Record<string, any>;
  balance_after?: number;
}

interface TrustWalletHistoryItemProps {
  transaction: TrustWalletTransaction;
  onClick: () => void;
}

const getTransactionIcon = (type: string, amount: number) => {
  if (amount > 0) {
    switch (type) {
      case 'referral_commission':
        return <Users className="w-5 h-5" />;
      case 'staking_reward':
        return <Zap className="w-5 h-5" />;
      case 'program_reward':
        return <Trophy className="w-5 h-5" />;
      case 'bonus':
        return <Gift className="w-5 h-5" />;
      default:
        return <ArrowDownLeft className="w-5 h-5" />;
    }
  } else {
    return <ArrowUpRight className="w-5 h-5" />;
  }
};

const getTransactionColor = (amount: number) => {
  return amount > 0 ? 'text-green-500' : 'text-red-500';
};

const getTransactionBgColor = (amount: number) => {
  return amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10';
};

const formatTransactionType = (type: string): string => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function TrustWalletHistoryItem({ transaction, onClick }: TrustWalletHistoryItemProps) {
  const isCredit = transaction.amount > 0;
  const icon = getTransactionIcon(transaction.transaction_type, transaction.amount);
  const colorClass = getTransactionColor(transaction.amount);
  const bgColorClass = getTransactionBgColor(transaction.amount);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-4 hover:bg-accent/50 cursor-pointer transition-colors"
    >
      {/* Icon */}
      <div className={cn("p-2 rounded-full", bgColorClass, colorClass)}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">
            {transaction.description || formatTransactionType(transaction.transaction_type)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="capitalize">{transaction.balance_type}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p className={cn("font-semibold", colorClass)}>
          {isCredit ? '+' : ''}{transaction.amount.toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground">BSK</p>
      </div>
    </div>
  );
}
