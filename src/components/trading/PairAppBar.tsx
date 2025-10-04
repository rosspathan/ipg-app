import { ChevronLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PairAppBarProps {
  pair: string;
  mode: "LIVE" | "SIM";
  lastPrice: number;
  priceChange24h: number;
  volume24h: number;
  currency?: string;
  isFavorite?: boolean;
  onBack?: () => void;
  onToggleFavorite: () => void;
  onPairClick: () => void;
}

export function PairAppBar({
  pair,
  mode,
  lastPrice,
  priceChange24h,
  volume24h,
  currency = "₹",
  isFavorite = false,
  onBack,
  onToggleFavorite,
  onPairClick
}: PairAppBarProps) {
  const isPositive = priceChange24h >= 0;

  return (
    <header 
      data-testid="pair-appbar"
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-9 w-9 p-0"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          <button
            onClick={onPairClick}
            className="flex-1 flex items-center gap-2 text-left"
            aria-label="Open pair picker"
          >
            <span className="text-xl font-bold tracking-tight text-foreground">
              {pair}
            </span>
          </button>

          <Badge 
            variant={mode === "LIVE" ? "default" : "secondary"}
            className="h-7 px-2.5 text-xs font-semibold"
          >
            {mode === "LIVE" ? "🔴 LIVE" : "🟣 SIM"}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFavorite}
            className="h-9 w-9 p-0"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star 
              className={`h-5 w-5 transition-all duration-220 ${
                isFavorite 
                  ? "fill-yellow-500 text-yellow-500" 
                  : "text-muted-foreground hover:text-yellow-500"
              }`} 
            />
          </Button>
        </div>

        <div data-testid="kpi-row" className="space-y-1">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums text-foreground">
              {currency}{lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-sm font-semibold tabular-nums ${
              isPositive ? "text-success" : "text-destructive"
            }`}>
              {isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            24h Vol: {currency}{volume24h >= 10000000 ? `${(volume24h / 10000000).toFixed(2)}Cr` : 
                      volume24h >= 100000 ? `${(volume24h / 100000).toFixed(2)}L` : 
                      volume24h >= 1000 ? `${(volume24h / 1000).toFixed(2)}K` : 
                      volume24h.toFixed(2)}
          </div>
        </div>
      </div>
    </header>
  );
}
