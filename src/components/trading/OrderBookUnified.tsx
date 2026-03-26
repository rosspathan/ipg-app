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
  return p.toFixed(Math.min(decimals + 1, 8));
};

const fmtQty = (q: number) => {
  if (q >= 1_000_000) return `${(q / 1_000_000).toFixed(1)}M`;
  if (q >= 10_000) return `${(q / 1_000).toFixed(1)}K`;
  if (q >= 100) return q.toFixed(2);
  if (q >= 1) return q.toFixed(4);
  return q.toFixed(6);
};

const getDustThreshold = (entries: OrderBookEntry[]) => {
  if (entries.length < 3) return 0;
  const quantities = entries.map(e => e.quantity).sort((a, b) => a - b);
  const median = quantities[Math.floor(quantities.length / 2)];
  return median * 0.05;
};

const ROW_H = 24;

const BookRow = memo(({
  price, quantity, cumulative, maxCum, side, precision, showCumulative, onClick, isDust,
}: {
  price: number; quantity: number; cumulative: number; maxCum: number;
  side: 'ask' | 'bid'; precision: number; showCumulative: boolean;
  onClick?: (p: number) => void; isDust: boolean;
}) => {
  const depthPct = maxCum > 0 ? Math.min((cumulative / maxCum) * 100, 100) : 0;
  const isAsk = side === 'ask';

  return (
    <div
      onClick={() => onClick?.(price)}
      className={cn(
        "relative grid grid-cols-3 items-center cursor-pointer active:bg-[hsl(230,20%,14%)] transition-colors",
        isDust && "opacity-25"
      )}
      style={{ height: ROW_H, padding: '0 8px' }}
    >
      <div
        className={cn(
          "absolute top-0 bottom-0 right-0 pointer-events-none transition-[width] duration-300",
          isAsk ? "bg-danger/[0.07]" : "bg-success/[0.07]"
        )}
        style={{ width: `${depthPct}%` }}
      />
      <span className={cn(
        "relative z-10 text-[11px] font-mono tabular-nums text-left leading-none font-semibold",
        isAsk ? "text-danger" : "text-success"
      )}>
        {fmtPrice(price, precision)}
      </span>
      <span className="relative z-10 text-[10px] font-mono tabular-nums text-right text-foreground/50 leading-none">
        {fmtQty(quantity)}
      </span>
      <span className="relative z-10 text-[10px] font-mono tabular-nums text-right text-foreground/25 leading-none">
        {showCumulative ? fmtQty(cumulative) : fmtQty(quantity * price)}
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-32 text-[10px] text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[hsl(230,20%,12%)]/40">
        <div className="flex items-center gap-1 bg-[hsl(230,20%,10%)] rounded-md p-[2px]">
          {([
            { key: 'split', el: <><div className="h-[3px] w-3 bg-danger/70 rounded-full" /><div className="h-[3px] w-3 bg-success/70 rounded-full" /></> },
            { key: 'bids', el: <div className="h-3 w-3 bg-success/15 border border-success/30 rounded-[2px]" /> },
            { key: 'asks', el: <div className="h-3 w-3 bg-danger/15 border border-danger/30 rounded-[2px]" /> },
          ] as const).map(({ key, el }) => (
            <button
              key={key}
              onClick={() => setMode(key as GroupMode)}
              className={cn("p-1 rounded-md transition-colors", mode === key ? "bg-[hsl(230,25%,16%)] shadow-sm" : "hover:bg-[hsl(230,20%,14%)]")}
            >
              <div className="flex flex-col gap-[2px]">{el}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCumulative(!showCumulative)}
            className={cn(
              "text-[8px] font-bold w-5 h-5 rounded flex items-center justify-center transition-colors",
              showCumulative ? "bg-accent/15 text-accent" : "bg-[hsl(230,20%,10%)] text-muted-foreground/40"
            )}
          >Σ</button>
          <select
            value={precision}
            onChange={(e) => setPrecision(parseFloat(e.target.value))}
            className="h-5 text-[8px] font-mono bg-[hsl(230,20%,10%)] border-none rounded px-1.5 text-foreground/70 cursor-pointer focus:outline-none appearance-none"
          >
            {precisionOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {isThinMarket && (
            <span className="text-[7px] font-bold uppercase tracking-wider text-warning bg-warning/10 px-1.5 py-0.5 rounded-full animate-pulse">
              Thin
            </span>
          )}
        </div>
      </div>

      {/* Column Header */}
      <div className="grid grid-cols-3 px-2 py-1 text-[8px] font-bold text-muted-foreground/35 uppercase tracking-widest">
        <span>Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">{showCumulative ? 'Cum' : 'Total'}</span>
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
            />
          )) : (
            <div className="flex items-center justify-center py-3 text-[9px] text-muted-foreground/20">No asks</div>
          )}
        </div>
      )}

      {/* ── Central Price ── */}
      <div
        className={cn(
          "flex items-center justify-between px-2 h-[36px] border-y border-[hsl(230,20%,12%)]/40 transition-colors duration-700 cursor-pointer",
          flashDir === 'up' && "bg-success/8",
          flashDir === 'down' && "bg-danger/8",
          !flashDir && "bg-[hsl(230,30%,6%)]"
        )}
        onClick={() => onPriceClick?.(effectivePrice)}
      >
        <div className="flex items-center gap-1.5">
          {isPositive
            ? <TrendingUp className="h-3.5 w-3.5 text-success" />
            : <TrendingDown className="h-3.5 w-3.5 text-danger" />
          }
          <span className={cn("text-[15px] font-extrabold font-mono tabular-nums", isPositive ? "text-success" : "text-danger")}>
            {effectivePrice >= 1 ? effectivePrice.toFixed(2) : effectivePrice.toFixed(6)}
          </span>
        </div>
        {spread > 0 && (
          <span className="text-[8px] font-mono text-muted-foreground/40 font-semibold">
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
            />
          )) : (
            <div className="flex items-center justify-center py-3 text-[9px] text-muted-foreground/20">No bids</div>
          )}
        </div>
      )}

      {/* Pressure bar */}
      <div className="px-2 py-2 border-t border-[hsl(230,20%,12%)]/40">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono tabular-nums text-success font-bold w-7">{bidPct.toFixed(0)}%</span>
          <div className="flex-1 h-[4px] rounded-full overflow-hidden flex bg-[hsl(230,20%,10%)]">
            <div className="bg-success/50 rounded-l-full transition-[width] duration-300" style={{ width: `${bidPct}%` }} />
            <div className="bg-danger/50 rounded-r-full transition-[width] duration-300" style={{ width: `${100 - bidPct}%` }} />
          </div>
          <span className="text-[9px] font-mono tabular-nums text-danger font-bold w-7 text-right">{(100 - bidPct).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};
