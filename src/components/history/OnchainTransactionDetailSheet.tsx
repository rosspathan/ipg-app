import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, ExternalLink, ArrowUpRight, ArrowDownLeft, RefreshCw,
  CheckCircle2, Clock, XCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { OnchainTransaction } from '@/hooks/useOnchainTransactionHistory';
import AssetLogo from '@/components/AssetLogo';
import { cn } from '@/lib/utils';

interface OnchainTransactionDetailSheetProps {
  transaction: OnchainTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return { icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10', label: 'Confirmed' };
    case 'PENDING':
    case 'CONFIRMING':
      return { icon: Loader2, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending', animate: true };
    case 'FAILED':
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' };
    case 'DROPPED':
      return { icon: AlertTriangle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Dropped' };
    default:
      return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: status };
  }
};

const formatAddress = (address: string | null) => {
  if (!address) return '';
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
};

export function OnchainTransactionDetailSheet({ 
  transaction, 
  open, 
  onOpenChange 
}: OnchainTransactionDetailSheetProps) {
  if (!transaction) return null;

  const tx = transaction;
  const isIncoming = tx.direction === 'RECEIVE';
  const isSelf = tx.direction === 'SELF';
  const statusConfig = getStatusConfig(tx.status);
  const StatusIcon = statusConfig.icon;
  
  const explorerUrl = `https://bscscan.com/tx/${tx.tx_hash}`;

  const copyToClipboard = (text: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} to clipboard`);
  };

  const getDirectionLabel = () => {
    if (isSelf) return 'Self Transfer';
    return isIncoming ? 'Received' : 'Sent';
  };

  const getDirectionIcon = () => {
    if (isSelf) return <RefreshCw className="w-3.5 h-3.5 text-white" />;
    return isIncoming 
      ? <ArrowDownLeft className="w-3.5 h-3.5 text-primary-foreground" />
      : <ArrowUpRight className="w-3.5 h-3.5 text-white" />;
  };

  const getDirectionColor = () => {
    if (isSelf) return 'bg-blue-500';
    return isIncoming ? 'bg-primary' : 'bg-orange-500';
  };

  const formatAmount = () => {
    const amount = tx.amount_formatted;
    return amount < 1 ? amount.toFixed(6) : amount.toFixed(2);
  };

  const getAmountPrefix = () => {
    if (isSelf) return '↺ ';
    return isIncoming ? '+' : '-';
  };

  const getAmountColor = () => {
    if (tx.status === 'FAILED' || tx.status === 'DROPPED') {
      return 'text-muted-foreground';
    }
    return isIncoming ? 'text-primary' : 'text-foreground';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center">Transaction Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Asset & Amount Section */}
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <AssetLogo 
                  symbol={tx.token_symbol} 
                  logoUrl={tx.token_logo_url} 
                  size="lg" 
                />
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background",
                  getDirectionColor()
                )}>
                  {getDirectionIcon()}
                </div>
              </div>
            </div>
            
            <p className={cn("text-4xl font-bold", getAmountColor())}>
              {getAmountPrefix()}{formatAmount()}
            </p>
            <p className="text-lg text-muted-foreground mt-1">{tx.token_symbol}</p>
            
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge className={cn(statusConfig.bg, statusConfig.color, "border-0")}>
                <StatusIcon className={cn("w-3 h-3 mr-1", statusConfig.animate && "animate-spin")} />
                {statusConfig.label}
              </Badge>
            </div>

            {/* Error message if failed */}
            {tx.error_message && (
              <p className="text-sm text-destructive mt-2 px-4">
                {tx.error_message}
              </p>
            )}
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <DetailRow label="Type" value={getDirectionLabel()} />
            
            <DetailRow 
              label={isIncoming ? 'From' : 'To'} 
              value={
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{formatAddress(tx.counterparty_address)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(tx.counterparty_address, 'Address copied')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              }
            />

            <DetailRow 
              label="Date & Time" 
              value={format(new Date(tx.created_at), 'PPpp')} 
            />

            <DetailRow label="Network" value="BNB Smart Chain (BSC)" />

            <DetailRow 
              label="Token" 
              value={tx.token_name ? `${tx.token_name} (${tx.token_symbol})` : tx.token_symbol} 
            />

            <DetailRow label="Amount" value={`${formatAmount()} ${tx.token_symbol}`} />

            {/* Gas Fee */}
            {tx.gas_fee_formatted && tx.gas_fee_formatted > 0 && (
              <DetailRow 
                label="Network Fee" 
                value={`${tx.gas_fee_formatted.toFixed(6)} BNB`} 
              />
            )}

            {/* Confirmations */}
            {(tx.status === 'PENDING' || tx.status === 'CONFIRMING') && (
              <DetailRow 
                label="Confirmations" 
                value={`${tx.confirmations}/${tx.required_confirmations}`} 
              />
            )}

            {/* Block Number */}
            {tx.block_number && (
              <DetailRow label="Block" value={tx.block_number.toLocaleString()} />
            )}

            {/* Transaction Hash */}
            <DetailRow 
              label="Transaction Hash" 
              value={
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs truncate max-w-[160px]">
                    {formatAddress(tx.tx_hash)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(tx.tx_hash, 'Hash copied')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              }
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => copyToClipboard(tx.tx_hash, 'Transaction hash copied')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Transaction Hash
            </Button>
            
            <Button
              variant="default"
              className="w-full"
              onClick={() => window.open(explorerUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on BscScan
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
