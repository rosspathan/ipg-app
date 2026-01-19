import { ArrowDownLeft, ArrowUpRight, RefreshCw, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { OnchainTransaction } from '@/hooks/useOnchainTransactionHistory';
import AssetLogo from '@/components/AssetLogo';
import { motion } from 'framer-motion';

interface OnchainTransactionItemProps {
  tx: OnchainTransaction;
  onClick: () => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return { icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10', label: 'Confirmed' };
    case 'PENDING':
    case 'CONFIRMING':
      return { icon: Loader2, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending', animate: true };
    case 'FAILED':
    case 'DROPPED':
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' };
    default:
      return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: status };
  }
};

const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function OnchainTransactionItem({ tx, onClick }: OnchainTransactionItemProps) {
  const statusConfig = getStatusConfig(tx.status);
  const StatusIcon = statusConfig.icon;
  
  const isIncoming = tx.direction === 'RECEIVE';
  const isSelf = tx.direction === 'SELF';
  const isPending = tx.status === 'PENDING' || tx.status === 'CONFIRMING';
  const isFailed = tx.status === 'FAILED' || tx.status === 'DROPPED';

  const getDirectionLabel = () => {
    if (isSelf) return 'Self Transfer';
    return isIncoming ? 'Received' : 'Sent';
  };

  const getDirectionIcon = () => {
    if (isSelf) return <RefreshCw className="w-2.5 h-2.5 text-white" />;
    return isIncoming 
      ? <ArrowDownLeft className="w-2.5 h-2.5 text-primary-foreground" />
      : <ArrowUpRight className="w-2.5 h-2.5 text-white" />;
  };

  const getDirectionColor = () => {
    if (isFailed) return 'bg-muted';
    if (isPending) return 'bg-amber-500';
    if (isSelf) return 'bg-blue-500';
    return isIncoming ? 'bg-primary' : 'bg-orange-500';
  };

  const getAmountColor = () => {
    if (isFailed) return 'text-muted-foreground line-through';
    if (isPending) return 'text-amber-500';
    return isIncoming ? 'text-primary' : 'text-foreground';
  };

  const formatAmount = () => {
    const amount = tx.amount_formatted;
    const formatted = amount < 1 ? amount.toFixed(6) : amount.toFixed(2);
    const prefix = isSelf ? '↺ ' : (isIncoming ? '+' : '-');
    return `${prefix}${formatted}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="group"
    >
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer rounded-xl"
        onClick={onClick}
      >
        {/* Token Icon with Direction Badge */}
        <div className="relative flex-shrink-0">
          <AssetLogo 
            symbol={tx.token_symbol} 
            logoUrl={tx.token_logo_url} 
            size="md" 
          />
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-background",
            getDirectionColor()
          )}>
            {getDirectionIcon()}
          </div>
        </div>
        
        {/* Transaction Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{getDirectionLabel()}</span>
            {/* Show status badge for non-confirmed transactions */}
            {tx.status !== 'CONFIRMED' && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4", 
                  statusConfig.color, 
                  "border-current"
                )}
              >
                {statusConfig.animate && <Loader2 className="w-2 h-2 mr-1 animate-spin" />}
                {statusConfig.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {isSelf ? 'Your wallet' : (
              isIncoming 
                ? `From ${formatAddress(tx.counterparty_address)}`
                : `To ${formatAddress(tx.counterparty_address)}`
            )}
          </p>
        </div>

        {/* Amount & Time */}
        <div className="text-right flex-shrink-0">
          <p className={cn("font-semibold text-sm", getAmountColor())}>
            {formatAmount()} {tx.token_symbol}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
