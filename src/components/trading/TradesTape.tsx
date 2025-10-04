import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Trade {
  time: string
  price: number
  quantity: number
  side: "buy" | "sell"
}

interface TradesTapeProps {
  trades: Trade[]
}

export function TradesTape({ trades }: TradesTapeProps) {
  return (
    <div data-testid="trades-tape" className="bg-card/40 rounded-xl border border-border/30 overflow-hidden animate-fade-in" style={{ animationDelay: '280ms' }}>
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border/30 bg-card/60">
        <div className="text-xs font-semibold text-muted-foreground">Time</div>
        <div className="text-xs font-semibold text-muted-foreground text-right">Price</div>
        <div className="text-xs font-semibold text-muted-foreground text-right">Qty</div>
      </div>

      {/* Trades List */}
      <div className="max-h-64 overflow-y-auto">
        {trades.map((trade, idx) => (
          <div
            key={idx}
            className={cn(
              "grid grid-cols-3 gap-2 px-4 py-2 transition-all duration-220",
              "hover:bg-card/60 animate-fade-in"
            )}
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div className="flex items-center gap-1.5">
              {trade.side === "buy" ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-danger" />
              )}
              <span className="text-xs font-mono text-muted-foreground">{trade.time}</span>
            </div>
            <span className={cn(
              "text-sm font-mono tabular-nums text-right font-semibold",
              trade.side === "buy" ? "text-success" : "text-danger"
            )}>
              {trade.price.toLocaleString('en-US', { minimumFractionDigits: 1 })}
            </span>
            <span className="text-sm font-mono tabular-nums text-right text-foreground/80">
              {trade.quantity.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
