import * as React from "react"
import { useState } from "react"
import { TrendingUp, TrendingDown, Star, Clock, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppShellGlass } from "@/components/astra/AppShellGlass"
import { KPIChipRow } from "@/components/astra/KPIChipRow"
import { ChartCard } from "@/components/astra/ChartCard"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { cn } from "@/lib/utils"
import { useNavigation } from "@/hooks/useNavigation"
import BrandHeaderLogo from "@/components/brand/BrandHeaderLogo"

interface TradingPair {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  isFavorite?: boolean
  category: "recent" | "favorites" | "all"
}

const mockPairs: TradingPair[] = [
  { symbol: "BSK/INR", price: 12.45, change24h: 2.34, volume24h: 1250000, isFavorite: true, category: "recent" },
  { symbol: "BSK/USDT", price: 0.15, change24h: -1.23, volume24h: 890000, isFavorite: true, category: "favorites" },
  { symbol: "BTC/INR", price: 5234567, change24h: 3.45, volume24h: 9800000, category: "all" },
  { symbol: "ETH/INR", price: 234567, change24h: -2.12, volume24h: 5600000, category: "all" },
  { symbol: "BNB/INR", price: 45678, change24h: 1.89, volume24h: 3400000, category: "all" },
]

export function TradingPageRebuilt() {
  const { navigate } = useNavigation()
  const [selectedTab, setSelectedTab] = useState<"recent" | "favorites" | "all">("recent")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPair, setSelectedPair] = useState(mockPairs[0])
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)

  const kpiData = [
    { 
      icon: "📈", 
      value: `₹${selectedPair.price.toLocaleString()}`, 
      label: "Last Price",
      variant: selectedPair.change24h > 0 ? "success" as const : "danger" as const,
      trend: selectedPair.change24h > 0 ? "up" as const : "down" as const,
      changePercent: `${selectedPair.change24h > 0 ? "+" : ""}${selectedPair.change24h}%`
    },
    { 
      icon: "💰", 
      value: `₹${(selectedPair.volume24h / 1000000).toFixed(1)}M`, 
      label: "24h Volume",
      variant: "primary" as const
    }
  ]

  const filteredPairs = mockPairs
    .filter(pair => {
      if (selectedTab === "recent") return pair.category === "recent"
      if (selectedTab === "favorites") return pair.isFavorite
      return true
    })
    .filter(pair => pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleQuickSwitchAction = (action: string) => {
    switch (action) {
      case "deposit": navigate("/app/deposit"); break
      case "convert": navigate("/app/swap"); break
      case "trade": navigate("/app/trade"); break
      case "programs": navigate("/app/programs"); break
    }
  }

  const topBar = (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <BrandHeaderLogo size="medium" />
        <div className="text-center flex-1">
          <h1 className="font-bold text-lg text-foreground font-heading">Trading</h1>
          <p className="text-xs text-accent">LIVE Mode</p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <AppShellGlass topBar={topBar} data-testid="page-trading">
      <div className="space-y-6 pb-32">
        {/* KPI Row */}
        <div className="px-4 pt-4">
          <KPIChipRow data={kpiData} />
        </div>

        {/* Compact Chart */}
        <div className="px-4">
          <ChartCard 
            title={selectedPair.symbol}
            data={[]}
            timeframe="1D"
            className="h-48"
            data-testid="chart-card"
          />
        </div>

        {/* Pairs Grid Section */}
        <div className="space-y-4">
          <div className="px-4">
            <h2 className="font-bold text-lg text-foreground font-heading mb-3">Market Pairs</h2>
            
            {/* Tab Navigation */}
            <div className="flex gap-1 bg-card/40 p-1 rounded-xl border border-border/40 mb-3">
              {(["recent", "favorites", "all"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTab(tab)}
                  className={cn(
                    "flex-1 h-9 text-xs font-semibold capitalize transition-all duration-220",
                    selectedTab === tab 
                      ? "bg-primary text-primary-foreground shadow-button" 
                      : "hover:bg-card/60"
                  )}
                >
                  {tab === "recent" && <Clock className="w-3 h-3 mr-1" />}
                  {tab === "favorites" && <Star className="w-3 h-3 mr-1" />}
                  {tab}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pairs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/40 border-border/40"
              />
            </div>
          </div>

          {/* Pairs Grid */}
          <div className="px-4" data-testid="pairs-grid">
            <div className="grid grid-cols-1 gap-3">
              {filteredPairs.map((pair) => {
                const isProfit = pair.change24h > 0
                const isSelected = pair.symbol === selectedPair.symbol
                
                return (
                  <button
                    key={pair.symbol}
                    onClick={() => setSelectedPair(pair)}
                    className={cn(
                      "rounded-2xl border p-4 transition-all duration-220 text-left",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      isSelected 
                        ? "bg-primary/10 border-primary/40 shadow-button" 
                        : "bg-card/60 border-border/40 hover:border-accent/40"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {pair.isFavorite && <Star className="w-3 h-3 text-warning fill-warning" />}
                        <span className="font-bold font-mono">{pair.symbol}</span>
                      </div>
                      {isProfit ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-danger" />
                      )}
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold font-mono tabular-nums">
                          ₹{pair.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vol: ₹{(pair.volume24h / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        isProfit ? "text-success" : "text-danger"
                      )}>
                        {isProfit ? "+" : ""}{pair.change24h}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {filteredPairs.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground">No pairs found</p>
            </div>
          )}
        </div>

        {/* Quick Buy/Sell Buttons */}
        <div className="px-4 grid grid-cols-2 gap-3">
          <Button 
            className="h-12 bg-success hover:bg-success/90 text-success-foreground shadow-button"
            onClick={() => navigate(`/app/trading/buy/${selectedPair.symbol}`)}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Buy {selectedPair.symbol.split("/")[0]}
          </Button>
          <Button 
            className="h-12 bg-danger hover:bg-danger/90 text-danger-foreground shadow-button"
            onClick={() => navigate(`/app/trading/sell/${selectedPair.symbol}`)}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Sell {selectedPair.symbol.split("/")[0]}
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <DockNav
        onNavigate={navigate}
        onCenterPress={() => setShowQuickSwitch(true)}
      />

      {/* Quick Switch */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />
    </AppShellGlass>
  )
}
