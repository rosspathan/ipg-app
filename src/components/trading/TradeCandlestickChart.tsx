import React, { useMemo, useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { isInternalPair } from '@/hooks/useInternalMarketPrice';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Loader2, Clock } from 'lucide-react';

const TradingViewWidget = lazy(() => import('@/components/TradingViewWidget'));

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bodyLow: number;
  bodyHigh: number;
  wickLow: number;
  wickHigh: number;
  bullish: boolean;
}

type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const INTERVALS: { value: Interval; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];

interface TradeCandlestickChartProps {
  symbol: string;
  quoteCurrency?: string;
}

export const TradeCandlestickChart: React.FC<TradeCandlestickChartProps> = ({
  symbol,
  quoteCurrency = 'USDT',
}) => {
  const [interval, setInterval] = useState<Interval>('1h');
  const isBinancePair = !isInternalPair(symbol);

  const { data: candles, isLoading } = useQuery({
    queryKey: ['trade-candles', symbol, interval],
    queryFn: async (): Promise<CandleData[]> => {
      const hoursBack = interval === '1d' ? 720 : interval === '4h' ? 168 : interval === '1h' ? 48 : interval === '15m' ? 12 : interval === '5m' ? 6 : 2;
      const since = new Date(Date.now() - hoursBack * 3600 * 1000).toISOString();

      const { data: trades, error } = await supabase
        .from('trades')
        .select('price, quantity, created_at')
        .eq('symbol', symbol)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(2000);

      if (error || !trades || trades.length === 0) return [];

      const bucketMs = interval === '1d' ? 86400000 : interval === '4h' ? 14400000 : interval === '1h' ? 3600000 : interval === '15m' ? 900000 : interval === '5m' ? 300000 : 60000;
      const buckets = new Map<number, { prices: number[]; volumes: number[]; first: number; last: number }>();

      trades.forEach((t) => {
        const ts = new Date(t.created_at).getTime();
        const bucketKey = Math.floor(ts / bucketMs) * bucketMs;
        if (!buckets.has(bucketKey)) {
          buckets.set(bucketKey, { prices: [], volumes: [], first: t.price, last: t.price });
        }
        const b = buckets.get(bucketKey)!;
        b.prices.push(t.price);
        b.volumes.push(t.quantity);
        b.last = t.price;
      });

      return Array.from(buckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([ts, b]) => {
          const open = b.first;
          const close = b.last;
          const high = Math.max(...b.prices);
          const low = Math.min(...b.prices);
          const volume = b.volumes.reduce((s, v) => s + v, 0);
          const bullish = close >= open;

          return {
            time: new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            open, high, low, close, volume,
            bodyLow: Math.min(open, close),
            bodyHigh: Math.max(open, close),
            wickLow: low,
            wickHigh: high,
            bullish,
          };
        });
    },
    enabled: !isBinancePair,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const formatPrice = (v: number) => (v >= 1 ? v.toFixed(2) : v.toFixed(6));

  const yDomain = useMemo(() => {
    if (!candles || candles.length === 0) return [0, 1];
    const allLow = Math.min(...candles.map((c) => c.low));
    const allHigh = Math.max(...candles.map((c) => c.high));
    const padding = (allHigh - allLow) * 0.15 || allHigh * 0.05;
    return [allLow - padding, allHigh + padding];
  }, [candles]);

  const trendUp = useMemo(() => {
    if (!candles || candles.length < 2) return true;
    return candles[candles.length - 1].close >= candles[0].close;
  }, [candles]);

  const accentColor = trendUp ? '#2EBD85' : '#F6465D';

  // For Binance-listed pairs, show TradingView widget
  if (isBinancePair) {
    const tvSymbol = `BINANCE:${symbol.replace('/', '')}`;
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Suspense fallback={
          <div className="h-[200px] flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        }>
          <TradingViewWidget
            symbol={tvSymbol}
            height={240}
            width="100%"
            colorTheme="dark"
            widgetType="advanced-chart"
            showControls={false}
          />
        </Suspense>
      </div>
    );
  }

  const IntervalBar = () => (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[11px] font-medium text-muted-foreground">Chart</span>
      <div className="flex gap-0.5">
        {INTERVALS.map((i) => (
          <button
            key={i.value}
            onClick={() => setInterval(i.value)}
            className={cn(
              "px-2 py-1 text-[10px] font-semibold rounded-md transition-colors duration-150",
              interval === i.value
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <IntervalBar />
        <div className="h-[180px] flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!candles || candles.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <IntervalBar />
        <div className="h-[160px] flex flex-col items-center justify-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground text-[11px]">Waiting for first trade...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <IntervalBar />

      {/* Area Chart */}
      <div className="px-1 pb-2 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={candles} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.25} />
                <stop offset="50%" stopColor={accentColor} stopOpacity={0.08} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatPrice}
              width={55}
              orientation="right"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '10px',
                fontSize: '11px',
                color: 'hsl(var(--foreground))',
                boxShadow: `0 4px 20px ${accentColor}15`,
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '10px' }}
              formatter={(value: number) => [formatPrice(value), 'Price']}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={accentColor}
              strokeWidth={2}
              fill="url(#areaGradient)"
              filter="url(#glow)"
              dot={false}
              activeDot={{
                r: 4,
                fill: accentColor,
                stroke: 'hsl(var(--card))',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
