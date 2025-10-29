import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderBookSpreadProps {
  currentPrice: number;
  spread: number;
  spreadPercent: number;
  bestBid: number;
  bestAsk: number;
}

export function OrderBookSpread({
  currentPrice,
  spread,
  spreadPercent,
  bestBid,
  bestAsk,
}: OrderBookSpreadProps) {
  const isUp = currentPrice >= bestBid;

  return (
    <div className="relative px-3 py-3 border-y border-border bg-muted/30">
      <div className="flex items-center justify-between">
        {/* Current Price */}
        <div className="flex items-center gap-2">
          {isUp ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          <span
            className={cn(
              "text-lg font-bold font-mono",
              isUp ? "text-success" : "text-destructive"
            )}
          >
            ${currentPrice.toFixed(2)}
          </span>
        </div>

        {/* Spread Info */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="text-xs text-muted-foreground">
            Spread: <span className="font-mono font-medium text-foreground">${spread.toFixed(2)}</span>
          </div>
          <div className="text-xs font-mono text-primary">
            {spreadPercent.toFixed(3)}%
          </div>
        </div>
      </div>

      {/* Best Bid/Ask Display */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="text-xs">
          <span className="text-muted-foreground">Best Bid: </span>
          <span className="font-mono font-medium text-success">${bestBid.toFixed(2)}</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Best Ask: </span>
          <span className="font-mono font-medium text-destructive">${bestAsk.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
