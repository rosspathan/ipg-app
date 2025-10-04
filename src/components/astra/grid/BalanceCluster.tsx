import * as React from "react"
import { useState } from "react"
import { Eye, EyeOff, ChevronDown, ChevronUp, ArrowUpRight, History, ArrowLeftRight, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AstraCard } from "../AstraCard"
import { BalanceDisplay } from "@/components/ui/balance-display"
import { QuickActionsRibbon } from "./QuickActionsRibbon"
import { useNavigate } from "react-router-dom"

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
  const [isCryptoExpanded, setIsCryptoExpanded] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const navigate = useNavigate()

  const withdrawActions = [
    { id: "withdraw", label: "Withdraw", icon: <ArrowUpRight className="h-4 w-4" />, variant: "success" as const, onPress: () => navigate("/app/programs/bsk-withdraw") },
    { id: "transfer", label: "Transfer", icon: <ArrowLeftRight className="h-4 w-4" />, variant: "default" as const, onPress: () => navigate("/app/wallet/transfer") },
    { id: "history", label: "History", icon: <History className="h-4 w-4" />, variant: "default" as const, onPress: () => navigate("/app/wallet/history") }
  ]

  const filteredCryptoAssets = mockBalances.cryptoAssets.filter(asset =>
    searchTerm ? asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) : true
  )

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

      {/* BSK Withdrawable - SECOND per spec */}
      <AstraCard variant="elevated" className="p-4" data-testid="bsk-withdrawable-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-sm text-success">BSK — Withdrawable</h3>
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
        <div className="mt-3">
          <QuickActionsRibbon actions={withdrawActions} compact />
        </div>
      </AstraCard>

      {/* BSK Holding - THIRD per spec */}
      <AstraCard variant="glass" className="p-4" data-testid="bsk-holding-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-sm text-warning">BSK — Holding</h3>
            <span className="text-xs text-muted-foreground">(Locked)</span>
          </div>
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
    </div>
  )
}