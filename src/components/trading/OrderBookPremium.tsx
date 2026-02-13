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
      className="relative grid grid-cols-3 items-center px-2.5 h-[22px] cursor-pointer active:bg-white/[0.06]"
      style={{ gridTemplateColumns: '38% 32% 30%' }}
    >
      {/* Depth bar */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 pointer-events-none",
          isAsk ? "bg-[#EA3943]/[0.07]" : "bg-[#16C784]/[0.07]"
        )}
        style={{ width: `${Math.min(depthPercent, 100)}%` }}
      />

      <span className={cn(
        "relative z-10 text-[12px] font-mono tabular-nums text-left",
        isAsk ? "text-[#EA3943]" : "text-[#16C784]"
      )}>
        {formatPrice(entry.price)}
      </span>

      <span className="relative z-10 text-[12px] font-mono text-[#E5E7EB] text-right tabular-nums">
        {formatQty(entry.quantity)}
      </span>

      <span className="relative z-10 text-[12px] font-mono text-[#6B7280] text-right tabular-nums">
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
  quoteCurrency = 'USDT',
  baseCurrency = '',
  onPriceClick,
  isLoading = false,
  marketPrice,
}) => {
  const displayAsks = useMemo(() => asks.slice(0, 8).reverse(), [asks]);
  const displayBids = useMemo(() => bids.slice(0, 8), [bids]);

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
  const spread = bestAsk && bestBid ? bestAsk - bestBid : null;
  const spreadPercent = bestAsk && bestBid ? ((bestAsk - bestBid) / bestBid * 100) : null;
  const spreadMidpoint = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : null;

  const displayPrice = currentPrice || marketPrice || spreadMidpoint || 0;
  const isPositive = priceChange >= 0;

  if (isLoading) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-lg overflow-hidden">
        <div className="flex items-center justify-center h-40 text-[11px] text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-3 px-2.5 py-1.5 border-b border-[#1F2937]/60 text-[10px] text-[#6B7280] font-medium"
        style={{ gridTemplateColumns: '38% 32% 30%' }}
      >
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks */}
      <div className="py-0.5">
        {displayAsks.length > 0 ? (
          displayAsks.map((ask, idx) => (
            <Row
              key={`ask-${ask.price}-${idx}`}
              entry={ask}
              side="ask"
              maxTotal={maxCum}
              onPriceClick={onPriceClick}
              cumTotal={askCumTotals[idx]}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-[88px] text-[10px] text-[#6B7280]">No sell orders</div>
        )}
      </div>

      {/* ── Spread & Price ── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-y border-[#1F2937]/60">
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-[#16C784]" />
          ) : (
            <TrendingDown className="h-3 w-3 text-[#EA3943]" />
          )}
          <span className={cn(
            "text-[13px] font-bold font-mono",
            isPositive ? "text-[#16C784]" : "text-[#EA3943]"
          )}>
            {displayPrice >= 1 ? displayPrice.toFixed(2) : displayPrice.toFixed(6)}
          </span>
        </div>
        {spreadPercent !== null && (
          <span className="text-[9px] font-mono text-[#6B7280]">
            Spread {spreadPercent.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Bids */}
      <div className="py-0.5">
        {displayBids.length > 0 ? (
          displayBids.map((bid, idx) => (
            <Row
              key={`bid-${bid.price}-${idx}`}
              entry={bid}
              side="bid"
              maxTotal={maxCum}
              onPriceClick={onPriceClick}
              cumTotal={bidCumTotals[idx]}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-[88px] text-[10px] text-[#6B7280]">No buy orders</div>
        )}
      </div>
    </div>
  );
};
