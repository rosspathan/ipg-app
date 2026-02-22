import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface OrderBookDepthBarProps {
  bids: { price: number; quantity: number }[];
  asks: { price: number; quantity: number }[];
  currentPrice: number;
}

export const OrderBookDepthBar: React.FC<OrderBookDepthBarProps> = ({ bids, asks, currentPrice }) => {
  const { bidVolume, askVolume, ratio, bidCumulative, askCumulative } = useMemo(() => {
    const bidVol = bids.reduce((sum, b) => sum + b.quantity, 0);
    const askVol = asks.reduce((sum, a) => sum + a.quantity, 0);
    const total = bidVol + askVol;
    const r = total > 0 ? (bidVol / total) * 100 : 50;

    // Cumulative depth (top 10 levels)
    const topBids = bids.slice(0, 10);
    const topAsks = asks.slice(0, 10);
    
    let cumBid = 0;
    const bidCum = topBids.map(b => { cumBid += b.quantity; return cumBid; });
    let cumAsk = 0;
    const askCum = topAsks.map(a => { cumAsk += a.quantity; return cumAsk; });

    return { bidVolume: bidVol, askVolume: askVol, ratio: r, bidCumulative: bidCum, askCumulative: askCum };
  }, [bids, asks]);

  const maxCum = Math.max(
    ...bidCumulative, 
    ...askCumulative, 
    1
  );

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Market Depth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Buy/Sell Pressure Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-green-500 font-medium">Buyers {ratio.toFixed(0)}%</span>
            <span className="text-red-500 font-medium">Sellers {(100 - ratio).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div 
              className="h-full bg-green-500 rounded-l-full transition-all duration-500"
              style={{ width: `${ratio}%` }}
            />
            <div 
              className="h-full bg-red-500 rounded-r-full transition-all duration-500"
              style={{ width: `${100 - ratio}%` }}
            />
          </div>
        </div>

        {/* Cumulative Depth Visualization */}
        <div className="flex gap-1 items-end h-16">
          {/* Bid side (reversed) */}
          <div className="flex-1 flex gap-[1px] items-end justify-end">
            {[...bidCumulative].reverse().map((cum, i) => (
              <div
                key={`bid-${i}`}
                className="flex-1 bg-green-500/40 rounded-t-sm transition-all duration-300 min-w-[3px]"
                style={{ height: `${(cum / maxCum) * 100}%` }}
              />
            ))}
          </div>
          
          {/* Center divider */}
          <div className="w-px h-full bg-border" />
          
          {/* Ask side */}
          <div className="flex-1 flex gap-[1px] items-end">
            {askCumulative.map((cum, i) => (
              <div
                key={`ask-${i}`}
                className="flex-1 bg-red-500/40 rounded-t-sm transition-all duration-300 min-w-[3px]"
                style={{ height: `${(cum / maxCum) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Volume Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-1.5 rounded bg-green-500/10">
            <div className="text-muted-foreground">Bid Volume</div>
            <div className="font-mono font-medium text-green-500">{bidVolume.toFixed(2)}</div>
          </div>
          <div className="text-center p-1.5 rounded bg-red-500/10">
            <div className="text-muted-foreground">Ask Volume</div>
            <div className="font-mono font-medium text-red-500">{askVolume.toFixed(2)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
