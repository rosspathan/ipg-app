import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { OrderBookSkeleton } from './OrderBookSkeleton';

interface OrderBookEntry {
  price: number;
  quantity: number;
  total?: number;
}

interface OrderBookPremiumProps {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  currentPrice: number;
  priceChange?: number;
  quoteCurrency?: string;
  baseCurrency?: string;
  onPriceClick?: (price: number) => void;
  isLoading?: boolean;
  marketPrice?: number;
}

const PremiumRow = memo(({
  entry,
  side,
  maxTotal,
  onPriceClick,
  formatPrice,
  formatQty,
  cumTotal,
}: {
  entry: OrderBookEntry;
  side: 'ask' | 'bid';
  maxTotal: number;
  onPriceClick?: (price: number) => void;
  formatPrice: (p: number) => string;
  formatQty: (q: number) => string;
  cumTotal: number;
}) => {
  const isAsk = side === 'ask';
  const depthPercent = maxTotal > 0 ? (cumTotal / maxTotal) * 100 : 0;

  return (
    <div
      onClick={() => onPriceClick?.(entry.price)}
      className={cn(
        "relative flex items-center px-2.5 py-[3px] cursor-pointer",
        "transition-colors duration-100 group",
        isAsk ? "hover:bg-red-500/8" : "hover:bg-emerald-500/8"
      )}
    >
      {/* Depth bar background */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 transition-all duration-500 ease-out",
          isAsk ? "bg-red-500/8" : "bg-emerald-500/8"
        )}
        style={{ width: `${Math.min(depthPercent, 100)}%` }}
      />

      {/* Price */}
      <span className={cn(
        "relative w-[38%] text-[10px] sm:text-xs font-mono font-medium z-10 tabular-nums text-left truncate",
        "group-hover:brightness-125 transition-all",
        isAsk ? "text-red-400" : "text-emerald-400"
      )}>
        {formatPrice(entry.price)}
      </span>

      {/* Quantity */}
      <span className="relative w-[32%] text-[10px] sm:text-xs font-mono text-muted-foreground text-right z-10 tabular-nums truncate">
        {formatQty(entry.quantity)}
      </span>

      {/* Cumulative Total */}
      <span className="relative w-[30%] text-[10px] sm:text-xs font-mono text-muted-foreground/70 text-right z-10 tabular-nums truncate">
        {formatQty(cumTotal)}
      </span>
    </div>
  );
});

PremiumRow.displayName = 'PremiumRow';

