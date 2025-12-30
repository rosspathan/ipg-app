import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { OrderBookSkeleton } from './OrderBookSkeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface OrderBookEntry {
  price: number;
  quantity: number;
  total?: number;
}

interface OrderBookCompactProps {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  currentPrice: number;
  priceChange?: number;
  quoteCurrency?: string;
  onPriceClick?: (price: number) => void;
  isLoading?: boolean;
  marketPrice?: number; // External market reference price
}

// Memoized row component for performance
const OrderRow = memo(({ 
  entry, 
  side, 
  maxTotal, 
  onPriceClick,
  formatPrice,
  formatQuantity 
}: {
  entry: OrderBookEntry;
  side: 'ask' | 'bid';
  maxTotal: number;
  onPriceClick?: (price: number) => void;
  formatPrice: (p: number) => string;
  formatQuantity: (q: number) => string;
}) => {
  const isAsk = side === 'ask';
  const widthPercent = (entry.quantity / maxTotal) * 100;
  
  return (
    <div
      onClick={() => onPriceClick?.(entry.price)}
      className={cn(
        "relative flex items-center justify-between px-2 py-1 cursor-pointer",
        "transition-colors duration-150",
        isAsk ? "hover:bg-red-500/10" : "hover:bg-emerald-500/10"
      )}
    >
      {/* Quantity bar background */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 transition-all duration-300",
          isAsk ? "bg-red-500/10" : "bg-emerald-500/10"
        )}
        style={{ width: `${Math.min(widthPercent, 100)}%` }}
      />
      
      {/* Price */}
      <span className={cn(
        "relative text-[10px] sm:text-xs font-mono font-medium",
        isAsk ? "text-red-400" : "text-emerald-400"
      )}>
        {formatPrice(entry.price)}
      </span>
      
      {/* Quantity */}
      <span className="relative text-[10px] sm:text-xs font-mono text-muted-foreground">
        {formatQuantity(entry.quantity)}
      </span>
    </div>
  );
});

OrderRow.displayName = 'OrderRow';

export const OrderBookCompact: React.FC<OrderBookCompactProps> = ({
  asks,
  bids,
  currentPrice,
  priceChange = 0,
  quoteCurrency = 'USDT',
  onPriceClick,
  isLoading = false,
  marketPrice,
}) => {
  const displayAsks = useMemo(() => asks.slice(0, 8).reverse(), [asks]);
  const displayBids = useMemo(() => bids.slice(0, 8), [bids]);

  const maxAskTotal = useMemo(() => Math.max(...displayAsks.map(a => a.quantity), 1), [displayAsks]);
  const maxBidTotal = useMemo(() => Math.max(...displayBids.map(b => b.quantity), 1), [displayBids]);

  const formatPrice = (price: number) => price >= 1 ? price.toFixed(4) : price.toFixed(8);
  const formatQuantity = (qty: number) => qty >= 1 ? qty.toFixed(4) : qty.toFixed(6);
  
  const hasOrders = displayAsks.length > 0 || displayBids.length > 0;
  const bestAsk = displayAsks.length > 0 ? displayAsks[displayAsks.length - 1]?.price : null;
  const bestBid = displayBids.length > 0 ? displayBids[0]?.price : null;
  const spread = bestAsk && bestBid ? ((bestAsk - bestBid) / bestBid * 100) : null;
  
  const displayPrice = currentPrice || marketPrice || 0;
  const isPositive = priceChange >= 0;

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col shadow-sm">
        <div className="flex items-center justify-between text-[10px] sm:text-xs px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-muted-foreground font-medium">Price ({quoteCurrency})</span>
          <span className="text-muted-foreground font-medium">Quantity</span>
        </div>
        <div className="flex-1 py-1">
          <OrderBookSkeleton rows={8} />
        </div>
        <div className="px-3 py-3 border-y border-border bg-gradient-to-r from-card to-muted/20">
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex-1 py-1">
          <OrderBookSkeleton rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between text-[10px] sm:text-xs px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-muted-foreground font-medium">Price ({quoteCurrency})</span>
        <span className="text-muted-foreground font-medium">Quantity</span>
      </div>

      {/* Asks (Sell orders) - shown in reverse so lowest ask is closest to spread */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end min-h-[120px]">
        {displayAsks.length > 0 ? (
          <div className="space-y-0">
            {displayAsks.map((ask, idx) => (
              <OrderRow
                key={`ask-${ask.price}-${idx}`}
                entry={ask}
                side="ask"
                maxTotal={maxAskTotal}
                onPriceClick={onPriceClick}
                formatPrice={formatPrice}
                formatQuantity={formatQuantity}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-end justify-center pb-3 h-full">
            <span className="text-[10px] text-muted-foreground/60">No sell orders</span>
          </div>
        )}
      </div>

      {/* Current Price - Premium look */}
      <div className="px-3 py-2.5 border-y border-border bg-gradient-to-r from-card via-muted/30 to-card">
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
            <div className="flex flex-col">
              <span className={cn(
                "text-base sm:text-lg font-bold font-mono",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}>
                {displayPrice >= 1 ? displayPrice.toFixed(2) : displayPrice.toFixed(6)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ≈ ₹{(displayPrice * 83).toFixed(2)}
              </span>
            </div>
          </div>
          
          {/* Spread indicator */}
          {spread !== null && (
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">Spread</span>
              <span className="text-[10px] sm:text-xs font-mono text-foreground font-medium">
                {spread.toFixed(3)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bids (Buy orders) */}
      <div className="flex-1 overflow-hidden min-h-[120px]">
        {displayBids.length > 0 ? (
          <div className="space-y-0">
            {displayBids.map((bid, idx) => (
              <OrderRow
                key={`bid-${bid.price}-${idx}`}
                entry={bid}
                side="bid"
                maxTotal={maxBidTotal}
                onPriceClick={onPriceClick}
                formatPrice={formatPrice}
                formatQuantity={formatQuantity}
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
