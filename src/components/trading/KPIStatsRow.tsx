import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

interface KPIStatsRowProps {
  lastPrice: number;
  priceChange24h: number;
  volume24h: number;
  currency?: string;
  onPress?: () => void;
}

export function KPIStatsRow({
  lastPrice,
  priceChange24h,
  volume24h,
  currency = "₹",
  onPress
}: KPIStatsRowProps) {
  const isPositive = priceChange24h >= 0;

  const formatVolume = (vol: number) => {
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)}Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)}L`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  return (
    <div 
      data-testid="market-stats"
      className="grid grid-cols-3 gap-2 px-4 py-3"
    >
      <Card 
        className="p-3 bg-card/30 border border-border/50 cursor-pointer hover:bg-card/50 transition-all duration-120 active:scale-[0.98]"
        onClick={onPress}
      >
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Last Price</p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {currency}{lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </Card>

      <Card 
        className="p-3 bg-card/30 border border-border/50 cursor-pointer hover:bg-card/50 transition-all duration-120 active:scale-[0.98]"
        onClick={onPress}
      >
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">24h Change</p>
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <p className={`text-lg font-bold tabular-nums ${
              isPositive ? "text-success" : "text-destructive"
            }`}>
              {isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%
            </p>
          </div>
        </div>
      </Card>

      <Card 
        className="p-3 bg-card/30 border border-border/50 cursor-pointer hover:bg-card/50 transition-all duration-120 active:scale-[0.98]"
        onClick={onPress}
      >
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">24h Volume</p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {currency}{formatVolume(volume24h)}
          </p>
        </div>
      </Card>
    </div>
  );
}