export const OrderBookPremium: React.FC<OrderBookPremiumProps> = ({
  asks,
  bids,
  currentPrice,
  priceChange = 0,
  quoteCurrency = 'USDT',
  baseCurrency = '',
  onPriceClick,
  isLoading = false,
  marketPrice,
}) => {
  // Display up to 8 levels, asks reversed so lowest ask is nearest spread
  const displayAsks = useMemo(() => asks.slice(0, 8).reverse(), [asks]);
  const displayBids = useMemo(() => bids.slice(0, 8), [bids]);

  // Compute cumulative totals for depth bars
  const askCumTotals = useMemo(() => {
    const totals: number[] = [];
    let cum = 0;
    // Accumulate from lowest ask (bottom) to highest (top)
    for (let i = displayAsks.length - 1; i >= 0; i--) {
      cum += displayAsks[i].quantity;
      totals[i] = cum;
    }
    return totals;
  }, [displayAsks]);

  const bidCumTotals = useMemo(() => {
    const totals: number[] = [];
    let cum = 0;
    for (let i = 0; i < displayBids.length; i++) {
      cum += displayBids[i].quantity;
      totals[i] = cum;
    }
    return totals;
  }, [displayBids]);

  const maxAskCum = askCumTotals.length > 0 ? Math.max(...askCumTotals) : 1;
  const maxBidCum = bidCumTotals.length > 0 ? Math.max(...bidCumTotals) : 1;
  const maxCum = Math.max(maxAskCum, maxBidCum); // Use unified scale for visual comparison

  const formatPrice = (price: number) => {
    if (price >= 100) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  };
  const formatQty = (qty: number) => {
    if (qty >= 1000) return qty.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (qty >= 1) return qty.toFixed(4);
    return qty.toFixed(6);
  };

  const bestAsk = displayAsks.length > 0 ? displayAsks[displayAsks.length - 1]?.price : null;
  const bestBid = displayBids.length > 0 ? displayBids[0]?.price : null;
  const spread = bestAsk && bestBid ? bestAsk - bestBid : null;
  const spreadPercent = bestAsk && bestBid ? ((bestAsk - bestBid) / bestBid * 100) : null;
  const spreadMidpoint = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : null;

  const displayPrice = currentPrice || marketPrice || spreadMidpoint || 0;
  const isPositive = priceChange >= 0;

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col shadow-sm">
        <div className="flex text-[10px] sm:text-xs px-2.5 py-2 border-b border-border bg-muted/30">
          <span className="w-[38%] text-muted-foreground font-medium">Price</span>
          <span className="w-[32%] text-muted-foreground font-medium text-right">Qty</span>
          <span className="w-[30%] text-muted-foreground font-medium text-right">Total</span>
        </div>
        <div className="flex-1 py-1"><OrderBookSkeleton rows={8} /></div>
        <div className="px-3 py-3 border-y border-border"><div className="h-6 w-24 bg-muted animate-pulse rounded" /></div>
        <div className="flex-1 py-1"><OrderBookSkeleton rows={8} /></div>
      </div>
    );
  }

  return (
    <div className="relative bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex text-[10px] sm:text-xs px-2.5 py-2 border-b border-border bg-muted/30">
        <span className="w-[38%] text-muted-foreground font-medium">Price ({quoteCurrency})</span>
        <span className="w-[32%] text-muted-foreground font-medium text-right">Qty</span>
        <span className="w-[30%] text-muted-foreground font-medium text-right">Total</span>
      </div>

      {/* Asks (Sell orders) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end min-h-[120px]">
        {displayAsks.length > 0 ? (
          <div>
            {displayAsks.map((ask, idx) => (
              <PremiumRow
                key={`ask-${ask.price}-${idx}`}
                entry={ask}
                side="ask"
                maxTotal={maxCum}
                onPriceClick={onPriceClick}
                formatPrice={formatPrice}
                formatQty={formatQty}
                cumTotal={askCumTotals[idx]}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-end justify-center pb-3 h-full">
            <span className="text-[10px] text-muted-foreground/60">No sell orders</span>
          </div>
        )}
      </div>

      {/* Spread & Current Price */}
      <div className="px-3 py-2 border-y border-border bg-gradient-to-r from-card via-muted/30 to-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1 rounded",
              isPositive ? "bg-emerald-500/10" : "bg-red-500/10"
            )}>
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              )}
            </div>
            <span className={cn(
              "text-base sm:text-lg font-bold font-mono",
              isPositive ? "text-emerald-400" : "text-red-400"
            )}>
              {displayPrice >= 1 ? displayPrice.toFixed(2) : displayPrice.toFixed(6)}
            </span>
          </div>

          {/* Spread indicator */}
          {spreadPercent !== null && spread !== null && (
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">Spread</span>
              <span className="text-[10px] sm:text-xs font-mono text-foreground font-medium">
                {formatPrice(spread)} ({spreadPercent.toFixed(3)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bids (Buy orders) */}
      <div className="flex-1 overflow-hidden min-h-[120px]">
        {displayBids.length > 0 ? (
          <div>
            {displayBids.map((bid, idx) => (
              <PremiumRow
                key={`bid-${bid.price}-${idx}`}
                entry={bid}
                side="bid"
                maxTotal={maxCum}
                onPriceClick={onPriceClick}
                formatPrice={formatPrice}
                formatQty={formatQty}
                cumTotal={bidCumTotals[idx]}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-start justify-center pt-3 h-full">
            <span className="text-[10px] text-muted-foreground/60">No buy orders</span>
          </div>
        )}
      </div>
    </div>
  );
};
