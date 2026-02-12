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

const formatPrice = (price: number) => {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
};

const formatQty = (qty: number) => {
  if (qty >= 10_000_000) return `${(qty / 1_000_000).toFixed(1)}M`;
  if (qty >= 10_000) return `${(qty / 1_000).toFixed(1)}K`;
  if (qty >= 100) return qty.toFixed(2);
  if (qty >= 1) return qty.toFixed(4);
  return qty.toFixed(4);
};

const PremiumRow = memo(({
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
      className={cn(
        "relative grid grid-cols-3 items-center px-3 py-[5px] cursor-pointer",
        "hover:bg-white/[0.03] group"
      )}
    >
      {/* Depth bar */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 pointer-events-none",
          isAsk ? "bg-red-500/[0.07]" : "bg-emerald-500/[0.07]"
        )}
        style={{ width: `${Math.min(depthPercent, 100)}%` }}
      />

      {/* Price */}
      <span className={cn(
        "relative z-10 text-xs font-mono font-medium tabular-nums text-left",
        isAsk ? "text-red-400" : "text-emerald-400"
      )}>
        {formatPrice(entry.price)}
      </span>

      {/* Quantity */}
      <span className="relative z-10 text-xs font-mono text-[#94A3B8] text-right tabular-nums">
        {formatQty(entry.quantity)}
      </span>

      {/* Cumulative Total */}
      <span className="relative z-10 text-xs font-mono text-[#64748B] text-right tabular-nums">
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
  const displayAsks = useMemo(() => asks.slice(0, 10).reverse(), [asks]);
  const displayBids = useMemo(() => bids.slice(0, 10), [bids]);

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
      <div className="bg-gradient-to-b from-[#121826] to-[#0F1629] border border-[#1F2937]/50 rounded-[14px] overflow-hidden h-full flex flex-col">
        <div className="grid grid-cols-3 text-[10px] px-3 py-2.5 border-b border-[#1F2937]/40">
          <span className="text-[#64748B] font-medium">Price</span>
          <span className="text-[#64748B] font-medium text-right">Amount</span>
          <span className="text-[#64748B] font-medium text-right">Total</span>
        </div>
        <div className="flex-1 py-1"><OrderBookSkeleton rows={8} /></div>
        <div className="px-3 py-3 border-y border-[#1F2937]/40"><div className="h-6 w-24 bg-[#1F2937] rounded" /></div>
        <div className="flex-1 py-1"><OrderBookSkeleton rows={8} /></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#121826] to-[#0F1629] border border-[#1F2937]/50 rounded-[14px] overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-3 text-[10px] sm:text-xs px-3 py-2.5 border-b border-[#1F2937]/40">
        <span className="text-[#64748B] font-medium">Price ({quoteCurrency})</span>
        <span className="text-[#64748B] font-medium text-right">Amount</span>
        <span className="text-[#64748B] font-medium text-right">Total</span>
      </div>

      {/* Asks */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end min-h-[100px]">
        {displayAsks.length > 0 ? (
          <div>
            {displayAsks.map((ask, idx) => (
              <PremiumRow
                key={`ask-${ask.price}-${idx}`}
                entry={ask}
                side="ask"
                maxTotal={maxCum}
                onPriceClick={onPriceClick}
                cumTotal={askCumTotals[idx]}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-end justify-center pb-3 h-full">
            <span className="text-[10px] text-[#475569]">No sell orders</span>
          </div>
        )}
      </div>

      {/* ── Spread & Current Price ── */}
      <div className="px-3 py-2.5 border-y border-[#1F2937]/40 bg-[#0B0F1C]/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className={cn(
              "text-lg sm:text-xl font-semibold font-mono tracking-tight",
              isPositive ? "text-emerald-400" : "text-red-400"
            )}>
              {displayPrice >= 1 ? displayPrice.toFixed(2) : displayPrice.toFixed(6)}
            </span>
          </div>

          {spreadPercent !== null && spread !== null && (
            <div className="text-right">
              <span className="text-[10px] text-[#64748B] block">Spread</span>
              <span className="text-[10px] sm:text-xs font-mono text-[#94A3B8]">
                {formatPrice(spread)} ({spreadPercent.toFixed(3)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden min-h-[100px]">
        {displayBids.length > 0 ? (
          <div>
            {displayBids.map((bid, idx) => (
              <PremiumRow
                key={`bid-${bid.price}-${idx}`}
                entry={bid}
                side="bid"
                maxTotal={maxCum}
                onPriceClick={onPriceClick}
                cumTotal={bidCumTotals[idx]}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-start justify-center pt-3 h-full">
            <span className="text-[10px] text-[#475569]">No buy orders</span>
          </div>
        )}
      </div>
    </div>
  );
};
