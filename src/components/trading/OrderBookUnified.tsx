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

/* Mobile-optimized price formatting — keep compact */
const fmtPrice = (p: number, prec: number) => {
  const decimals = Math.max(0, -Math.floor(Math.log10(prec)));
  return p.toFixed(Math.min(decimals + 1, 6));
};

/* Mobile-optimized qty/total — abbreviate aggressively to prevent overlap */
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

const ROW_H = 26;

const BookRow = memo(({
  price, quantity, cumulative, maxCum, side, precision, showCumulative, onClick, isDust, isBest,
}: {
  price: number; quantity: number; cumulative: number; maxCum: number;
  side: 'ask' | 'bid'; precision: number; showCumulative: boolean;
  onClick?: (p: number) => void; isDust: boolean; isBest?: boolean;
}) => {
  const depthPct = maxCum > 0 ? Math.min((cumulative / maxCum) * 100, 100) : 0;
  const isAsk = side === 'ask';

  return (
    <div
      onClick={() => onClick?.(price)}
      className={cn(
        "relative flex items-center cursor-pointer active:bg-[hsl(230,20%,14%)] transition-colors",
        isDust && "opacity-25",
        isBest && "bg-[hsl(230,20%,10%)]"
      )}
      style={{ height: ROW_H, padding: '0 6px' }}
    >
      {/* Depth bar */}
      <div
        className={cn(
          "absolute top-0 bottom-0 right-0 pointer-events-none transition-[width] duration-300",
          isAsk ? "bg-[#FF4D4F]/[0.12]" : "bg-[#00E676]/[0.12]"
        )}
        style={{ width: `${depthPct}%` }}
      />
      {/* Price — 44% */}
      <span className={cn(
        "relative z-10 text-[11px] font-mono tabular-nums text-left leading-none truncate",
        isAsk ? "text-[#FF4D4F]" : "text-[#00E676]",
        isBest && "font-bold"
      )} style={{ fontWeight: isBest ? 700 : 600, width: '44%', flexShrink: 0 }}>
        {fmtPrice(price, precision)}
      </span>
      {/* Qty — 28% */}
      <span className="relative z-10 text-[10px] font-mono tabular-nums text-right text-[#C7D2E0] leading-none truncate" style={{ fontWeight: 500, width: '28%', flexShrink: 0 }}>
        {fmtCompact(quantity)}
      </span>
      {/* Total — 28% */}
      <span className="relative z-10 text-[10px] font-mono tabular-nums text-right text-[#94A3B8] leading-none truncate" style={{ fontWeight: 500, width: '28%', flexShrink: 0 }}>
        {showCumulative ? fmtCompact(cumulative) : fmtCompact(quantity * price)}
      </span>
    </div>
  );
});
BookRow.displayName = 'BookRow';

