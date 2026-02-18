import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useInternalTransferHistory } from '@/hooks/useInternalTransferHistory';
import { useQueryClient } from '@tanstack/react-query';

const statusColors: Record<string, string> = {
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  failed: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export default function InternalTransferHistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: transfers, isLoading } = useInternalTransferHistory();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-semibold flex-1">Internal Transfer History</h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['internal-transfer-history'] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <p className="px-4 pb-2 text-xs text-muted-foreground">
          On-Chain ↔ Trading balance transfers only
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !transfers?.length ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-sm text-muted-foreground">No internal transfers yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/wallet/transfer')}
              className="text-xs"
            >
              Make a Transfer
            </Button>
          </div>
        ) : (
          transfers.map((tx) => {
            const isToTrading = tx.direction === 'to_trading';
            return (
              <div
                key={tx.id}
                className="bg-muted/30 rounded-lg border border-border/50 p-3 space-y-2"
              >
                {/* Top row: direction + status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded-full",
                      isToTrading ? "bg-emerald-500/20" : "bg-blue-500/20"
                    )}>
                      {isToTrading
                        ? <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
                        : <ArrowUpFromLine className="h-4 w-4 text-blue-400" />
                      }
                    </div>
                    <div>
                      <div className="text-xs font-medium">
                        {isToTrading ? 'On-Chain → Trading' : 'Trading → On-Chain'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {tx.asset_symbol}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusColors[tx.status])}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </Badge>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="font-mono text-sm font-medium">
                    {Number(tx.amount).toFixed(6)} {tx.asset_symbol}
                  </span>
                </div>

                {/* Fee (if > 0) */}
                {tx.fee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Fee</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {Number(tx.fee).toFixed(6)} {tx.asset_symbol}
                    </span>
                  </div>
                )}

                {/* Balance After */}
                {tx.balance_after != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Balance After</span>
                    <span className="font-mono text-xs text-foreground">
                      {Number(tx.balance_after).toFixed(6)} {tx.asset_symbol}
                    </span>
                  </div>
                )}

                {/* Reference ID */}
                {tx.reference_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ref ID</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {tx.reference_id}
                    </span>
                  </div>
                )}

                {/* TX Hash */}
                {tx.tx_hash && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">TX Hash</span>
                    <a
                      href={`https://bscscan.com/tx/${tx.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-primary hover:underline"
                    >
                      {tx.tx_hash.slice(0, 10)}...{tx.tx_hash.slice(-6)}
                    </a>
                  </div>
                )}

                {/* Timestamp */}
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm:ss')}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {tx.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
