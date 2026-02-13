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
  maxRows?: number;
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
  return qty.toFixed(3);
};

const Row = memo(({
  entry,
  side,
  maxQty,
  onPriceClick,
}: {
  entry: OrderBookEntry;
  side: 'ask' | 'bid';
  maxQty: number;
  onPriceClick?: (price: number) => void;
}) => {
  const isAsk = side === 'ask';
  const depthPercent = maxQty > 0 ? (entry.quantity / maxQty) * 100 : 0;

  return (
    <div
      onClick={() => onPriceClick?.(entry.price)}
      className="relative grid items-center px-2 h-[17px] cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors duration-75"
      style={{ gridTemplateColumns: '50% 50%' }}
    >
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 pointer-events-none transition-[width] duration-200",
          isAsk ? "bg-[#F6465D]/[0.12]" : "bg-[#2EBD85]/[0.12]"
        )}
        style={{ width: `${Math.min(depthPercent, 100)}%` }}
      />
      <span className={cn(
        "relative z-10 text-[11px] font-mono tabular-nums text-left",
        isAsk ? "text-[#F6465D]" : "text-[#2EBD85]"
      )}>
        {formatPrice(entry.price)}
      </span>
      <span className="relative z-10 text-[11px] font-mono text-[#848E9C] text-right tabular-nums">
        {formatQty(entry.quantity)}
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
  quoteCurrency,
  baseCurrency,
  onPriceClick,
  isLoading = false,
  marketPrice,
  maxRows = 7,
}) => {
  const displayAsks = useMemo(() => asks.slice(0, maxRows).reverse(), [asks, maxRows]);
  const displayBids = useMemo(() => bids.slice(0, maxRows), [bids, maxRows]);

  // Max quantity for depth bar normalization
  const allQtys = useMemo(() => {
    const askQtys = displayAsks.map(a => a.quantity);
    const bidQtys = displayBids.map(b => b.quantity);
    return Math.max(...askQtys, ...bidQtys, 1);
  }, [displayAsks, displayBids]);

  const bestAsk = displayAsks.length > 0 ? displayAsks[displayAsks.length - 1]?.price : null;
  const bestBid = displayBids.length > 0 ? displayBids[0]?.price : null;

  const displayPrice = currentPrice || marketPrice || 0;
  const isPositive = priceChange >= 0;

  // Buy/sell pressure
  const totalBidQty = displayBids.reduce((s, b) => s + b.quantity, 0);
  const totalAskQty = displayAsks.reduce((s, a) => s + a.quantity, 0);
  const totalQty = totalBidQty + totalAskQty;
  const bidPct = totalQty > 0 ? (totalBidQty / totalQty * 100) : 50;
  const askPct = totalQty > 0 ? (totalAskQty / totalQty * 100) : 50;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-[10px] text-[#6B7280]">Loading...</div>
    );
  }

  return (
    <div className="py-1">
      {/* Header */}
      <div className="grid px-2 pb-1 text-[9px] text-[#4B5563] uppercase tracking-wider font-medium"
        style={{ gridTemplateColumns: '50% 50%' }}
      >
        <span>Price ({quoteCurrency})</span>
        <span className="text-right">Amount ⇅</span>
      </div>

      {/* Asks */}
      <div>
        {displayAsks.length > 0 ? (
          displayAsks.map((ask, idx) => (
            <Row
              key={`a-${ask.price}-${idx}`}
              entry={ask}
              side="ask"
              maxQty={allQtys}
              onPriceClick={onPriceClick}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-[30px] text-[9px] text-[#4B5563]">No asks</div>
        )}
      </div>

      {/* ── Last Traded Price bar ── */}
      <div
        className="flex items-center justify-between px-2 h-[26px] bg-[#111827]/60 border-y border-[#1F2937]/30 cursor-pointer active:bg-white/[0.03]"
        onClick={() => onPriceClick?.(displayPrice)}
      >
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-[#2EBD85]" />
          ) : (
            <TrendingDown className="h-3 w-3 text-[#F6465D]" />
          )}
          <span className={cn(
            "text-[14px] font-bold font-mono tracking-tight",
            isPositive ? "text-[#2EBD85]" : "text-[#F6465D]"
          )}>
            {displayPrice >= 1 ? displayPrice.toFixed(2) : displayPrice.toFixed(6)}
          </span>
        </div>
        <span className="text-[8px] font-medium text-[#4B5563] uppercase tracking-wider">Last Traded</span>
      </div>

      {/* Bids */}
      <div>
        {displayBids.length > 0 ? (
          displayBids.map((bid, idx) => (
            <Row
              key={`b-${bid.price}-${idx}`}
              entry={bid}
              side="bid"
              maxQty={allQtys}
              onPriceClick={onPriceClick}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-[30px] text-[9px] text-[#4B5563]">No bids</div>
        )}
      </div>

      {/* ── Buy/Sell pressure bar ── */}
      <div className="flex items-center gap-1 px-2 pt-1">
        <span className="text-[9px] font-mono text-[#2EBD85]">{bidPct.toFixed(1)}%</span>
        <div className="flex-1 h-[3px] rounded-full overflow-hidden flex">
          <div className="bg-[#2EBD85]" style={{ width: `${bidPct}%` }} />
          <div className="bg-[#F6465D]" style={{ width: `${askPct}%` }} />
        </div>
        <span className="text-[9px] font-mono text-[#F6465D]">{askPct.toFixed(1)}%</span>
      </div>
    </div>
  );
};
