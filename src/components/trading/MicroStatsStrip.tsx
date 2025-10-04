import { TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";

interface MicroStatsStripProps {
  high24h: number;
  low24h: number;
  spread: number;
  currency?: string;
}

export function MicroStatsStrip({
  high24h,
  low24h,
  spread,
  currency = "₹"
}: MicroStatsStripProps) {
  return (
    <div 
      data-testid="micro-stats"
      className="flex items-center justify-around gap-2 px-4 py-2.5 bg-card/10 border-y border-border/30"
    >
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-success" />
        <div className="text-xs">
          <span className="text-muted-foreground mr-1">High</span>
          <span className="font-semibold tabular-nums text-foreground">
            {currency}{high24h.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-1.5">
        <TrendingDown className="h-3.5 w-3.5 text-destructive" />
        <div className="text-xs">
          <span className="text-muted-foreground mr-1">Low</span>
          <span className="font-semibold tabular-nums text-foreground">
            {currency}{low24h.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-1.5">
        <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
        <div className="text-xs">
          <span className="text-muted-foreground mr-1">Spread</span>
          <span className="font-semibold tabular-nums text-foreground">
            {spread.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
