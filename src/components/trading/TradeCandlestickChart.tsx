import React, { useMemo, useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { isInternalPair } from '@/hooks/useInternalMarketPrice';
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
import { BarChart3, Loader2, Clock } from 'lucide-react';

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
    const padding = (allHigh - allLow) * 0.1 || allHigh * 0.05;
    return [allLow - padding, allHigh + padding];
  }, [candles]);

  // For Binance-listed pairs, show TradingView widget
  if (isBinancePair) {
    const tvSymbol = `BINANCE:${symbol.replace('/', '')}`;
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
        <Suspense fallback={
          <div className="h-[200px] flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-[#9CA3AF]" />
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

  if (isLoading) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 flex items-center justify-center h-[200px]">
        <Loader2 className="h-4 w-4 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  if (!candles || candles.length === 0) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1F2937]">
          <span className="text-[11px] font-medium text-[#9CA3AF]">Chart</span>
          <div className="flex gap-0.5">
            {INTERVALS.map((i) => (
              <button
                key={i.value}
                onClick={() => setInterval(i.value)}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium rounded-md",
                  interval === i.value ? "bg-white/10 text-[#E5E7EB]" : "text-[#9CA3AF] hover:text-[#E5E7EB]"
                )}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[160px] flex flex-col items-center justify-center gap-1.5">
          <Clock className="h-4 w-4 text-[#9CA3AF]" />
          <span className="text-[#9CA3AF] text-[11px]">Waiting for first trade...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1F2937]">
        <span className="text-[11px] font-medium text-[#9CA3AF]">Chart</span>
        <div className="flex gap-0.5">
          {INTERVALS.map((i) => (
            <button
              key={i.value}
              onClick={() => setInterval(i.value)}
              className={cn(
                "px-2 py-1 text-[10px] font-semibold rounded-md",
                interval === i.value
                  ? "bg-white/10 text-[#E5E7EB] border border-[#1F2937]"
                  : "text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-white/5"
              )}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-1 py-1.5 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={candles} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" opacity={0.4} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#64748B' }}
              axisLine={{ stroke: '#1F2937' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 9, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatPrice}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#121826',
                border: '1px solid #1F2937',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#E2E8F0',
              }}
              labelStyle={{ color: '#94A3B8' }}
              formatter={(value: number, name: string) => [formatPrice(value), name]}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#7C4DFF"
              strokeWidth={1.5}
              dot={false}
              name="Close"
            />
            <Bar dataKey="volume" name="Volume" barSize={6} opacity={0.3} yAxisId="volume">
              {candles.map((c, i) => (
                <Cell
                  key={i}
                  fill={c.bullish ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)'}
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
