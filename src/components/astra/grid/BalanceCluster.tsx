import * as React from "react"
import { useState } from "react"
import { ChevronDown, ChevronUp, Search, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AstraCard } from "../AstraCard"
import { useOnchainBalances } from "@/hooks/useOnchainBalances"
import { OnchainAssetCard } from "@/components/wallet/OnchainAssetCard"
import { BSKTradableCard } from "@/components/wallet/BSKTradableCard"

interface BalanceClusterProps {
  className?: string
}

export function BalanceCluster({ className }: BalanceClusterProps) {
  const [isCryptoExpanded, setIsCryptoExpanded] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const { balances: onchainBalances, isLoading: cryptoLoading, refetch: refetchCrypto } = useOnchainBalances()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetchCrypto()
      toast({ title: "Balances Refreshed", description: "Your on-chain balances have been updated" })
    } catch {
      toast({ title: "Refresh Failed", description: "Failed to refresh balances", variant: "destructive" })
    } finally {
      setIsRefreshing(false)
    }
  }

  const filteredCryptoAssets = onchainBalances
    .filter(asset => asset.symbol !== 'INR' && asset.balance > 0)
    .filter(asset =>
      searchTerm
        ? asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    )

  return (
    <div className={cn("space-y-4", className)} data-testid="balance-cluster">
      {/* BSK Tradable Card */}
      <BSKTradableCard />

      {/* Crypto Assets Grid - On-chain Balances */}
      <AstraCard variant="glass" className="p-4" data-testid="crypto-assets-grid">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-sm text-accent">On-chain Balances</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-6 w-6 p-0" title="Refresh on-chain balances">
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsCryptoExpanded(!isCryptoExpanded)} className="h-6 w-6 p-0">
              {isCryptoExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {isCryptoExpanded && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-background/50 border-border/40"
              />
            </div>

            {cryptoLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Loading on-chain balances...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3">
                  {filteredCryptoAssets.map((asset) => (
                    <OnchainAssetCard
                      key={asset.symbol}
                      symbol={asset.symbol}
                      name={asset.name}
                      balance={asset.balance}
                      logoUrl={asset.logoUrl}
                      network={asset.network}
                    />
                  ))}
                </div>
                {filteredCryptoAssets.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {searchTerm ? "No assets found matching your search" : "No on-chain balances found"}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </AstraCard>
    </div>
  )
}
