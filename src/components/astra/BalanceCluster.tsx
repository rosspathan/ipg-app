import * as React from "react"
import { useState } from "react"
import { ChevronDown, ChevronUp, Lock, Unlock, Search, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AstraCard } from "./AstraCard"
import { BalanceDisplay } from "@/components/ui/balance-display"
import { ActionBar } from "./ActionBar"

interface BalanceItem {
  id: string
  symbol: string
  name: string
  balance: number
  valueUSD: number
  logoUrl?: string
  isLocked?: boolean
  category: 'withdrawable' | 'holding' | 'crypto'
}

interface BalanceClusterProps {
  className?: string
}

// Mock data - replace with real data hooks
const mockBalances: BalanceItem[] = [
  {
    id: "bsk-withdrawable",
    symbol: "BSK",
    name: "BSK Withdrawable",
    balance: 0,
    valueUSD: 0,
    category: "withdrawable",
    isLocked: false
  },
  {
    id: "bsk-holding",
    symbol: "BSK", 
    name: "BSK Holding",
    balance: 0,
    valueUSD: 0,
    category: "holding",
    isLocked: true
  },
  {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    balance: 0,
    valueUSD: 0,
    category: "crypto"
  },
  {
    id: "eth",
    symbol: "ETH", 
    name: "Ethereum",
    balance: 0,
    valueUSD: 0,
    category: "crypto"
  },
  {
    id: "usdt",
    symbol: "USDT",
    name: "Tether USD",
    balance: 0,
    valueUSD: 0,
    category: "crypto"
  }
]

export function BalanceCluster({ className }: BalanceClusterProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showPrivate, setShowPrivate] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [hideSmallBalances, setHideSmallBalances] = useState(false)

  const withdrawableBalance = mockBalances.find(b => b.category === "withdrawable")
  const holdingBalance = mockBalances.find(b => b.category === "holding")
  const cryptoAssets = mockBalances.filter(b => b.category === "crypto")

  const filteredCrypto = cryptoAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    const isNotSmall = !hideSmallBalances || asset.valueUSD >= 10
    return matchesSearch && isNotSmall
  })

  const totalValue = mockBalances.reduce((sum, item) => sum + item.valueUSD, 0)

  // Debug: verify which BalanceCluster renders and values
  console.info('[BALANCE_CLUSTER_RENDER]', {
    variant: 'astra',
    totals: { totalValue },
    withdrawable: withdrawableBalance?.balance ?? null,
    holding: holdingBalance?.balance ?? null,
    cryptoCount: cryptoAssets.length,
  });
  return (
    <div className={cn("space-y-4", className)} data-testid="balance-cluster">
      {/* Portfolio Overview */}
      <AstraCard variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-heading font-semibold">Total Portfolio</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPrivate(!showPrivate)}
            className="h-8 w-8 p-0"
          >
            {showPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        
        <BalanceDisplay
          amount={totalValue}
          currency="USD"
          size="xl"
          isPrivate={!showPrivate}
          gradient
          glow
        />
        
        <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            Available: {showPrivate ? "$0.00" : "••••"}
          </span>
          <span className="inline-flex items-center gap-1">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            Locked: {showPrivate ? "$0.00" : "••••"}
          </span>
        </div>
      </AstraCard>

      {/* BSK Withdrawable Card */}
      {withdrawableBalance && (
        <AstraCard variant="elevated" data-testid="bsk-withdrawable-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                  <Unlock className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h4 className="font-semibold">BSK — Withdrawable</h4>
                  <p className="text-sm text-text-secondary">Tradable & transferable</p>
                </div>
              </div>
            </div>
            
            <BalanceDisplay
              amount={withdrawableBalance.balance}
              currency="BSK"
              size="lg"
              isPrivate={!showPrivate}
              secondary={showPrivate ? `≈ $${withdrawableBalance.valueUSD.toFixed(2)}` : undefined}
            />
            
            <ActionBar
              actions={["withdraw", "transfer", "history"]}
              className="mt-4"
            />
          </div>
        </AstraCard>
      )}

      {/* BSK Holding Card */}
      {holdingBalance && (
        <AstraCard variant="elevated" data-testid="bsk-holding-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                  <Lock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h4 className="font-semibold">BSK — Holding</h4>
                  <p className="text-sm text-text-secondary">Non-withdrawable rewards</p>
                </div>
              </div>
            </div>
            
            <BalanceDisplay
              amount={holdingBalance.balance}
              currency="BSK"
              size="lg"
              isPrivate={!showPrivate}
              secondary={showPrivate ? `≈ $${holdingBalance.valueUSD.toFixed(2)}` : undefined}
            />
            
            <div className="mt-4 p-3 bg-warning/5 border border-warning/20 rounded-lg">
              <p className="text-xs text-warning">
                This balance comes from ad rewards, promotions, and vesting. Cannot be withdrawn.
              </p>
            </div>
          </div>
        </AstraCard>
      )}

      {/* Crypto Assets Card */}
      <AstraCard variant="elevated" data-testid="crypto-assets-list">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Crypto Assets</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>

          {isExpanded && (
            <>
              {/* Search and Filters */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHideSmallBalances(!hideSmallBalances)}
                  className={cn(
                    "text-xs h-8",
                    hideSmallBalances && "bg-accent/10 text-accent"
                  )}
                >
                  Hide small balances
                </Button>
              </div>

              {/* Assets List */}
              <div className="space-y-3">
                {filteredCrypto.length > 0 ? (
                  filteredCrypto.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card-glass/30 hover:bg-card-glass/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-mono font-semibold">
                            {asset.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{asset.symbol}</div>
                          <div className="text-xs text-text-secondary">{asset.name}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-mono font-semibold">
                          {showPrivate ? asset.balance.toFixed(4) : "••••"} {asset.symbol}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {showPrivate ? `$${asset.valueUSD.toFixed(2)}` : "••••"}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-text-secondary">
                    <p className="text-sm">No assets found</p>
                  </div>
                )}
              </div>

              <ActionBar
                actions={["deposit", "send"]}
                className="mt-4"
              />
            </>
          )}
        </div>
      </AstraCard>
    </div>
  )
}