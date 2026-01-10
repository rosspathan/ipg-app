import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, ExternalLink, ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CryptoTransaction } from '@/hooks/useCryptoTransactionHistory';
import AssetLogo from '@/components/AssetLogo';
import { cn } from '@/lib/utils';

interface CryptoTransactionDetailSheetProps {
  transaction: CryptoTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'completed':
    case 'credited':
      return { icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10', label: 'Completed' };
    case 'pending':
    case 'confirming':
    case 'processing':
      return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending' };
    case 'failed':
    case 'rejected':
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' };
    default:
      return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: status };
  }
};

const formatAddress = (address: string | null) => {
  if (!address) return '';
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
};

const getBscScanUrl = (txHash: string | null, network: string | null) => {
  if (!txHash) return null;
  // Internal transfers have transaction_ref which is not a blockchain tx
  if (!txHash.startsWith('0x')) return null;
  
  if (network?.toLowerCase().includes('bsc') || network?.toLowerCase().includes('bep')) {
    return `https://bscscan.com/tx/${txHash}`;
  }
  return `https://etherscan.io/tx/${txHash}`;
};

export function CryptoTransactionDetailSheet({ transaction, open, onOpenChange }: CryptoTransactionDetailSheetProps) {
  if (!transaction) return null;

  const isIncoming = transaction.transaction_type === 'deposit' || transaction.transaction_type === 'transfer_in';
  const isTransfer = transaction.transaction_type === 'transfer_in' || transaction.transaction_type === 'transfer_out';
  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;
  const explorerUrl = getBscScanUrl(transaction.tx_hash, transaction.network);

  const copyToClipboard = (text: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} to clipboard`);
  };

  const getTypeLabel = () => {
    switch (transaction.transaction_type) {
      case 'deposit': return 'Deposit';
      case 'withdrawal': return 'Withdrawal';
      case 'transfer_in': return 'Received';
      case 'transfer_out': return 'Sent';
      default: return 'Transaction';
    }
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
                <AssetLogo symbol={transaction.symbol} logoUrl={transaction.logo_url} size="lg" />
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background",
                  isIncoming ? "bg-primary" : "bg-orange-500"
                )}>
                  {isIncoming 
                    ? <ArrowDownLeft className="w-3.5 h-3.5 text-primary-foreground" />
                    : <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                  }
                </div>
              </div>
            </div>
            
            <p className={cn(
              "text-4xl font-bold",
              isIncoming ? "text-primary" : "text-foreground"
            )}>
              {isIncoming ? '+' : '-'}{transaction.amount.toFixed(transaction.amount < 1 ? 6 : 2)}
            </p>
            <p className="text-lg text-muted-foreground mt-1">{transaction.symbol}</p>
            
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge className={cn(statusConfig.bg, statusConfig.color, "border-0")}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <DetailRow label="Type" value={getTypeLabel()} />
            
            {/* For internal transfers - show counterparty */}
            {isTransfer && transaction.counterparty && (
              <DetailRow 
                label={transaction.transaction_type === 'transfer_in' ? 'From' : 'To'} 
                value={transaction.counterparty}
              />
            )}

            {/* For on-chain - show addresses */}
            {!isTransfer && transaction.to_address && (
              <DetailRow 
                label="To Address" 
                value={
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{formatAddress(transaction.to_address)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(transaction.to_address!, 'Address copied')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                }
              />
            )}

            <DetailRow 
              label="Date & Time" 
              value={format(new Date(transaction.created_at), 'PPpp')} 
            />

            <DetailRow label="Network" value={transaction.network || 'BEP20 (BSC)'} />

            <DetailRow label="Asset" value={`${transaction.asset_name} (${transaction.symbol})`} />

            {transaction.fee && transaction.fee > 0 && (
              <DetailRow label="Fee" value={`${transaction.fee} ${transaction.symbol}`} />
            )}

            {/* Confirmation status for deposits */}
            {transaction.transaction_type === 'deposit' && transaction.confirmations !== null && (
              <DetailRow 
                label="Confirmations" 
                value={`${transaction.confirmations}/${transaction.required_confirmations}`} 
              />
            )}

            {/* Transaction Hash/ID - only for on-chain transactions */}
            {transaction.tx_hash && (
              <DetailRow 
                label="Transaction ID" 
                value={
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs truncate max-w-[160px]">
                      {formatAddress(transaction.tx_hash)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(transaction.tx_hash!, 'Transaction ID copied')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                }
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            {transaction.tx_hash && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(transaction.tx_hash!, 'Transaction ID copied')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Transaction ID
              </Button>
            )}
            
            {/* View on Explorer - only for on-chain transactions */}
            {explorerUrl && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(explorerUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Explorer
              </Button>
            )}
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast.info('Receipt download coming soon');
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
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
