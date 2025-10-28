import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowDownToLine, ArrowUpFromLine, History, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useErc20OnchainBalance } from "@/hooks/useErc20OnchainBalance"
import AssetLogo from "@/components/AssetLogo"
import { AssetBalance } from "@/hooks/useWalletBalances"
import { BalanceReconciliationAlert } from "./BalanceReconciliationAlert"

interface AssetBalanceCardProps {
  asset: AssetBalance
  isSyncing: boolean
  onSyncStart: () => void
  onSyncEnd: () => void
  onRefetch: () => void
}

export function AssetBalanceCard({
  asset,
  isSyncing,
  onSyncStart,
  onSyncEnd,
  onRefetch,
}: AssetBalanceCardProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [showOnchain, setShowOnchain] = useState(false)
  
  // Only fetch on-chain balance for supported assets (USDT and IPG on BSC)
  const shouldShowOnchain = ["USDT", "IPG"].includes(asset.symbol)
  const { balance: onchainBalanceStr, isLoading: onchainLoading } = useErc20OnchainBalance(
    shouldShowOnchain ? asset.symbol : "",
    "bsc"
  )
  const onchainBalance = parseFloat(onchainBalanceStr || "0")

  const formatAmount = (value: number) => {
    if (value >= 1000000) return (value / 1000000).toFixed(2) + "M"
    if (value >= 1000) return (value / 1000).toFixed(2) + "K"
    return value.toFixed(6)
  }

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const syncNeeded = shouldShowOnchain && onchainBalance > asset.available + 0.01

  const handleSync = async () => {
    if (!shouldShowOnchain) return

    onSyncStart()
    try {
      const { data, error } = await supabase.functions.invoke("discover-deposits", {
        body: {
          symbol: asset.symbol,
          network: "bsc",
          lookbackHours: 168, // 1 week
        },
      })

      if (error) throw error

      // Monitor each new deposit
      if (data?.deposits && data.deposits.length > 0) {
        for (const dep of data.deposits) {
          await supabase.functions.invoke("monitor-deposit", {
            body: { deposit_id: dep.id },
          })
        }
      }

      await onRefetch()

      toast({
        title: "Sync Complete",
        description: data?.deposits?.length
          ? `Found and credited ${data.deposits.length} deposit${data.deposits.length > 1 ? "s" : ""}`
          : "No new deposits found",
      })
    } catch (error: any) {
      console.error("Sync error:", error)
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync deposits",
        variant: "destructive",
      })
    } finally {
      onSyncEnd()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="lg" />
            <div>
              <h3 className="font-semibold text-lg">{asset.name}</h3>
              <p className="text-sm text-muted-foreground">{asset.symbol}</p>
            </div>
          </div>
          {syncNeeded && (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync Available
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Available</p>
            <p className="text-2xl font-bold">{formatAmount(asset.available)}</p>
            <p className="text-xs text-muted-foreground">{formatUSD(asset.available * asset.price_usd)}</p>
          </div>
          {asset.locked > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Locked</p>
              <p className="text-2xl font-bold">{formatAmount(asset.locked)}</p>
              <p className="text-xs text-muted-foreground">{formatUSD(asset.locked * asset.price_usd)}</p>
            </div>
          )}
        </div>

        {/* On-chain Balance */}
        {shouldShowOnchain && (
          <div className="pt-2 border-t">
            <button
              onClick={() => setShowOnchain(!showOnchain)}
              className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>On-chain Balance</span>
              <span className="font-mono">{onchainLoading ? "..." : formatAmount(onchainBalance)}</span>
            </button>
          </div>
        )}

        {/* Balance Reconciliation Alert - Shows for ANY significant mismatch */}
        {shouldShowOnchain && !onchainLoading && (
          <BalanceReconciliationAlert
            assetSymbol={asset.symbol}
            appBalance={asset.balance}
            onchainBalance={onchainBalance}
            onSync={handleSync}
            isSyncing={isSyncing}
          />
        )}

        {/* Sync Alert - Only shows when on-chain > app (uncredited deposits) */}
        {syncNeeded && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm text-yellow-600 mb-2">
              You have {formatAmount(onchainBalance - asset.available)} {asset.symbol} on-chain that hasn't been synced yet.
            </p>
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="sm"
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button
            onClick={() => navigate(`/app/withdraw?asset=${asset.symbol}`)}
            variant="default"
            size="sm"
            disabled={asset.available <= 0}
            className="flex-col h-auto py-3"
          >
            <ArrowUpFromLine className="h-4 w-4 mb-1" />
            <span className="text-xs">Withdraw</span>
          </Button>
          <Button
            onClick={() => navigate(`/app/programs/onchain-wallet?asset=${asset.symbol}`)}
            variant="outline"
            size="sm"
            className="flex-col h-auto py-3"
          >
            <ArrowDownToLine className="h-4 w-4 mb-1" />
            <span className="text-xs">Deposit</span>
          </Button>
          <Button
            onClick={() => navigate(`/app/wallet?filter=${asset.symbol}`)}
            variant="outline"
            size="sm"
            className="flex-col h-auto py-3"
          >
            <History className="h-4 w-4 mb-1" />
            <span className="text-xs">History</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
