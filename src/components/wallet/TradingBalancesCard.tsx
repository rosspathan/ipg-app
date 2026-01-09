import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, Loader2 } from "lucide-react"
import AssetLogo from "@/components/AssetLogo"

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
  // Filter to only show assets with trading balance > 0
  const activeBalances = balances.filter(b => b.balance > 0.000001)
  
  // Calculate total USD value
  const totalUsd = activeBalances.reduce((sum, b) => sum + (b.usd_value || 0), 0)

  if (loading) {
    return (
      <Card className="bg-card/60 backdrop-blur-xl border-border/40">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Trading Balances</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Funds available for placing orders
            </p>
          </div>
          {onTransfer && (
            <Button variant="outline" size="sm" onClick={onTransfer}>
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
              Transfer
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeBalances.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">No trading balances</p>
            <p className="text-xs text-muted-foreground">
              Transfer funds from your on-chain wallet to start trading
            </p>
          </div>
        ) : (
          <>
            {/* Total Value */}
            {totalUsd > 0 && (
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="font-semibold text-foreground">
                  ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            
            {/* Individual Assets */}
            <div className="space-y-2">
              {activeBalances.map((asset) => (
                <div 
                  key={asset.symbol}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                    <div>
                      <p className="font-medium text-sm">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground">{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium">
                      {asset.available.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                    {asset.locked > 0.000001 && (
                      <p className="text-xs text-amber-500 font-mono">
                        +{asset.locked.toFixed(4)} locked
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
