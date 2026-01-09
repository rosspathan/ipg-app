import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWalletBalances } from "@/hooks/useWalletBalances"
import { AssetBalanceCard } from "@/components/wallet/AssetBalanceCard"
import { WithdrawalList } from "@/components/wallet/WithdrawalList"
import { CryptoTransactionHistory } from "@/components/wallet/CryptoTransactionHistory"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function CryptoWalletPage() {
  const navigate = useNavigate()
  const { balances, portfolio, loading, error, refetch } = useWalletBalances()
  const [syncingAsset, setSyncingAsset] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex items-center gap-4 h-16 px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Crypto Wallet</h1>
          </div>
        </div>

        <div className="container px-4 py-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex items-center gap-4 h-16 px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Crypto Wallet</h1>
          </div>
        </div>

        <div className="container px-4 py-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading balances: {error}</p>
              <Button onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const isPositiveChange = (portfolio?.change_24h_percent ?? 0) >= 0

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center gap-4 h-16 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Crypto Wallet</h1>
        </div>
      </div>

      <div className="container px-4 py-6 space-y-6">
        {/* Portfolio Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">
                {formatCurrency(portfolio?.total_usd ?? 0)}
              </p>
              {portfolio && portfolio.change_24h_percent !== 0 && (
                <div className={`flex items-center gap-1 text-sm ${
                  isPositiveChange ? "text-green-600" : "text-red-600"
                }`}>
                  {isPositiveChange ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>
                    {isPositiveChange ? "+" : ""}
                    {portfolio.change_24h_percent.toFixed(2)}% (24h)
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(portfolio?.available_usd ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Locked</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(portfolio?.locked_usd ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Withdrawals */}
        <WithdrawalList />

        {/* Transaction History */}
        <CryptoTransactionHistory />

        {/* Asset Balance Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Assets</h2>
          {balances.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No assets found. Start by depositing crypto to your wallet.
                </p>
              </CardContent>
            </Card>
          ) : (
            balances.map((asset) => (
              <AssetBalanceCard
                key={asset.asset_id}
                asset={asset}
                isSyncing={syncingAsset === asset.symbol}
                onSyncStart={() => setSyncingAsset(asset.symbol)}
                onSyncEnd={() => setSyncingAsset(null)}
                onRefetch={refetch}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
