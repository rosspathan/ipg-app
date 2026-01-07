import { CleanCard } from '@/components/admin/clean/CleanCard'
import { TrendingUp, TrendingDown, Wallet, Lock, Globe, Info, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useNavigate } from 'react-router-dom'


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
  const navigate = useNavigate()
  const isPositiveChange = change24h >= 0
  
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
            {formatCurrency(combinedTotal)}
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
            {formatCurrency(availableUsd)}
          </p>
        </div>

        {/* In Orders (Locked) */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-white/5 -mx-5 px-5 py-1 rounded transition-colors"
          onClick={() => navigate('/app/trade')}
        >
          <div className="flex items-center gap-2 flex-shrink-0">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-muted-foreground">In Orders</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-xs">Funds reserved in open trading orders. Cancel orders to unlock.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <p 
              className="text-lg md:text-xl font-semibold text-amber-400 tabular-nums truncate"
              title={formatCurrency(lockedUsd)}
            >
              {formatCurrency(lockedUsd)}
            </p>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
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
              {formatCurrency(onchainUsd)}
            </p>
          </div>
        )}
      </div>
    </CleanCard>
  )
}
