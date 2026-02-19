import React from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import type { RecentTrade } from '@/hooks/useRecentTrades';

interface RecentTradesTickerProps {
  trades: RecentTrade[];
  quoteCurrency?: string;
  onPriceClick?: (price: number) => void;
  isLoading?: boolean;
}

const formatPrice = (price: number) => {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
};

const formatQty = (qty: number) => {
  if (qty >= 10_000) return `${(qty / 1_000).toFixed(1)}K`;
  if (qty >= 100) return qty.toFixed(2);
  return qty.toFixed(3);
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

export const RecentTradesTicker: React.FC<RecentTradesTickerProps> = ({
  trades,
  quoteCurrency = 'USDT',
  onPriceClick,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground">
        Loading trades...
      </div>
    );
  }

  return (
    <div className="py-1">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 pb-1">
        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
          Recent Trades
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid px-2 pb-0.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium"
        style={{ gridTemplateColumns: '38% 32% 30%' }}
      >
        <span>Price ({quoteCurrency})</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trades */}
      <div>
        {trades.length > 0 ? (
          trades.map((trade, idx) => {
            const isBuy = trade.side === 'buy';
            return (
              <div
                key={trade.id || idx}
                onClick={() => onPriceClick?.(trade.price)}
                className="grid items-center px-2 h-[17px] cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors duration-75"
                style={{ gridTemplateColumns: '38% 32% 30%' }}
              >
                <span
                  className={cn(
                    "text-[11px] font-mono tabular-nums",
                    isBuy ? "text-success" : "text-danger"
                  )}
                >
                  {formatPrice(trade.price)}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground text-right tabular-nums">
                  {formatQty(trade.quantity)}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground text-right tabular-nums">
                  {formatTime(trade.trade_time)}
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-[40px] text-[9px] text-muted-foreground">
            Waiting for first trade...
          </div>
        )}
      </div>
    </div>
  );
};
