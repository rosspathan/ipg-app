import * as React from "react"
import { useState } from "react"
import { ChevronDown, ChevronUp, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AstraCard } from "../AstraCard"
import { BSKWithdrawableCard } from "./BSKWithdrawableCard"
import { BSKHoldingCard } from "./BSKHoldingCard"

interface BalanceClusterProps {
  className?: string
}

const mockBalances = {
  withdrawable: 0,
  holding: 0,
  cryptoAssets: [
    { symbol: "BTC", name: "Bitcoin", balance: 0, valueUSD: 0, logo: "₿" },
    { symbol: "ETH", name: "Ethereum", balance: 0, valueUSD: 0, logo: "Ξ" },
    { symbol: "BNB", name: "BNB", balance: 0, valueUSD: 0, logo: "🔶" }
  ]
}

const quickActions = [
  { id: "deposit", label: "Deposit", icon: "📥", variant: "success" as const, onPress: () => {} },
  { id: "withdraw", label: "Withdraw", icon: "📤", variant: "warning" as const, onPress: () => {} },
  { id: "swap", label: "Swap", icon: "🔄", variant: "default" as const, onPress: () => {} },
  { id: "send", label: "Send", icon: "📨", variant: "default" as const, onPress: () => {} }
]

export function BalanceCluster({ className }: BalanceClusterProps) {
  const [isCryptoExpanded, setIsCryptoExpanded] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCryptoAssets = mockBalances.cryptoAssets.filter(asset =>
    searchTerm ? asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) : true
  )

  // Debug: verify which GRID BalanceCluster renders and values
  console.info('[BALANCE_CLUSTER_RENDER]', {
    variant: 'grid',
    withdrawable: mockBalances.withdrawable,
    holding: mockBalances.holding,
    cryptoCount: mockBalances.cryptoAssets.length,
  });
  return (
    <div className={cn("space-y-4", className)} data-testid="balance-cluster">
      {/* Crypto Assets Grid - FIRST per spec */}
      <AstraCard variant="glass" className="p-4" data-testid="crypto-assets-grid">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-sm text-accent">Crypto Assets</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCryptoExpanded(!isCryptoExpanded)}
            className="h-6 w-6 p-0"
          >
            {isCryptoExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
        
        {isCryptoExpanded && (
          <>
            {/* Search */}
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

            {/* Grid of crypto assets */}
            <div className="grid grid-cols-1 gap-2">
              {filteredCryptoAssets.map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between p-3 bg-card-secondary/40 rounded-xl hover:bg-card-secondary/60 transition-colors duration-[120ms] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-base">{asset.logo}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm font-heading">{asset.symbol}</div>
                      <div className="text-xs text-muted-foreground">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm tabular-nums">{asset.balance}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">${asset.valueUSD.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            {filteredCryptoAssets.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No assets found
              </div>
            )}
          </>
        )}
      </AstraCard>

      {/* BSK Withdrawable - New Design */}
      <BSKWithdrawableCard balance={mockBalances.withdrawable} />

      {/* BSK Holding - New Design */}
      <BSKHoldingCard balance={mockBalances.holding} />
    </div>
  )
}