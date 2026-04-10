import React, { memo, useMemo, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface OrderBookEntry {
  price: number;
  quantity: number;
}

type GroupMode = 'split' | 'bids' | 'asks';

interface OrderBookUnifiedProps {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  lastTradePrice: number;
  bestBid?: number;
  bestAsk?: number;
  priceChange?: number;
  quoteCurrency?: string;
  baseCurrency?: string;
  onPriceClick?: (price: number) => void;
  isLoading?: boolean;
  maxRows?: number;
  currentPrice?: number;
}

const getPrecisionOptions = (price: number) => {
  if (price >= 1000) return [1, 10, 50, 100];
  if (price >= 100) return [0.1, 1, 5, 10];
  if (price >= 1) return [0.01, 0.1, 1, 5];
  if (price >= 0.01) return [0.0001, 0.001, 0.01, 0.1];
  return [0.000001, 0.00001, 0.0001, 0.001];
};

const getDefaultPrecision = (price: number) => getPrecisionOptions(price)[0];

const aggregateByPrecision = (
  entries: OrderBookEntry[], precision: number, side: 'bid' | 'ask'
): (OrderBookEntry & { cumulative: number })[] => {
  const map = new Map<number, number>();
  entries.forEach(({ price, quantity }) => {
    const key = side === 'bid'
      ? Math.floor(price / precision) * precision
      : Math.ceil(price / precision) * precision;
    map.set(key, (map.get(key) || 0) + quantity);
  });
  const sorted = Array.from(map.entries()).sort((a, b) =>
    side === 'bid' ? b[0] - a[0] : a[0] - b[0]
  );
  let cum = 0;
  return sorted.map(([price, quantity]) => {
    cum += quantity;
    return { price, quantity, cumulative: cum };
  });
};

const fmtPrice = (p: number, prec: number) => {
  const decimals = Math.max(0, -Math.floor(Math.log10(prec)));
  return p.toFixed(Math.min(decimals + 1, 7));
};

const fmtCompact = (q: number) => {
  if (q >= 1_000_000) return `${(q / 1_000_000).toFixed(1)}M`;
  if (q >= 100_000) return `${(q / 1_000).toFixed(0)}K`;
  if (q >= 10_000) return `${(q / 1_000).toFixed(1)}K`;
  if (q >= 1_000) return `${(q / 1_000).toFixed(1)}K`;
  if (q >= 100) return q.toFixed(1);
  if (q >= 10) return q.toFixed(2);
  if (q >= 1) return q.toFixed(3);
  if (q >= 0.01) return q.toFixed(4);
  return q.toFixed(5);
};

const getDustThreshold = (entries: OrderBookEntry[]) => {
  if (entries.length < 3) return 0;
  const quantities = entries.map(e => e.quantity).sort((a, b) => a - b);
  const median = quantities[Math.floor(quantities.length / 2)];
  return median * 0.05;
};

const ROW_H = 28;

const BookRow = memo(({
  price, quantity, maxQty, side, precision, onClick, isDust, isBest,
}: {
  price: number; quantity: number; maxQty: number;
  side: 'ask' | 'bid'; precision: number;
  onClick?: (p: number) => void; isDust: boolean; isBest?: boolean;
}) => {
  const depthPct = maxQty > 0 ? Math.min((quantity / maxQty) * 100, 100) : 0;
  const isAsk = side === 'ask';

  return (
    <div
      onClick={() => onClick?.(price)}
      className={cn(
        "relative flex items-center cursor-pointer active:bg-[hsl(230,20%,14%)] transition-colors",
        isDust && "opacity-35",
        isBest && "bg-[hsl(230,20%,10%)]"
      )}
      style={{ height: ROW_H, padding: '0 8px' }}
    >
      {/* Depth bar */}
      <div
        className={cn(
          "absolute top-0 bottom-0 right-0 pointer-events-none transition-[width] duration-300",
          isAsk ? "bg-[#FF4D4F]/[0.10]" : "bg-[#00E676]/[0.10]"
        )}
        style={{ width: `${depthPct}%` }}
      />
      {/* Price — 50% */}
      <span className={cn(
        "relative z-10 text-[11.5px] font-mono tabular-nums text-left leading-none truncate",
        isAsk ? "text-[#FF4D4F]" : "text-[#00E676]",
        isBest && "font-bold"
      )} style={{ fontWeight: isBest ? 700 : 600, width: '50%', flexShrink: 0 }}>
        {fmtPrice(price, precision)}
      </span>
      {/* Amount — 50% */}
      <span className="relative z-10 text-[11px] font-mono tabular-nums text-right text-[#C7D2E0] leading-none truncate" style={{ fontWeight: 500, width: '50%', flexShrink: 0 }}>
        {fmtCompact(quantity)}
      </span>
    </div>
  );
});
BookRow.displayName = 'BookRow';

export const OrderBookUnified: React.FC<OrderBookUnifiedProps> = ({
  asks, bids, lastTradePrice, currentPrice: _deprecated, bestBid: propBestBid, bestAsk: propBestAsk,
  priceChange = 0, quoteCurrency = 'USDT', baseCurrency, onPriceClick, isLoading = false, maxRows = 8,
}) => {
  const effectivePrice = lastTradePrice || _deprecated || 0;
  const [mode, setMode] = useState<GroupMode>('split');
  const [precision, setPrecision] = useState(() => getDefaultPrecision(effectivePrice));
  const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(effectivePrice);

  useEffect(() => {
    const opts = getPrecisionOptions(effectivePrice);
    if (!opts.includes(precision)) setPrecision(opts[0]);
  }, [effectivePrice]);

  useEffect(() => {
    if (effectivePrice !== prevPriceRef.current && effectivePrice > 0) {
      setFlashDir(effectivePrice > prevPriceRef.current ? 'up' : 'down');
      prevPriceRef.current = effectivePrice;
      const t = setTimeout(() => setFlashDir(null), 800);
      return () => clearTimeout(t);
    }
  }, [effectivePrice]);

  const precisionOptions = useMemo(() => getPrecisionOptions(effectivePrice), [effectivePrice]);
  const aggBids = useMemo(() => aggregateByPrecision(bids, precision, 'bid'), [bids, precision]);
  const aggAsks = useMemo(() => aggregateByPrecision(asks, precision, 'ask'), [asks, precision]);

  const rowsPerSide = mode === 'split' ? maxRows : maxRows * 2;
  const displayAsks = useMemo(() => aggAsks.slice(0, rowsPerSide).reverse(), [aggAsks, rowsPerSide]);
  const displayBids = useMemo(() => aggBids.slice(0, rowsPerSide), [aggBids, rowsPerSide]);

  const maxQty = useMemo(() => {
    const allQty = [...displayAsks, ...displayBids].map(e => e.quantity);
    return Math.max(...allQty, 1);
  }, [displayAsks, displayBids]);

  const bidDust = useMemo(() => getDustThreshold(displayBids), [displayBids]);
  const askDust = useMemo(() => getDustThreshold(displayAsks), [displayAsks]);

  const computedBestBid = propBestBid || aggBids[0]?.price || 0;
  const computedBestAsk = propBestAsk || aggAsks[0]?.price || 0;
  const spread = computedBestAsk > 0 && computedBestBid > 0 ? computedBestAsk - computedBestBid : 0;
  const spreadPct = computedBestBid > 0 ? (spread / computedBestBid) * 100 : 0;

  const totalBidQty = displayBids.reduce((s, b) => s + b.quantity, 0);
  const totalAskQty = displayAsks.reduce((s, a) => s + a.quantity, 0);
  const totalQty = totalBidQty + totalAskQty;
  const bidPct = totalQty > 0 ? (totalBidQty / totalQty) * 100 : 50;
  const isPositive = priceChange >= 0;

  const bestAskPrice = displayAsks.length > 0 ? displayAsks[displayAsks.length - 1]?.price : null;
  const bestBidPrice = displayBids.length > 0 ? displayBids[0]?.price : null;

  if (isLoading) {
    return <div className="flex items-center justify-center h-32 text-[10px] text-[#94A3B8]">Loading…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[hsl(230,20%,15%)]/40">
        <div className="flex items-center gap-0.5 bg-[hsl(230,20%,10%)] rounded-md p-[2px]">
          {([
            { key: 'split', el: <><div className="h-[3px] w-2.5 bg-[#FF4D4F]/70 rounded-full" /><div className="h-[3px] w-2.5 bg-[#00E676]/70 rounded-full" /></> },
            { key: 'bids', el: <div className="h-2.5 w-2.5 bg-[#00E676]/15 border border-[#00E676]/30 rounded-[2px]" /> },
            { key: 'asks', el: <div className="h-2.5 w-2.5 bg-[#FF4D4F]/15 border border-[#FF4D4F]/30 rounded-[2px]" /> },
          ] as const).map(({ key, el }) => (
            <button
              key={key}
              onClick={() => setMode(key as GroupMode)}
              className={cn("p-1 rounded-md transition-colors", mode === key ? "bg-[hsl(230,25%,16%)] shadow-sm" : "")}
            >
              <div className="flex flex-col gap-[2px]">{el}</div>
            </button>
          ))}
        </div>
        <select
          value={precision}
          onChange={(e) => setPrecision(parseFloat(e.target.value))}
          className="h-5 text-[9px] font-mono bg-[hsl(230,20%,10%)] border-none rounded px-1 text-[#C7D2E0] cursor-pointer focus:outline-none appearance-none"
        >
          {precisionOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Column Header */}
      <div className="flex items-center px-2 py-1 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider border-b border-[hsl(230,20%,12%)]/30">
        <span style={{ width: '50%' }}>Price ({quoteCurrency})</span>
        <span className="text-right" style={{ width: '50%' }}>Amount</span>
      </div>

      {/* Asks */}
      {mode !== 'bids' && (
        <div className="flex flex-col justify-end overflow-hidden min-h-0" style={{ flex: mode === 'split' ? '1 1 0%' : '1 1 auto' }}>
          {displayAsks.length > 0 ? displayAsks.map((ask) => (
            <BookRow
              key={`a-${ask.price}`}
              price={ask.price} quantity={ask.quantity}
              maxQty={maxQty} side="ask" precision={precision}
              onClick={onPriceClick}
              isDust={ask.quantity <= askDust}
              isBest={ask.price === bestAskPrice}
            />
          )) : (
            <div className="flex items-center justify-center py-3 text-[9px] text-[#94A3B8]/30">No asks</div>
          )}
        </div>
      )}

      {/* ── Central Price with LAST label ── */}
      <div
        className={cn(
          "flex items-center justify-center gap-2 px-2 h-[34px] border-y border-[hsl(230,20%,18%)]/50 transition-colors duration-700 cursor-pointer",
          flashDir === 'up' && "bg-[#00E676]/8",
          flashDir === 'down' && "bg-[#FF4D4F]/8",
          !flashDir && "bg-[hsl(230,30%,6%)]"
        )}
        onClick={() => onPriceClick?.(effectivePrice)}
      >
        {isPositive
          ? <TrendingUp className="h-3.5 w-3.5 text-[#00E676]" />
          : <TrendingDown className="h-3.5 w-3.5 text-[#FF4D4F]" />
        }
        <span className={cn("text-[14px] font-extrabold font-mono tabular-nums", isPositive ? "text-[#00E676]" : "text-[#FF4D4F]")}>
          {effectivePrice >= 1 ? effectivePrice.toFixed(2) : effectivePrice.toFixed(6)}
        </span>
        <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">LAST</span>
      </div>

      {/* Bids */}
      {mode !== 'asks' && (
        <div className="overflow-hidden min-h-0" style={{ flex: mode === 'split' ? '1 1 0%' : '1 1 auto' }}>
          {displayBids.length > 0 ? displayBids.map((bid) => (
            <BookRow
              key={`b-${bid.price}`}
              price={bid.price} quantity={bid.quantity}
              maxQty={maxQty} side="bid" precision={precision}
              onClick={onPriceClick}
              isDust={bid.quantity <= bidDust}
              isBest={bid.price === bestBidPrice}
            />
          )) : (
            <div className="flex items-center justify-center py-3 text-[9px] text-[#94A3B8]/30">No bids</div>
          )}
        </div>
      )}

      {/* Pressure bar */}
      <div className="px-2 py-1.5 border-t border-[hsl(230,20%,18%)]/50">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono tabular-nums text-[#00E676] font-bold w-8">{bidPct.toFixed(1)}%</span>
          <div className="flex-1 h-[4px] rounded-full overflow-hidden flex bg-[#060D18]">
            <div className="bg-[#00E676]/60 rounded-l-full transition-[width] duration-300" style={{ width: `${bidPct}%` }} />
            <div className="bg-[#FF4D4F]/60 rounded-r-full transition-[width] duration-300" style={{ width: `${100 - bidPct}%` }} />
          </div>
          <span className="text-[9px] font-mono tabular-nums text-[#FF4D4F] font-bold w-8 text-right">{(100 - bidPct).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};