export const OrderBookUnified: React.FC<OrderBookUnifiedProps> = ({
  asks, bids, lastTradePrice, currentPrice: _deprecated, bestBid: propBestBid, bestAsk: propBestAsk,
  priceChange = 0, quoteCurrency = 'USDT', baseCurrency, onPriceClick, isLoading = false, maxRows = 7,
}) => {
  const effectivePrice = lastTradePrice || _deprecated || 0;
  const [mode, setMode] = useState<GroupMode>('split');
  const [showCumulative, setShowCumulative] = useState(false);
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

  const maxCumQty = useMemo(() => {
    const allCum = [...displayAsks, ...displayBids].map(e => e.cumulative);
    return Math.max(...allCum, 1);
  }, [displayAsks, displayBids]);

  const bidDust = useMemo(() => getDustThreshold(displayBids), [displayBids]);
  const askDust = useMemo(() => getDustThreshold(displayAsks), [displayAsks]);

  const computedBestBid = propBestBid || aggBids[0]?.price || 0;
  const computedBestAsk = propBestAsk || aggAsks[0]?.price || 0;
  const spread = computedBestAsk > 0 && computedBestBid > 0 ? computedBestAsk - computedBestBid : 0;
  const spreadPct = computedBestBid > 0 ? (spread / computedBestBid) * 100 : 0;

  const band = effectivePrice * 0.02;
  const bidDepthValue = bids.filter(b => b.price >= effectivePrice - band).reduce((s, b) => s + b.quantity * b.price, 0);
  const askDepthValue = asks.filter(a => a.price <= effectivePrice + band).reduce((s, a) => s + a.quantity * a.price, 0);
  const totalDepthValue = bidDepthValue + askDepthValue;
  const isThinMarket = totalDepthValue < 1000;

  const totalBidQty = displayBids.reduce((s, b) => s + b.quantity, 0);
  const totalAskQty = displayAsks.reduce((s, a) => s + a.quantity, 0);
  const totalQty = totalBidQty + totalAskQty;
  const bidPct = totalQty > 0 ? (totalBidQty / totalQty) * 100 : 50;
  const isPositive = priceChange >= 0;

  /* Best price detection */
  const bestAskPrice = displayAsks.length > 0 ? displayAsks[displayAsks.length - 1]?.price : null;
  const bestBidPrice = displayBids.length > 0 ? displayBids[0]?.price : null;

  if (isLoading) {
    return <div className="flex items-center justify-center h-32 text-[10px] text-[#94A3B8]">Loading…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls — compact for mobile split */}
      <div className="flex items-center justify-between px-1.5 py-1 border-b border-[hsl(230,20%,15%)]/40">
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

        <div className="flex items-center gap-1">
          <select
            value={precision}
            onChange={(e) => setPrecision(parseFloat(e.target.value))}
            className="h-5 text-[9px] font-mono bg-[hsl(230,20%,10%)] border-none rounded px-1 text-[#C7D2E0] cursor-pointer focus:outline-none appearance-none"
          >
            {precisionOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {isThinMarket && (
            <span className="text-[7px] font-bold uppercase text-warning bg-warning/10 px-1 py-0.5 rounded-full animate-pulse">
              Thin
            </span>
          )}
        </div>
      </div>

      {/* Column Header */}
      <div className="flex items-center px-1.5 py-0.5 text-[8px] font-bold text-[#94A3B8] uppercase tracking-wider">
        <span style={{ width: '44%' }}>Price</span>
        <span className="text-right" style={{ width: '28%' }}>Qty</span>
        <span className="text-right" style={{ width: '28%' }}>{showCumulative ? 'Cum' : 'Tot'}</span>
      </div>

      {/* Asks */}
      {mode !== 'bids' && (
        <div className="flex flex-col justify-end overflow-hidden min-h-0" style={{ flex: mode === 'split' ? '1 1 0%' : '1 1 auto' }}>
          {displayAsks.length > 0 ? displayAsks.map((ask) => (
            <BookRow
              key={`a-${ask.price}`}
              price={ask.price} quantity={ask.quantity} cumulative={ask.cumulative}
              maxCum={maxCumQty} side="ask" precision={precision}
              showCumulative={showCumulative} onClick={onPriceClick}
              isDust={ask.quantity <= askDust}
              isBest={ask.price === bestAskPrice}
            />
          )) : (
            <div className="flex items-center justify-center py-3 text-[9px] text-[#94A3B8]/30">No asks</div>
          )}
        </div>
      )}

      {/* ── Central Price ── */}
      <div
        className={cn(
          "flex items-center justify-between px-1.5 h-[32px] border-y border-[hsl(230,20%,18%)]/50 transition-colors duration-700 cursor-pointer",
          flashDir === 'up' && "bg-[#00E676]/8",
          flashDir === 'down' && "bg-[#FF4D4F]/8",
          !flashDir && "bg-[hsl(230,30%,6%)]"
        )}
        onClick={() => onPriceClick?.(effectivePrice)}
      >
        <div className="flex items-center gap-1">
          {isPositive
            ? <TrendingUp className="h-3.5 w-3.5 text-[#00E676]" />
            : <TrendingDown className="h-3.5 w-3.5 text-[#FF4D4F]" />
          }
          <span className={cn("text-[13px] font-extrabold font-mono tabular-nums", isPositive ? "text-[#00E676]" : "text-[#FF4D4F]")}>
            {effectivePrice >= 1 ? effectivePrice.toFixed(2) : effectivePrice.toFixed(6)}
          </span>
        </div>
        {spread > 0 && (
          <span className="text-[8px] font-mono text-[#94A3B8] font-semibold">
            {spreadPct.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Bids */}
      {mode !== 'asks' && (
        <div className="overflow-hidden min-h-0" style={{ flex: mode === 'split' ? '1 1 0%' : '1 1 auto' }}>
          {displayBids.length > 0 ? displayBids.map((bid) => (
            <BookRow
              key={`b-${bid.price}`}
              price={bid.price} quantity={bid.quantity} cumulative={bid.cumulative}
              maxCum={maxCumQty} side="bid" precision={precision}
              showCumulative={showCumulative} onClick={onPriceClick}
              isDust={bid.quantity <= bidDust}
              isBest={bid.price === bestBidPrice}
            />
          )) : (
            <div className="flex items-center justify-center py-3 text-[9px] text-[#94A3B8]/30">No bids</div>
          )}
        </div>
      )}

      {/* Pressure bar */}
      <div className="px-1.5 py-1.5 border-t border-[hsl(230,20%,18%)]/50">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono tabular-nums text-[#00E676] font-bold">{bidPct.toFixed(0)}%</span>
          <div className="flex-1 h-[4px] rounded-full overflow-hidden flex bg-[#060D18]">
            <div className="bg-[#00E676]/60 rounded-l-full transition-[width] duration-300" style={{ width: `${bidPct}%` }} />
            <div className="bg-[#FF4D4F]/60 rounded-r-full transition-[width] duration-300" style={{ width: `${100 - bidPct}%` }} />
          </div>
          <span className="text-[9px] font-mono tabular-nums text-[#FF4D4F] font-bold">{(100 - bidPct).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};