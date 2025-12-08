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

  const formatPrice = (price: number) => price.toFixed(8);
  const formatQuantity = (qty: number) => qty.toFixed(4);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-3 py-2 border-b border-border">
        <span>Price ({quoteCurrency})</span>
        <span>Amount</span>
      </div>

      {/* Asks (Sell orders) */}
      <div className="flex-1 overflow-hidden">
        <div className="space-y-px">
          {displayAsks.map((ask, idx) => (
            <div
              key={`ask-${idx}`}
              onClick={() => onPriceClick?.(ask.price)}
              className="relative flex items-center justify-between px-3 py-1 cursor-pointer hover:bg-muted/30"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-destructive/10"
                style={{ width: `${(ask.quantity / maxAskTotal) * 100}%` }}
              />
              <span className="relative text-xs font-mono text-destructive">
                {formatPrice(ask.price)}
              </span>
              <span className="relative text-xs font-mono text-muted-foreground">
                {formatQuantity(ask.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Price */}
      <div className="px-3 py-2 border-y border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-lg font-bold font-mono",
            priceChange >= 0 ? "text-emerald-400" : "text-destructive"
          )}>
            {formatPrice(currentPrice)}
          </span>
          <span className="text-xs text-muted-foreground">
            ≈ ₹{(currentPrice * 83).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Bids (Buy orders) */}
      <div className="flex-1 overflow-hidden">
        <div className="space-y-px">
          {displayBids.map((bid, idx) => (
            <div
              key={`bid-${idx}`}
              onClick={() => onPriceClick?.(bid.price)}
              className="relative flex items-center justify-between px-3 py-1 cursor-pointer hover:bg-muted/30"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/10"
                style={{ width: `${(bid.quantity / maxBidTotal) * 100}%` }}
              />
              <span className="relative text-xs font-mono text-emerald-400">
                {formatPrice(bid.price)}
              </span>
              <span className="relative text-xs font-mono text-muted-foreground">
                {formatQuantity(bid.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
