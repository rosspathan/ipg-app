import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Line,
} from 'recharts';
import { BarChart3, Loader2 } from 'lucide-react';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // For recharts bar rendering (wick + body)
  bodyLow: number;
  bodyHigh: number;
  wickLow: number;
  wickHigh: number;
  bullish: boolean;
}

type Interval = '1h' | '4h' | '1d';

const INTERVALS: { value: Interval; label: string }[] = [
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

  const { data: candles, isLoading } = useQuery({
    queryKey: ['trade-candles', symbol, interval],
    queryFn: async (): Promise<CandleData[]> => {
      // Fetch trades for this symbol
      const hoursBack = interval === '1d' ? 720 : interval === '4h' ? 168 : 48;
      const since = new Date(Date.now() - hoursBack * 3600 * 1000).toISOString();

      const { data: trades, error } = await supabase
        .from('trades')
        .select('price, quantity, created_at')
        .eq('symbol', symbol)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(2000);

      if (error || !trades || trades.length === 0) return [];

      // Bucket trades into candles
      const bucketMs = interval === '1d' ? 86400000 : interval === '4h' ? 14400000 : 3600000;
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
            open,
            high,
            low,
            close,
            volume,
            bodyLow: Math.min(open, close),
            bodyHigh: Math.max(open, close),
            wickLow: low,
            wickHigh: high,
            bullish,
          };
        });
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const formatPrice = (v: number) => (v >= 1 ? v.toFixed(2) : v.toFixed(6));

  const yDomain = useMemo(() => {
    if (!candles || candles.length === 0) return [0, 1];
    const allLow = Math.min(...candles.map((c) => c.low));
    const allHigh = Math.max(...candles.map((c) => c.high));
    const padding = (allHigh - allLow) * 0.1 || allHigh * 0.05;
    return [allLow - padding, allHigh + padding];
  }, [candles]);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center h-48">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!candles || candles.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Price Chart</span>
        </div>
        <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">
          No trade data yet for this pair
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Chart</span>
        </div>
        <div className="flex gap-1">
          {INTERVALS.map((i) => (
            <button
              key={i.value}
              onClick={() => setInterval(i.value)}
              className={cn(
                "px-2 py-1 text-[10px] font-semibold rounded transition-colors",
                interval === i.value
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-1 py-2 h-44 sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={candles} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => [formatPrice(value), name]}
            />
            {/* Close price line for trend visualization */}
            <Line
              type="monotone"
              dataKey="close"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              dot={false}
              name="Close"
            />
            {/* Volume bars at bottom */}
            <Bar dataKey="volume" name="Volume" barSize={6} opacity={0.3} yAxisId="volume">
              {candles.map((c, i) => (
                <Cell
                  key={i}
                  fill={c.bullish ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                />
              ))}
            </Bar>
            <YAxis yAxisId="volume" orientation="right" hide domain={[0, (d: number) => d * 5]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
