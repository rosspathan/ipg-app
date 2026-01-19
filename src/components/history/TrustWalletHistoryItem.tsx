import { ArrowDownLeft, ArrowUpRight, Users, Trophy, TrendingUp, ShoppingCart, Gift, Target, Zap, Wallet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface TrustWalletTransaction {
  id: string;
  user_id: string;
  created_at: string;
  amount: number;
  balance_after: number;
  balance_type: 'withdrawable' | 'holding';
  transaction_type: string;
  transaction_subtype?: string;
  description?: string;
  sender_recipient?: string;
  transaction_id?: string;
  reference_id?: string;
  metadata?: any;
  notes?: string;
  is_credit: boolean;
  status?: 'pending' | 'completed' | 'reversed' | 'failed';
  from_user_id?: string;
  to_user_id?: string;
  transfer_category?: string;
}

interface TrustWalletHistoryItemProps {
  transaction: TrustWalletTransaction;
  onClick: () => void;
}

const getTransactionIcon = (subtype: string | undefined, isCredit: boolean) => {
  // Referral commissions (L1-L50)
  if (subtype?.includes('_commission')) return Users;
  
  // VIP & Team rewards
  if (subtype === 'vip_milestone_reward' || subtype === 'team_building_bonus') return Trophy;
  
  // Ad mining
  if (subtype === 'ad_watch_reward' || subtype === 'subscription_daily_mining') return TrendingUp;
  
  // Purchases
  if (subtype === 'purchase_bonus' || subtype === 'badge_purchase') return ShoppingCart;
  
  // Transfers
  if (subtype === 'transfer_out') return ArrowUpRight;
  if (subtype === 'transfer_in') return ArrowDownLeft;
  
  // Vesting
  if (subtype === 'vesting_release') return Zap;
  
  // Generic bonuses
  if (subtype?.includes('bonus')) return Gift;
  
  // Default based on credit/debit
  return isCredit ? ArrowDownLeft : ArrowUpRight;
};

const getTransactionColor = (isCredit: boolean) => {
  return isCredit ? 'text-success' : 'text-destructive';
};

const getTransactionBgColor = (isCredit: boolean) => {
  return isCredit ? 'bg-success/15' : 'bg-orange-500/20';
};

const getIconColor = (isCredit: boolean) => {
  return isCredit ? 'text-success' : 'text-orange-500';
};

const getBalanceTypeBadge = (balanceType: string) => {
  return balanceType === 'withdrawable' ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
      Withdrawable
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
      Holding
    </span>
  );
};

export function TrustWalletHistoryItem({ transaction, onClick }: TrustWalletHistoryItemProps) {
  const Icon = getTransactionIcon(transaction.transaction_subtype, transaction.is_credit);
  
  return (
    <div 
      className="flex items-center justify-between p-4 hover:bg-accent/5 rounded-lg cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
          getTransactionBgColor(transaction.is_credit)
        )}>
          <Icon className={cn("w-5 h-5", getIconColor(transaction.is_credit))} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-medium text-foreground truncate">
              {transaction.description}
            </p>
            {getBalanceTypeBadge(transaction.balance_type)}
          </div>
          
          {transaction.sender_recipient && (
            <p className="text-sm text-muted-foreground truncate">
              {transaction.is_credit ? 'From' : 'To'}: {transaction.sender_recipient}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">
              {format(new Date(transaction.created_at), 'MMM d, yyyy • h:mm a')}
            </p>
            {transaction.status && transaction.status !== 'completed' && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded font-medium",
                transaction.status === 'pending' && 'bg-warning/10 text-warning',
                transaction.status === 'reversed' && 'bg-muted text-muted-foreground',
                transaction.status === 'failed' && 'bg-destructive/10 text-destructive'
              )}>
                {transaction.status}
              </span>
            )}
            {transaction.transaction_subtype && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                {transaction.transaction_subtype.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right flex-shrink-0 ml-4">
        <p className={cn(
          "font-semibold text-lg",
          getTransactionColor(transaction.is_credit)
        )}>
          {transaction.is_credit ? '+' : '-'}{Math.abs(transaction.amount).toFixed(2)} BSK
        </p>
        <p className="text-xs text-muted-foreground">
          Balance: {transaction.balance_after.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
