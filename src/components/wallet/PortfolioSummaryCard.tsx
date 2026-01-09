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
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Portfolio Summary</h2>
        {change24h !== 0 && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isPositiveChange 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
              : 'bg-red-500/15 text-red-400 border border-red-500/30'
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

      {/* Total Value - Primary Metric (On-Chain Balance) */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs text-muted-foreground font-medium">On-Chain Balance</p>
          <Globe className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex items-baseline gap-3">
          <p 
            className="text-3xl md:text-4xl font-bold text-foreground tabular-nums"
            title={formatCurrency(totalUsd)}
          >
            {formatCurrency(totalUsd)}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40 mx-5" />

      {/* Available, Locked - Secondary Metrics */}
      <div className="px-5 py-4 space-y-3">
        {/* Available */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Available</span>
          </div>
          <p 
            className="text-xl font-bold text-emerald-400 tabular-nums"
            title={formatCurrency(availableUsd)}
          >
            {formatCurrency(availableUsd)}
          </p>
        </div>

        {/* In Orders (Locked) */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-2 rounded-xl transition-colors"
          onClick={() => navigate('/app/trade')}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Lock className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">In Orders</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-xs">Funds reserved in open trading orders. Cancel orders to unlock.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <p 
              className="text-xl font-bold text-amber-400 tabular-nums"
              title={formatCurrency(lockedUsd)}
            >
              {formatCurrency(lockedUsd)}
            </p>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>

        {/* Note about on-chain trading */}
        <div className="pt-3 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground/60 text-center">
            Balances reflect your actual on-chain holdings
          </p>
        </div>
      </div>
    </div>
  )
}
