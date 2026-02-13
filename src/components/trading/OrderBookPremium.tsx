import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface OrderBookEntry {
  price: number;
  quantity: number;
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

const formatPrice = (price: number) => {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
};

const formatQty = (qty: number) => {
  if (qty >= 10_000_000) return `${(qty / 1_000_000).toFixed(1)}M`;
  if (qty >= 10_000) return `${(qty / 1_000).toFixed(1)}K`;
  if (qty >= 100) return qty.toFixed(2);
  return qty.toFixed(4);
};

const Row = memo(({
  entry,
  side,
  maxTotal,
  onPriceClick,
  cumTotal,
}: {
  entry: OrderBookEntry;
  side: 'ask' | 'bid';
  maxTotal: number;
  onPriceClick?: (price: number) => void;
  cumTotal: number;
}) => {
  const isAsk = side === 'ask';
  const depthPercent = maxTotal > 0 ? (cumTotal / maxTotal) * 100 : 0;

  return (
    <div
      onClick={() => onPriceClick?.(entry.price)}
      className="relative grid items-center px-2.5 h-[18px] cursor-pointer active:bg-white/[0.03]"
      style={{ gridTemplateColumns: '36% 32% 32%' }}
    >
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 pointer-events-none",
          isAsk ? "bg-[#EA3943]/[0.06]" : "bg-[#16C784]/[0.06]"
        )}
        style={{ width: `${Math.min(depthPercent, 100)}%` }}
      />
      <span className={cn(
        "relative z-10 text-[11px] font-mono tabular-nums text-left",
        isAsk ? "text-[#EA3943]" : "text-[#16C784]"
      )}>
        {formatPrice(entry.price)}
      </span>
      <span className="relative z-10 text-[11px] font-mono text-[#6B7280] text-right tabular-nums">
        {formatQty(entry.quantity)}
      </span>
      <span className="relative z-10 text-[11px] font-mono text-[#4B5563] text-right tabular-nums">
        {formatQty(cumTotal)}
      </span>
    </div>
  );
});

Row.displayName = 'Row';

export const OrderBookPremium: React.FC<OrderBookPremiumProps> = ({
  asks,
  bids,
  currentPrice,
  priceChange = 0,
  onPriceClick,
  isLoading = false,
  marketPrice,
}) => {
  const displayAsks = useMemo(() => asks.slice(0, 12).reverse(), [asks]);
  const displayBids = useMemo(() => bids.slice(0, 12), [bids]);

  const askCumTotals = useMemo(() => {
    const totals: number[] = [];
    let cum = 0;
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
  const maxCum = Math.max(maxAskCum, maxBidCum);

  const bestAsk = displayAsks.length > 0 ? displayAsks[displayAsks.length - 1]?.price : null;
  const bestBid = displayBids.length > 0 ? displayBids[0]?.price : null;
  const spreadPercent = bestAsk && bestBid ? ((bestAsk - bestBid) / bestBid * 100) : null;
  const spreadMidpoint = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : null;

  const displayPrice = currentPrice || marketPrice || spreadMidpoint || 0;
  const isPositive = priceChange >= 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-[10px] text-[#6B7280]">Loading...</div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="grid px-2.5 py-1 text-[9px] text-[#4B5563] uppercase tracking-wider font-medium"
        style={{ gridTemplateColumns: '36% 32% 32%' }}
      >
        <span>Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks */}
      <div>
        {displayAsks.length > 0 ? (
          displayAsks.map((ask, idx) => (
            <Row
              key={`a-${ask.price}-${idx}`}
              entry={ask}
              side="ask"
              maxTotal={maxCum}
              onPriceClick={onPriceClick}
              cumTotal={askCumTotals[idx]}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-[40px] text-[9px] text-[#4B5563]">No asks</div>
        )}
      </div>

      {/* ── Mid price ── */}
      <div className="flex items-center justify-between px-2.5 h-[24px] border-y border-[#1F2937]/40">
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-2.5 w-2.5 text-[#16C784]" />
          ) : (
            <TrendingDown className="h-2.5 w-2.5 text-[#EA3943]" />
          )}
          <span className={cn(
            "text-[12px] font-bold font-mono",
            isPositive ? "text-[#16C784]" : "text-[#EA3943]"
          )}>
            {displayPrice >= 1 ? displayPrice.toFixed(2) : displayPrice.toFixed(6)}
          </span>
        </div>
        {spreadPercent !== null && (
          <span className="text-[8px] font-mono text-[#4B5563]">
            Spread {spreadPercent.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Bids */}
      <div>
        {displayBids.length > 0 ? (
          displayBids.map((bid, idx) => (
            <Row
              key={`b-${bid.price}-${idx}`}
              entry={bid}
              side="bid"
              maxTotal={maxCum}
              onPriceClick={onPriceClick}
              cumTotal={bidCumTotals[idx]}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-[40px] text-[9px] text-[#4B5563]">No bids</div>
        )}
      </div>
    </div>
  );
};
