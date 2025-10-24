import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PortfolioSummaryCardProps {
  totalUsd: number
  availableUsd: number
  lockedUsd: number
  change24h?: number
  loading?: boolean
}

export function PortfolioSummaryCard({
  totalUsd,
  availableUsd,
  lockedUsd,
  change24h = 0,
  loading = false
}: PortfolioSummaryCardProps) {
  const isPositiveChange = change24h >= 0

  if (loading) {
    return (
      <Card className="bg-card/60 backdrop-blur-xl border-border/40">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl border-border/40 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Portfolio Summary</h2>
          {change24h !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              isPositiveChange ? 'text-success' : 'text-destructive'
            }`}>
              {isPositiveChange ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {isPositiveChange ? '+' : ''}{change24h.toFixed(2)}%
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Total Value */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground whitespace-nowrap">Total Value</p>
            <p className="text-xl font-bold text-foreground tabular-nums">
              ${totalUsd.toFixed(2)}
            </p>
          </div>

          {/* Available */}
          <div className="space-y-1 border-l border-border/40 pl-4">
            <p className="text-xs text-muted-foreground whitespace-nowrap">Available</p>
            <p className="text-xl font-bold text-success tabular-nums">
              ${availableUsd.toFixed(2)}
            </p>
          </div>

          {/* Locked */}
          <div className="space-y-1 border-l border-border/40 pl-4">
            <p className="text-xs text-muted-foreground whitespace-nowrap">Locked</p>
            <p className="text-xl font-bold text-warning tabular-nums">
              ${lockedUsd.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
