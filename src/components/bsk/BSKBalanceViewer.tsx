import { useEffect } from "react"
import { useBSKLedgers } from "@/hooks/useBSKLedgers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, History, ArrowUpRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"

/**
 * BSKBalanceViewer - BSK balance display (tradable only, locked BSK discontinued)
 */
export function BSKBalanceViewer() {
  const { loading, balances, withdrawableHistory, refresh } = useBSKLedgers()

  useEffect(() => {
    const handleSessionRestored = () => {
      console.log('[BSKBalanceViewer] Session restored, refreshing balance')
      refresh()
    }
    window.addEventListener('auth:session:restored', handleSessionRestored)
    return () => window.removeEventListener('auth:session:restored', handleSessionRestored)
  }, [refresh])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!balances) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>BSK Balance</CardTitle>
          <CardDescription>Unable to load balance data</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          BSK Balance
        </CardTitle>
        <CardDescription>Bonos Stellar Krypto tradable balance</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Balance Overview */}
        <div className="space-y-1 p-5 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">Tradable Balance</p>
          <p className="text-3xl font-bold text-primary tabular-nums">
            {balances.withdrawable_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">BSK</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lifetime Earned</p>
            <p className="text-sm font-bold tabular-nums">{balances.lifetime_withdrawable_earned.toLocaleString('en-IN', { maximumFractionDigits: 0 })} BSK</p>
          </div>
          <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Withdrawn</p>
            <p className="text-sm font-bold tabular-nums">{balances.lifetime_withdrawn.toLocaleString('en-IN', { maximumFractionDigits: 0 })} BSK</p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Recent Activity</p>
          </div>
          <ScrollArea className="h-64 pr-4">
            <div className="space-y-2">
              {withdrawableHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                withdrawableHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.tx_type}</p>
                      {entry.tx_subtype && (
                        <p className="text-xs text-muted-foreground">{entry.tx_subtype}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${entry.amount_bsk >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {entry.amount_bsk >= 0 ? '+' : ''}{entry.amount_bsk.toFixed(2)} BSK
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {entry.balance_after.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
