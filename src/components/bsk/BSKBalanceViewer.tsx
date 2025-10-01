import { useBSKLedgers } from "@/hooks/useBSKLedgers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, TrendingUp, History, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"

/**
 * BSKBalanceViewer - Comprehensive BSK balance display
 * Shows withdrawable, holding balances + transaction history
 * Phase 2C: BSK Programs Integration
 */
export function BSKBalanceViewer() {
  const { loading, balances, withdrawableHistory, holdingHistory } = useBSKLedgers()

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

  const totalBalance = balances.withdrawable_balance + balances.holding_balance
  const lifetimeEarned = balances.lifetime_withdrawable_earned + balances.lifetime_holding_earned

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          BSK Balance
        </CardTitle>
        <CardDescription>Bonos Stellar Krypto wallet and history</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Balance Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">Withdrawable</p>
            <p className="text-2xl font-bold text-primary">{balances.withdrawable_balance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">BSK</p>
          </div>

          <div className="space-y-1 p-4 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-sm text-muted-foreground">Holding</p>
            <p className="text-2xl font-bold text-accent">{balances.holding_balance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">BSK</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className="text-sm font-semibold">{totalBalance.toFixed(2)} BSK</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Lifetime Earned</p>
            <p className="text-sm font-semibold">{lifetimeEarned.toFixed(2)} BSK</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Withdrawn</p>
            <p className="text-sm font-semibold">{balances.lifetime_withdrawn.toFixed(2)} BSK</p>
          </div>
        </div>

        {/* Transaction History Tabs */}
        <Tabs defaultValue="withdrawable" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="withdrawable">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdrawable
            </TabsTrigger>
            <TabsTrigger value="holding">
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Holding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="withdrawable">
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
          </TabsContent>

          <TabsContent value="holding">
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-2">
                {holdingHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
                ) : (
                  holdingHistory.map((entry) => (
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
