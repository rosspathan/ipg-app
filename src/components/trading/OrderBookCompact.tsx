import React from 'react';
import { cn } from '@/lib/utils';

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
}

export const OrderBookCompact: React.FC<OrderBookCompactProps> = ({
  asks,
  bids,
  currentPrice,
  priceChange = 0,
  quoteCurrency = 'USDT',
  onPriceClick,
}) => {
  const displayAsks = asks.slice(0, 8).reverse();
  const displayBids = bids.slice(0, 8);

  const maxAskTotal = Math.max(...displayAsks.map(a => a.quantity), 1);
  const maxBidTotal = Math.max(...displayBids.map(b => b.quantity), 1);

  const formatPrice = (price: number) => price.toFixed(4);
  const formatQuantity = (qty: number) => qty.toFixed(2);

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden h-full flex flex-col">
      {/* Header - Compact */}
      <div className="flex items-center justify-between text-[10px] sm:text-xs px-2 py-1.5 border-b border-border">
        <span className="text-muted-foreground">Price</span>
        <span className="text-muted-foreground">Qty</span>
      </div>

      {/* Asks (Sell orders) */}
      <div className="flex-1 overflow-hidden">
        <div className="space-y-0">
          {displayAsks.map((ask, idx) => (
            <div
              key={`ask-${idx}`}
              onClick={() => onPriceClick?.(ask.price)}
              className="relative flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-muted/50"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                style={{ width: `${(ask.quantity / maxAskTotal) * 100}%` }}
              />
              <span className="relative text-[10px] sm:text-xs font-mono text-red-400">
                {formatPrice(ask.price)}
              </span>
              <span className="relative text-[10px] sm:text-xs font-mono text-muted-foreground">
                {formatQuantity(ask.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Price - Compact but visible */}
      <div className="px-2 py-1.5 sm:py-2 border-y border-border bg-card relative z-10">
        <div className="flex flex-col">
          <span className={cn(
            "text-sm sm:text-base font-bold font-mono",
            priceChange >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {currentPrice.toFixed(2)}
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            ≈ ₹{(currentPrice * 83).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Bids (Buy orders) */}
      <div className="flex-1 overflow-hidden">
        <div className="space-y-0">
          {displayBids.map((bid, idx) => (
            <div
              key={`bid-${idx}`}
              onClick={() => onPriceClick?.(bid.price)}
              className="relative flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-muted/50"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/10"
                style={{ width: `${(bid.quantity / maxBidTotal) * 100}%` }}
              />
              <span className="relative text-[10px] sm:text-xs font-mono text-emerald-400">
                {formatPrice(bid.price)}
              </span>
              <span className="relative text-[10px] sm:text-xs font-mono text-muted-foreground">
                {formatQuantity(bid.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};