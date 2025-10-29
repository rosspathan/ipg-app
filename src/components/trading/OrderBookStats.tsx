import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useMemo } from "react";

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface OrderBookStatsProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  currentPrice: number;
}

export function OrderBookStats({ bids, asks, currentPrice }: OrderBookStatsProps) {
  const stats = useMemo(() => {
    const totalBidVolume = bids.reduce(
      (sum, { quantity }) => sum + quantity,
      0
    );
    const totalAskVolume = asks.reduce(
      (sum, { quantity }) => sum + quantity,
      0
    );

    const bidValue = bids.reduce(
      (sum, { price, quantity }) => sum + price * quantity,
      0
    );
    const askValue = asks.reduce(
      (sum, { price, quantity }) => sum + price * quantity,
      0
    );

    const totalVolume = totalBidVolume + totalAskVolume;
    const bidRatio = totalVolume > 0 ? (totalBidVolume / totalVolume) * 100 : 50;
    const askRatio = 100 - bidRatio;

    // Calculate VWAP (Volume Weighted Average Price)
    const vwap = totalVolume > 0 ? (bidValue + askValue) / totalVolume : currentPrice;

    return {
      totalBidVolume,
      totalAskVolume,
      bidRatio,
      askRatio,
      vwap,
      imbalance: bidRatio - askRatio,
    };
  }, [bids, asks, currentPrice]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Title */}
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Market Statistics
          </h3>
        </div>

        {/* Bid/Ask Ratio */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Bid/Ask Ratio</span>
            <span className="font-mono">
              {stats.bidRatio.toFixed(1)}% / {stats.askRatio.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-muted flex">
            <div
              className="bg-success transition-all duration-300"
              style={{ width: `${stats.bidRatio}%` }}
            />
            <div
              className="bg-destructive transition-all duration-300"
              style={{ width: `${stats.askRatio}%` }}
            />
          </div>
        </div>

        {/* VWAP */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">VWAP</span>
          <span className="text-sm font-mono font-medium">
            ${stats.vwap.toFixed(2)}
          </span>
        </div>

        {/* Market Imbalance */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Market Pressure</span>
          <div className="flex items-center gap-1">
            {stats.imbalance > 0 ? (
              <>
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                <span className="text-sm font-medium text-success">
                  Bullish
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Bearish
                </span>
              </>
            )}
          </div>
        </div>

        {/* Volume Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Bid Volume</div>
            <div className="text-sm font-mono font-medium text-success">
              {stats.totalBidVolume.toFixed(4)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Ask Volume</div>
            <div className="text-sm font-mono font-medium text-destructive">
              {stats.totalAskVolume.toFixed(4)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
