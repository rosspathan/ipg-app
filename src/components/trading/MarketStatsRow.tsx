import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MarketStatsRowProps {
  lastPrice: number;
  priceChange24h: number;
  volume24h: number;
  currency?: string;
}

export function MarketStatsRow({ 
  lastPrice, 
  priceChange24h, 
  volume24h,
  currency = "INR"
}: MarketStatsRowProps) {
  const isPositive = priceChange24h >= 0;

  return (
    <div 
      className="grid grid-cols-3 gap-2 p-4"
      data-testid="market-stats"
    >
      {/* Last Price */}
      <Card className="p-3 bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/30 transition-all">
        <div className="text-xs text-muted-foreground mb-1">Last Price</div>
        <div className="text-lg font-bold">
          ₹{lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </Card>

      {/* 24h Change */}
      <Card className={`p-3 border-border/50 hover:border-primary/30 transition-all ${
        isPositive ? 'bg-gradient-to-br from-green-500/10 to-green-500/5' : 'bg-gradient-to-br from-red-500/10 to-red-500/5'
      }`}>
        <div className="text-xs text-muted-foreground mb-1">24h Change</div>
        <div className={`text-lg font-bold flex items-center gap-1 ${
          isPositive ? 'text-green-500' : 'text-red-500'
        }`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
        </div>
      </Card>

      {/* 24h Volume */}
      <Card className="p-3 bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/30 transition-all">
        <div className="text-xs text-muted-foreground mb-1">24h Vol</div>
        <div className="text-lg font-bold flex items-center gap-1">
          <Activity className="h-4 w-4 text-primary" />
          {volume24h >= 1000000 
            ? `${(volume24h / 1000000).toFixed(1)}M` 
            : `${(volume24h / 1000).toFixed(0)}K`
          }
        </div>
      </Card>
    </div>
  );
}
