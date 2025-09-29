import * as React from "react"
import { Suspense, lazy } from "react"
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AstraCard } from "./AstraCard"

// Lazy load heavy chart components
const TradingViewWidget = lazy(() => import("@/components/TradingViewWidget"))

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ChartCardProps {
  title: string
  symbol?: string
  data?: ChartData[]
  timeframe?: "1H" | "4H" | "1D" | "1W"
  variant?: "line" | "candle" | "area"
  height?: number
  className?: string
  showControls?: boolean
}

// Chart Loading Skeleton
function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div 
      className="animate-pulse bg-card-glass/30 rounded-lg flex items-center justify-center"
      style={{ height }}
    >
      <div className="text-center">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 text-text-secondary/50" />
        <p className="text-sm text-text-secondary/70">Loading chart...</p>
      </div>
    </div>
  )
}

// Simple Line Chart Component (fallback)
function SimpleLineChart({ data, height = 200 }: { data?: ChartData[], height?: number }) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="bg-card-glass/30 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-text-secondary/50" />
          <p className="text-sm text-text-secondary/70">No chart data available</p>
        </div>
      </div>
    )
  }

  // Generate SVG path for line chart
  const maxPrice = Math.max(...data.map(d => d.close))
  const minPrice = Math.min(...data.map(d => d.close))
  const priceRange = maxPrice - minPrice
  
  const pathData = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((point.close - minPrice) / priceRange) * 100
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  const isPositive = data[data.length - 1]?.close > data[0]?.close

  return (
    <div className="relative" style={{ height }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0"
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        
        {/* Price line */}
        <path
          d={pathData}
          fill="none"
          stroke={isPositive ? "hsl(154 67% 52%)" : "hsl(0 70% 68%)"}
          strokeWidth="2"
          className="drop-shadow-lg"
        />
        
        {/* Area fill */}
        <path
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill={`url(#gradient-${isPositive ? 'success' : 'danger'})`}
          opacity="0.2"
        />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="gradient-success" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(154 67% 52%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(154 67% 52%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradient-danger" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(0 70% 68%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(0 70% 68%)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export function ChartCard({
  title,
  symbol,
  data,
  timeframe = "1D",
  variant = "line",
  height = 200,
  className,
  showControls = true
}: ChartCardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState(timeframe)
  const timeframes = ["1H", "4H", "1D", "1W"] as const

  // Mock price change calculation
  const priceChange = data && data.length > 1 
    ? ((data[data.length - 1].close - data[0].close) / data[0].close) * 100
    : 0
  const isPositive = priceChange >= 0

  return (
    <AstraCard 
      variant="elevated" 
      className={cn("overflow-hidden", className)}
      data-testid="chart-card"
    >
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading font-semibold text-lg">{title}</h3>
            {symbol && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-text-secondary">{symbol}</span>
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-danger" />
                  )}
                  <span className={cn(
                    "text-sm font-mono font-semibold",
                    isPositive ? "text-success" : "text-danger"
                  )}>
                    {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeframe Controls */}
        {showControls && (
          <div className="flex gap-1 mb-3">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded transition-all duration-standard",
                  selectedTimeframe === tf
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "text-text-secondary hover:text-text-primary hover:bg-card-glass/50"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div className="px-4 pb-4">
        <Suspense fallback={<ChartSkeleton height={height} />}>
          <SimpleLineChart data={data} height={height} />
        </Suspense>
      </div>
    </AstraCard>
  )
}