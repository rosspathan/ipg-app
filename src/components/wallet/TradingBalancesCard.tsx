import { Button } from "@/components/ui/button"
import { ArrowLeftRight, Loader2, RefreshCw } from "lucide-react"
import AssetLogo from "@/components/AssetLogo"
import { useBalanceReconciliation } from "@/hooks/useBalanceReconciliation"

interface TradingBalance {
  symbol: string
  name: string
  balance: number
  available: number
  locked: number
  logo_url?: string
  usd_value?: number
}

interface TradingBalancesCardProps {
  balances: TradingBalance[]
  loading?: boolean
  onTransfer?: () => void
}

export function TradingBalancesCard({ balances, loading, onTransfer }: TradingBalancesCardProps) {
  const { reconcileBalances, isReconciling } = useBalanceReconciliation()
  
  // Filter to only show assets with trading balance > 0
  const activeBalances = balances.filter(b => b.balance > 0.000001)
  
  // Check if any asset has locked balance
  const hasLockedBalance = activeBalances.some(b => b.locked > 0.000001)
  
  // Calculate total USD value
  const totalUsd = activeBalances.reduce((sum, b) => sum + (b.usd_value || 0), 0)

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Trading Balances</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Funds available for placing orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Reconcile Button - only show if there's locked balance */}
          {hasLockedBalance && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => reconcileBalances()}
              disabled={isReconciling}
              className="h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-all duration-200"
              title="Fix locked balance if orders were cancelled"
            >
              {isReconciling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {onTransfer && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onTransfer}
              className="h-9 px-4 bg-primary/10 hover:bg-primary/20 border-primary/40 hover:border-primary/60 text-primary rounded-lg transition-all duration-200"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
              Transfer
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="px-5 pb-5 space-y-3">
        {activeBalances.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No trading balances</p>
            <p className="text-xs text-muted-foreground/70">
              Deposit funds to the platform hot wallet to start trading
            </p>
          </div>
        ) : (
          <>
            {/* Total Value */}
            {totalUsd > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-border/40">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="font-bold text-lg text-foreground tabular-nums">
                  ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            
            {/* Individual Assets */}
            <div className="space-y-2">
              {activeBalances.map((asset) => (
                <div 
                  key={asset.symbol}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                    <div>
                      <p className="font-semibold text-sm">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground">{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {asset.available.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                    {asset.locked > 0.000001 && (
                      <p className="text-xs text-amber-500 font-mono tabular-nums">
                        +{asset.locked.toFixed(4)} locked
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
