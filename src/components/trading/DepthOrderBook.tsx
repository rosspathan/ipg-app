import { cn } from "@/lib/utils"

interface OrderBookRow {
  price: number
  quantity: number
  total: number
}

interface DepthOrderBookProps {
  bids: OrderBookRow[]
  asks: OrderBookRow[]
  spread: number
  onPriceClick?: (price: number) => void
}

export function DepthOrderBook({ bids, asks, spread, onPriceClick }: DepthOrderBookProps) {
  const maxTotal = Math.max(
    ...bids.map(b => b.total),
    ...asks.map(a => a.total)
  )

  return (
    <div data-testid="order-book" className="bg-card/40 rounded-xl border border-border/30 overflow-hidden animate-fade-in" style={{ animationDelay: '240ms' }}>
      {/* Header */}
      <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-border/30 bg-card/60">
        <div className="text-xs font-semibold text-muted-foreground">Price (USDT)</div>
        <div className="text-xs font-semibold text-muted-foreground text-right">Quantity (BNB)</div>
      </div>

      <div className="divide-y divide-border/20">
        {/* Asks (Sell Orders) */}
        <div className="py-2">
          {asks.slice(0, 5).reverse().map((ask, idx) => (
            <button
              key={`ask-${idx}`}
              onClick={() => onPriceClick?.(ask.price)}
              className="relative w-full px-4 py-1.5 hover:bg-danger/5 transition-all duration-220 group"
            >
              <div 
                className="absolute inset-y-0 right-0 bg-danger/10 transition-all duration-220 group-hover:bg-danger/15"
                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
              />
              <div className="relative grid grid-cols-2 gap-2">
                <span className="text-sm font-mono tabular-nums text-danger font-semibold">
                  {ask.price.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                </span>
                <span className="text-sm font-mono tabular-nums text-right text-foreground/80">
                  {ask.quantity.toFixed(4)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Spread Badge */}
        <div className="py-3 px-4 bg-card/80">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Spread</span>
            <span className="text-sm font-bold tabular-nums text-primary">
              {spread.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="py-2">
          {bids.slice(0, 5).map((bid, idx) => (
            <button
              key={`bid-${idx}`}
              onClick={() => onPriceClick?.(bid.price)}
              className="relative w-full px-4 py-1.5 hover:bg-success/5 transition-all duration-220 group"
            >
              <div 
                className="absolute inset-y-0 right-0 bg-success/10 transition-all duration-220 group-hover:bg-success/15"
                style={{ width: `${(bid.total / maxTotal) * 100}%` }}
              />
              <div className="relative grid grid-cols-2 gap-2">
                <span className="text-sm font-mono tabular-nums text-success font-semibold">
                  {bid.price.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                </span>
                <span className="text-sm font-mono tabular-nums text-right text-foreground/80">
                  {bid.quantity.toFixed(4)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
