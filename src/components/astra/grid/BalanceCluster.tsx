import * as React from "react"
import { useState } from "react"
import { Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AstraCard } from "../AstraCard"
import { BalanceDisplay } from "@/components/ui/balance-display"
import { QuickActionsRibbon } from "./QuickActionsRibbon"

interface BalanceClusterProps {
  className?: string
}

const mockBalances = {
  withdrawable: 125000,
  holding: 89500,
  cryptoAssets: [
    { symbol: "BTC", name: "Bitcoin", balance: 0.0342, valueUSD: 1456.78, logo: "₿" },
    { symbol: "ETH", name: "Ethereum", balance: 2.891, valueUSD: 4821.45, logo: "Ξ" },
    { symbol: "BNB", name: "BNB", balance: 12.45, valueUSD: 2890.12, logo: "🔶" }
  ]
}

const quickActions = [
  { id: "deposit", label: "Deposit", icon: "📥", variant: "success" as const, onPress: () => {} },
  { id: "withdraw", label: "Withdraw", icon: "📤", variant: "warning" as const, onPress: () => {} },
  { id: "swap", label: "Swap", icon: "🔄", variant: "default" as const, onPress: () => {} },
  { id: "send", label: "Send", icon: "📨", variant: "default" as const, onPress: () => {} }
]

export function BalanceCluster({ className }: BalanceClusterProps) {
  const [isPrivate, setIsPrivate] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={cn("space-y-4", className)} data-testid="balance-cluster">
      {/* BSK Withdrawable */}
      <AstraCard variant="elevated" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-success">BSK — Withdrawable</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsPrivate(!isPrivate)} className="h-6 w-6 p-0">
            {isPrivate ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        </div>
        <BalanceDisplay 
          amount={mockBalances.withdrawable} 
          currency="BSK" 
          size="lg" 
          isPrivate={isPrivate}
          gradient 
        />
      </AstraCard>

      {/* BSK Holding */}
      <AstraCard variant="glass" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-warning">BSK — Holding</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsPrivate(!isPrivate)} className="h-6 w-6 p-0">
            {isPrivate ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        </div>
        <BalanceDisplay 
          amount={mockBalances.holding} 
          currency="BSK" 
          size="lg" 
          isPrivate={isPrivate}
        />
      </AstraCard>

      {/* Crypto Assets Grid */}
      <AstraCard variant="glass" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-accent">Crypto Assets</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
        
        {isExpanded && (
          <div className="grid grid-cols-1 gap-2" data-testid="crypto-assets-grid">
            {mockBalances.cryptoAssets.map((asset) => (
              <div key={asset.symbol} className="flex items-center justify-between p-2 bg-card-secondary/40 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{asset.logo}</span>
                  <div>
                    <div className="font-medium text-sm">{asset.symbol}</div>
                    <div className="text-xs text-muted-foreground">{asset.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{asset.balance}</div>
                  <div className="text-xs text-muted-foreground">${asset.valueUSD.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AstraCard>

      {/* Quick Actions */}
      <QuickActionsRibbon actions={quickActions} />
    </div>
  )
}