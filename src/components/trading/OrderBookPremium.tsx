import React, { memo, useMemo, useRef, useState, useEffect } from 'react';
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
  fillContainer?: boolean;
}

const ROW_HEIGHT = 28; // px — consistent vertical rhythm
const HEADER_H = 28;
const MID_PRICE_H = 34;
const PRESSURE_H = 28;
const OVERHEAD = HEADER_H + MID_PRICE_H + PRESSURE_H; // 90px

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

/* ── Single Order Row ── */
const OrderRow = memo(({
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
  const depthPct = maxQty > 0 ? Math.min((entry.quantity / maxQty) * 100, 100) : 0;

  return (
    <div
      onClick={() => onPriceClick?.(entry.price)}
      className="relative flex items-center cursor-pointer hover:bg-[#1A2235] active:bg-[#1E2740] transition-colors duration-75"
      style={{ height: ROW_HEIGHT, padding: '0 8px' }}
    >
      {/* Depth bar — subtle 10% opacity */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 pointer-events-none",
          isAsk ? "bg-[#F6465D]/[0.10]" : "bg-[#2EBD85]/[0.10]"
        )}
        style={{ width: `${depthPct}%` }}
      />
      {/* Price — left aligned */}
      <span className={cn(
        "relative z-10 flex-1 text-[13px] font-mono tabular-nums leading-none text-left",
        isAsk ? "text-[#F6465D]" : "text-[#2EBD85]"
      )}>
        {formatPrice(entry.price)}
      </span>
      {/* Amount — right aligned */}
      <span className="relative z-10 text-[13px] font-mono tabular-nums leading-none text-right text-[#848E9C]">
        {formatQty(entry.quantity)}
      </span>
    </div>
  );
});

OrderRow.displayName = 'OrderRow';

/* ── Main Component ── */
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
  maxRows = 10,
  fillContainer = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicRows, setDynamicRows] = useState(maxRows);

  useEffect(() => {
    if (!fillContainer || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const e of entries) {
        const h = e.contentRect.height;
        const available = h - OVERHEAD;
        const rowsPerSide = Math.max(3, Math.floor(available / 2 / ROW_HEIGHT));
        setDynamicRows(rowsPerSide);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fillContainer]);

  const effectiveRows = fillContainer ? dynamicRows : maxRows;

  const displayAsks = useMemo(() => asks.slice(0, effectiveRows).reverse(), [asks, effectiveRows]);
  const displayBids = useMemo(() => bids.slice(0, effectiveRows), [bids, effectiveRows]);

  const maxQty = useMemo(() => {
    const all = [...displayAsks, ...displayBids].map(e => e.quantity);
    return Math.max(...all, 1);
  }, [displayAsks, displayBids]);

  const displayPrice = currentPrice || marketPrice || 0;
  const isPositive = priceChange >= 0;

  // Pressure calculation
  const totalBidQty = displayBids.reduce((s, b) => s + b.quantity, 0);
  const totalAskQty = displayAsks.reduce((s, a) => s + a.quantity, 0);
  const totalQty = totalBidQty + totalAskQty;
  const bidPct = totalQty > 0 ? (totalBidQty / totalQty * 100) : 50;
  const askPct = totalQty > 0 ? (totalAskQty / totalQty * 100) : 50;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-[11px] text-[#4B5563]">Loading order book…</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-[#0A0F1A] rounded-md border border-[#1C2333]",
        fillContainer ? "flex-1 flex flex-col min-h-0 h-full" : "py-1"
      )}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center border-b border-[#1C2333]"
        style={{ height: HEADER_H, padding: '0 8px' }}
      >
        <span className="flex-1 text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold">
          Price{quoteCurrency ? ` (${quoteCurrency})` : ''}
        </span>
        <span className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold text-right">
          Amount
        </span>
      </div>

      {/* ── Sell Orders (Asks) — red, anchored to bottom ── */}
      <div className="flex-shrink-0">
        {displayAsks.length > 0 ? (
          displayAsks.map((ask, idx) => (
            <OrderRow
              key={`a-${ask.price}-${idx}`}
              entry={ask}
              side="ask"
              maxQty={maxQty}
              onPriceClick={onPriceClick}
            />
          ))
        ) : (
          <div className="flex items-center justify-center text-[10px] text-[#374151]" style={{ height: ROW_HEIGHT }}>
            No sell orders
          </div>
        )}
      </div>

      {/* ── Last Traded Price — centered highlight ── */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-[#111827] border-y border-[#1C2333] cursor-pointer active:bg-[#151D2E]"
        style={{ height: MID_PRICE_H, padding: '0 8px' }}
        onClick={() => onPriceClick?.(displayPrice)}
      >
        {isPositive ? (
          <TrendingUp className="h-3.5 w-3.5 text-[#2EBD85]" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-[#F6465D]" />
        )}
        <span className={cn(
          "text-[16px] font-bold font-mono tabular-nums tracking-tight",
          isPositive ? "text-[#2EBD85]" : "text-[#F6465D]"
        )}>
          {displayPrice >= 1 ? displayPrice.toFixed(2) : displayPrice.toFixed(6)}
        </span>
        <span className="text-[9px] text-[#4B5563] uppercase tracking-wider font-medium ml-1">
          Last
        </span>
      </div>

      {/* ── Buy Orders (Bids) — green, anchored to top ── */}
      <div className="flex-shrink-0">
        {displayBids.length > 0 ? (
          displayBids.map((bid, idx) => (
            <OrderRow
              key={`b-${bid.price}-${idx}`}
              entry={bid}
              side="bid"
              maxQty={maxQty}
              onPriceClick={onPriceClick}
            />
          ))
        ) : (
          <div className="flex items-center justify-center text-[10px] text-[#374151]" style={{ height: ROW_HEIGHT }}>
            No buy orders
          </div>
        )}
      </div>

      {/* ── Depth Pressure Bar — fills remaining space ── */}
      <div
        className="flex-1 flex flex-col justify-start border-t border-[#1C2333]"
        style={{ padding: '6px 8px 0' }}
      >
        <div className="flex items-center gap-1.5" style={{ height: 16 }}>
          <span className="text-[10px] font-mono tabular-nums text-[#2EBD85] min-w-[36px]">
            {bidPct.toFixed(1)}%
          </span>
          <div className="flex-1 h-[3px] rounded-full overflow-hidden flex bg-[#1C2333]">
            <div
              className="bg-[#2EBD85] rounded-l-full transition-[width] duration-300"
              style={{ width: `${bidPct}%` }}
            />
            <div
              className="bg-[#F6465D] rounded-r-full transition-[width] duration-300"
              style={{ width: `${askPct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono tabular-nums text-[#F6465D] min-w-[36px] text-right">
            {askPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
