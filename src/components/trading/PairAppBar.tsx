import { ChevronLeft, Star, ChevronDown } from "lucide-react";
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
      className="sticky top-0 z-30 bg-background/98 backdrop-blur-xl border-b border-border/30"
    >
      <div className="px-4 py-4">
        {/* Top Row: Pair + Mode + Favorite */}
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <button
            onClick={onPairClick}
            className="flex items-center gap-2 group transition-all duration-220 hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Open pair picker"
          >
            <span className="text-2xl font-bold tracking-tight text-foreground font-heading">
              {pair}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-220" />
          </button>

          <div className="flex items-center gap-2">
            <Badge 
              variant={mode === "LIVE" ? "default" : "secondary"}
              className="h-7 px-3 text-xs font-semibold transition-all duration-220 hover:scale-105"
            >
              {mode === "LIVE" ? "🔴 LIVE" : "🟣 SIM"}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFavorite}
              className="h-9 w-9 p-0 transition-all duration-220 hover:scale-110 active:scale-95"
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star 
                className={`h-5 w-5 transition-all duration-320 ${
                  isFavorite 
                    ? "fill-warning text-warning scale-110" 
                    : "text-muted-foreground hover:text-warning"
                }`} 
              />
            </Button>
          </div>
        </div>

        {/* Price Display */}
        <div data-testid="kpi-row" className="space-y-1.5 animate-fade-in" style={{ animationDelay: '80ms' }}>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums text-foreground font-heading tracking-tight">
              {currency}{lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-base font-semibold tabular-nums px-2 py-0.5 rounded-md transition-all duration-220 ${
              isPositive 
                ? "text-success bg-success/10" 
                : "text-danger bg-danger/10"
            }`}>
              {isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%
            </span>
          </div>
          <div className="text-sm text-muted-foreground font-medium">
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
