import React, { memo, useMemo, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface OrderBookEntry {
  price: number;
  quantity: number;
}

type GroupMode = 'split' | 'bids' | 'asks';

interface OrderBookUnifiedProps {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  currentPrice: number;
  priceChange?: number;
  quoteCurrency?: string;
  baseCurrency?: string;
  onPriceClick?: (price: number) => void;
  isLoading?: boolean;
  maxRows?: number;
}

/* ── Precision options based on price range ── */
const getPrecisionOptions = (price: number) => {
  if (price >= 1000) return [1, 10, 50, 100];
  if (price >= 100) return [0.1, 1, 5, 10];
  if (price >= 1) return [0.01, 0.1, 1, 5];
  if (price >= 0.01) return [0.0001, 0.001, 0.01, 0.1];
  return [0.000001, 0.00001, 0.0001, 0.001];
};

const getDefaultPrecision = (price: number) => {
  const opts = getPrecisionOptions(price);
  return opts[0];
};

/* ── Aggregation ── */
const aggregateByPrecision = (
  entries: OrderBookEntry[],
  precision: number,
  side: 'bid' | 'ask'
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

/* ── Format helpers ── */
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

/* ── Liquidity meter ── */
const LiquidityMeter: React.FC<{ bids: OrderBookEntry[]; asks: OrderBookEntry[]; currentPrice: number }> = memo(
  ({ bids, asks, currentPrice }) => {
    const band = currentPrice * 0.02; // 2% band
    const bidDepth = bids.filter(b => b.price >= currentPrice - band).reduce((s, b) => s + b.quantity * b.price, 0);
    const askDepth = asks.filter(a => a.price <= currentPrice + band).reduce((s, a) => s + a.quantity * a.price, 0);
    const totalDepth = bidDepth + askDepth;

    const level = totalDepth > 10000 ? 'High' : totalDepth > 1000 ? 'Medium' : 'Low';
    const color = level === 'High' ? 'text-success' : level === 'Medium' ? 'text-warning' : 'text-danger';

    return (
      <div className="flex items-center gap-1">
        <Activity className={cn("h-2.5 w-2.5", color)} />
        <span className={cn("text-[9px] font-semibold uppercase tracking-wider", color)}>{level}</span>
      </div>
    );
  }
);
LiquidityMeter.displayName = 'LiquidityMeter';

/* ── Single Row ── */
const ROW_H = 24;
const BookRow = memo(({
  price,
  quantity,
  cumulative,
  maxQty,
  side,
  precision,
  showCumulative,
  onClick,
}: {
  price: number;
  quantity: number;
  cumulative: number;
  maxQty: number;
  side: 'ask' | 'bid';
  precision: number;
  showCumulative: boolean;
  onClick?: (p: number) => void;
}) => {
  const depthPct = maxQty > 0 ? Math.min((cumulative / maxQty) * 100, 100) : 0;
  const isAsk = side === 'ask';

  return (
    <div
      onClick={() => onClick?.(price)}
      className="relative grid grid-cols-3 items-center cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors duration-50"
      style={{ height: ROW_H, padding: '0 6px' }}
    >
      <div
        className={cn(
          "absolute top-0 bottom-0 pointer-events-none transition-[width] duration-200",
          isAsk ? "bg-danger/8 right-0" : "bg-success/8 right-0"
        )}
        style={{ width: `${depthPct}%` }}
      />
      <span className={cn(
        "relative z-10 text-[11px] font-mono tabular-nums text-left",
        isAsk ? "text-danger" : "text-success"
      )}>
        {fmtPrice(price, precision)}
      </span>
      <span className="relative z-10 text-[11px] font-mono tabular-nums text-right text-muted-foreground">
        {fmtQty(quantity)}
      </span>
      <span className="relative z-10 text-[11px] font-mono tabular-nums text-right text-muted-foreground/60">
        {showCumulative ? fmtQty(cumulative) : fmtQty(quantity * price)}
      </span>
    </div>
  );
});
BookRow.displayName = 'BookRow';

/* ── Main Component ── */
export const OrderBookUnified: React.FC<OrderBookUnifiedProps> = ({
  asks,
  bids,
  currentPrice,
  priceChange = 0,
  quoteCurrency = 'USDT',
  baseCurrency,
  onPriceClick,
  isLoading = false,
  maxRows = 12,
}) => {
  const [mode, setMode] = useState<GroupMode>('split');
  const [showCumulative, setShowCumulative] = useState(false);
  const [precision, setPrecision] = useState(() => getDefaultPrecision(currentPrice));
  const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(currentPrice);

  // Auto-adjust precision when price changes significantly
  useEffect(() => {
    const opts = getPrecisionOptions(currentPrice);
    if (!opts.includes(precision)) {
      setPrecision(opts[0]);
    }
  }, [currentPrice]);

  // Flash animation on price change
  useEffect(() => {
    if (currentPrice !== prevPriceRef.current) {
      setFlashDir(currentPrice > prevPriceRef.current ? 'up' : 'down');
      prevPriceRef.current = currentPrice;
      const t = setTimeout(() => setFlashDir(null), 600);
      return () => clearTimeout(t);
    }
  }, [currentPrice]);

  const precisionOptions = useMemo(() => getPrecisionOptions(currentPrice), [currentPrice]);

  const aggBids = useMemo(() => aggregateByPrecision(bids, precision, 'bid'), [bids, precision]);
  const aggAsks = useMemo(() => aggregateByPrecision(asks, precision, 'ask'), [asks, precision]);

  const rowsPerSide = mode === 'split' ? maxRows : maxRows * 2;
  const displayAsks = useMemo(() => aggAsks.slice(0, rowsPerSide).reverse(), [aggAsks, rowsPerSide]);
  const displayBids = useMemo(() => aggBids.slice(0, rowsPerSide), [aggBids, rowsPerSide]);

  const maxCumQty = useMemo(() => {
    const allCum = [...displayAsks, ...displayBids].map(e => e.cumulative);
    return Math.max(...allCum, 1);
  }, [displayAsks, displayBids]);

  // Spread
  const bestBid = aggBids[0]?.price || 0;
  const bestAsk = aggAsks[0]?.price || 0;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;

  // Pressure
  const totalBidQty = displayBids.reduce((s, b) => s + b.quantity, 0);
  const totalAskQty = displayAsks.reduce((s, a) => s + a.quantity, 0);
  const totalQty = totalBidQty + totalAskQty;
  const bidPct = totalQty > 0 ? (totalBidQty / totalQty) * 100 : 50;

  const isPositive = priceChange >= 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-[10px] text-muted-foreground">
        Loading order book…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border/40 rounded-lg overflow-hidden">
      {/* ── Controls Bar ── */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40 bg-card">
        {/* Mode Toggle */}
        <div className="flex items-center gap-0.5 bg-muted/40 rounded p-0.5">
          <button
            onClick={() => setMode('split')}
            className={cn("p-1 rounded transition-colors", mode === 'split' ? "bg-background shadow-sm" : "hover:bg-muted")}
          >
            <div className="flex flex-col gap-[2px]">
              <div className="h-[2px] w-3 bg-danger rounded-full" />
              <div className="h-[2px] w-3 bg-success rounded-full" />
            </div>
          </button>
          <button
            onClick={() => setMode('bids')}
            className={cn("p-1 rounded transition-colors", mode === 'bids' ? "bg-background shadow-sm" : "hover:bg-muted")}
          >
            <div className="h-3 w-3 bg-success/20 border border-success/40 rounded-[2px]" />
          </button>
          <button
            onClick={() => setMode('asks')}
            className={cn("p-1 rounded transition-colors", mode === 'asks' ? "bg-background shadow-sm" : "hover:bg-muted")}
          >
            <div className="h-3 w-3 bg-danger/20 border border-danger/40 rounded-[2px]" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Cumulative Toggle */}
          <button
            onClick={() => setShowCumulative(!showCumulative)}
            className={cn(
              "text-[8px] font-bold px-1.5 py-0.5 rounded transition-colors uppercase tracking-wider",
              showCumulative ? "bg-accent/15 text-accent" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            )}
          >
            Σ
          </button>

          {/* Precision Selector */}
          <select
            value={precision}
            onChange={(e) => setPrecision(parseFloat(e.target.value))}
            className="h-5 text-[9px] font-mono bg-muted/40 border-none rounded px-1 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/30"
          >
            {precisionOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <LiquidityMeter bids={bids} asks={asks} currentPrice={currentPrice} />
        </div>
      </div>

      {/* ── Column Headers ── */}
      <div className="grid grid-cols-3 px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
        <span className="text-left">Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">{showCumulative ? 'Cum' : 'Total'}</span>
      </div>

      {/* ── Asks ── */}
      {mode !== 'bids' && (
        <div className="flex-1 flex flex-col justify-end overflow-hidden min-h-0">
          {displayAsks.length > 0 ? (
            displayAsks.map((ask, i) => (
              <BookRow
                key={`a-${ask.price}-${i}`}
                price={ask.price}
                quantity={ask.quantity}
                cumulative={ask.cumulative}
                maxQty={maxCumQty}
                side="ask"
                precision={precision}
                showCumulative={showCumulative}
                onClick={onPriceClick}
              />
            ))
          ) : (
            <div className="flex items-center justify-center py-3 text-[10px] text-muted-foreground/40">
              No sell orders
            </div>
          )}
        </div>
      )}

      {/* ── Spread / Price Indicator ── */}
      <div
        className={cn(
          "flex items-center justify-between px-2 py-1.5 border-y border-border/40 transition-colors duration-500",
          flashDir === 'up' && "bg-success/8",
          flashDir === 'down' && "bg-danger/8",
          !flashDir && "bg-muted/20"
        )}
        onClick={() => onPriceClick?.(currentPrice)}
        style={{ cursor: 'pointer' }}
      >
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-success" />
          ) : (
            <TrendingDown className="h-3 w-3 text-danger" />
          )}
          <span className={cn(
            "text-[14px] font-bold font-mono tabular-nums",
            isPositive ? "text-success" : "text-danger"
          )}>
            {currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {spread > 0 && (
            <span className="text-[9px] font-mono text-muted-foreground">
              Spread <span className="text-foreground/70">{fmtPrice(spread, precision)}</span>
              <span className="text-accent ml-1">{spreadPct.toFixed(2)}%</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Bids ── */}
      {mode !== 'asks' && (
        <div className="flex-1 overflow-hidden min-h-0">
          {displayBids.length > 0 ? (
            displayBids.map((bid, i) => (
              <BookRow
                key={`b-${bid.price}-${i}`}
                price={bid.price}
                quantity={bid.quantity}
                cumulative={bid.cumulative}
                maxQty={maxCumQty}
                side="bid"
                precision={precision}
                showCumulative={showCumulative}
                onClick={onPriceClick}
              />
            ))
          ) : (
            <div className="flex items-center justify-center py-3 text-[10px] text-muted-foreground/40">
              No buy orders
            </div>
          )}
        </div>
      )}

      {/* ── Pressure Bar ── */}
      <div className="px-2 py-1.5 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono tabular-nums text-success w-8">{bidPct.toFixed(0)}%</span>
          <div className="flex-1 h-[3px] rounded-full overflow-hidden flex bg-muted/40">
            <div className="bg-success rounded-l-full transition-[width] duration-300" style={{ width: `${bidPct}%` }} />
            <div className="bg-danger rounded-r-full transition-[width] duration-300" style={{ width: `${100 - bidPct}%` }} />
          </div>
          <span className="text-[9px] font-mono tabular-nums text-danger w-8 text-right">{(100 - bidPct).toFixed(0)}%</span>
        </div>

        {/* Thin market badge */}
        {totalQty > 0 && totalQty < 10 && (
          <div className="flex items-center justify-center mt-1">
            <span className="text-[8px] font-bold uppercase tracking-widest text-warning bg-warning/10 px-2 py-0.5 rounded-full">
              Thin Market
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
