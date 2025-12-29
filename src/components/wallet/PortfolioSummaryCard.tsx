import { CleanCard } from '@/components/admin/clean/CleanCard'
import { TrendingUp, TrendingDown, Wallet, Lock, Globe } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'
import { useIsMobile } from '@/hooks/use-mobile'

interface PortfolioSummaryCardProps {
  totalUsd: number
  availableUsd: number
  lockedUsd: number
  onchainUsd?: number
  change24h?: number
  loading?: boolean
}

export function PortfolioSummaryCard({
  totalUsd,
  availableUsd,
  lockedUsd,
  onchainUsd = 0,
  change24h = 0,
  loading = false
}: PortfolioSummaryCardProps) {
  const isPositiveChange = change24h >= 0
  const isMobile = useIsMobile()
  
  // Combined total includes on-chain assets
  const combinedTotal = totalUsd + onchainUsd

  if (loading) {
    return (
      <CleanCard variant="elevated" padding="lg">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </CleanCard>
    )
  }

  return (
    <CleanCard variant="elevated" padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-sm font-medium text-muted-foreground">Portfolio Summary</h2>
        {change24h !== 0 && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isPositiveChange 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-red-500/10 text-red-400'
          }`}>
            {isPositiveChange ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositiveChange ? '+' : ''}{change24h.toFixed(2)}%
          </div>
        )}
      </div>

      {/* Total Value - Primary Metric */}
      <div className="px-5 pb-4">
        <p className="text-xs text-muted-foreground mb-1.5">Total Value</p>
        <div className="flex items-baseline gap-3">
          <p 
            className="text-2xl md:text-3xl font-bold text-foreground dark:text-white tabular-nums truncate"
            title={formatCurrency(combinedTotal)}
          >
            {isMobile ? formatCurrency(combinedTotal, { abbreviated: true }) : formatCurrency(combinedTotal)}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Available, Locked & On-chain - Secondary Metrics */}
      <div className="px-5 py-3 space-y-2.5">
        {/* Available */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Wallet className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-muted-foreground">Available</span>
          </div>
          <p 
            className="text-lg md:text-xl font-semibold text-emerald-400 tabular-nums truncate ml-4"
            title={formatCurrency(availableUsd)}
          >
            {isMobile ? formatCurrency(availableUsd, { abbreviated: true }) : formatCurrency(availableUsd)}
          </p>
        </div>

        {/* Locked */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-muted-foreground">Locked</span>
          </div>
          <p 
            className="text-lg md:text-xl font-semibold text-amber-400 tabular-nums truncate ml-4"
            title={formatCurrency(lockedUsd)}
          >
            {isMobile ? formatCurrency(lockedUsd, { abbreviated: true }) : formatCurrency(lockedUsd)}
          </p>
        </div>

        {/* On-chain - Only show if there's a balance */}
        {onchainUsd > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Globe className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">On-chain</span>
            </div>
            <p 
              className="text-lg md:text-xl font-semibold text-blue-400 tabular-nums truncate ml-4"
              title={formatCurrency(onchainUsd)}
            >
              {isMobile ? formatCurrency(onchainUsd, { abbreviated: true }) : formatCurrency(onchainUsd)}
            </p>
          </div>
        )}
      </div>
    </CleanCard>
  )
}
