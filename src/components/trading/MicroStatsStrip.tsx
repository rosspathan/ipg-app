import { TrendingUp, TrendingDown, Activity } from "lucide-react"

interface MicroStatsStripProps {
  high24h: number
  low24h: number
  spread: number
  currency?: string
}

export function MicroStatsStrip({ high24h, low24h, spread, currency = "₹" }: MicroStatsStripProps) {
  return (
    <div data-testid="micro-stats" className="flex items-center gap-3 px-4 py-3 bg-card/40 border-y border-border/30 animate-fade-in" style={{ animationDelay: '160ms' }}>
      <div className="flex items-center gap-1.5 flex-1 group cursor-default transition-all duration-220 hover:scale-105">
        <TrendingUp className="h-4 w-4 text-success transition-transform duration-220 group-hover:scale-110" />
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground leading-none font-medium">High</span>
          <span className="text-sm font-bold tabular-nums text-success mt-0.5">
            {currency}{high24h.toLocaleString()}
          </span>
        </div>
      </div>
      
      <div className="h-8 w-px bg-border/40" />
      
      <div className="flex items-center gap-1.5 flex-1 group cursor-default transition-all duration-220 hover:scale-105">
        <TrendingDown className="h-4 w-4 text-danger transition-transform duration-220 group-hover:scale-110" />
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground leading-none font-medium">Low</span>
          <span className="text-sm font-bold tabular-nums text-danger mt-0.5">
            {currency}{low24h.toLocaleString()}
          </span>
        </div>
      </div>
      
      <div className="h-8 w-px bg-border/40" />
      
      <div className="flex items-center gap-1.5 flex-1 group cursor-default transition-all duration-220 hover:scale-105">
        <Activity className="h-4 w-4 text-primary transition-transform duration-220 group-hover:scale-110" />
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground leading-none font-medium">Spread</span>
          <span className="text-sm font-bold tabular-nums text-primary mt-0.5">
            {spread.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
