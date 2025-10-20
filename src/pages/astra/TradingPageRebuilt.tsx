import * as React from "react"
import { useState, useMemo } from "react"
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
import { useTradingPairs, useTradingUIDefaults } from "@/hooks/useTradingPairs"
import { useOrientation } from "@/hooks/useOrientation"

export function TradingPageRebuilt() {
  const { navigate } = useNavigation()
  const isLandscape = useOrientation()
  const [selectedTab, setSelectedTab] = useState<"recent" | "favorites" | "all">("recent")
  const [searchTerm, setSearchTerm] = useState("")
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])

  // Fetch real trading pairs from database
  const { data: allPairs = [], isLoading } = useTradingPairs('listed')
  const { data: uiDefaults } = useTradingUIDefaults()
  
  const selectedPair = allPairs[0] || { 
    symbol: "BTC/USDT", 
    last_price: 0, 
    price_change_24h: 0,
    volume_24h: 0,
    base_symbol: "BTC"
  }

  const kpiData = [
    { 
      icon: "📈", 
      value: `$${selectedPair.last_price.toLocaleString()}`, 
      label: "Last Price",
      variant: selectedPair.price_change_24h > 0 ? "success" as const : "danger" as const,
      trend: selectedPair.price_change_24h > 0 ? "up" as const : "down" as const,
      changePercent: `${selectedPair.price_change_24h > 0 ? "+" : ""}${selectedPair.price_change_24h.toFixed(2)}%`
    },
    { 
      icon: "💰", 
      value: `$${(selectedPair.volume_24h / 1000000).toFixed(1)}M`, 
      label: "24h Volume",
      variant: "primary" as const
    }
  ]

  const filteredPairs = useMemo(() => {
    return allPairs
      .filter(pair => {
        if (selectedTab === "recent") return true // Show all for recent (can implement recents tracking later)
        if (selectedTab === "favorites") return favorites.includes(pair.id)
        return true
      })
      .filter(pair => pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [allPairs, selectedTab, favorites, searchTerm])

  const toggleFavorite = (pairId: string) => {
    setFavorites(prev => 
      prev.includes(pairId) 
        ? prev.filter(id => id !== pairId)
        : [...prev, pairId]
    )
  }

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
    <div className={cn("space-y-6", isLandscape && "landscape-mode")}>
        {/* KPI Row */}
        <div className="px-4 pt-4">
          <KPIChipRow data={kpiData} />
        </div>

        {/* Compact Chart - Taller in landscape */}
        <div className="px-4">
          <ChartCard 
            title={selectedPair.symbol}
            data={[]}
            timeframe="1D"
            className={cn(isLandscape ? "h-64" : "h-48", "trading-chart-container")}
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
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading pairs...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredPairs.map((pair) => {
                  const isProfit = pair.price_change_24h > 0
                  const isSelected = pair.symbol === selectedPair.symbol
                  const isFav = favorites.includes(pair.id)
                  
                  return (
                    <button
                      key={pair.id}
                      onClick={() => navigate(`/app/trading/${pair.symbol}`)}
                      className={cn(
                        "rounded-2xl border p-4 transition-all duration-220 text-left relative",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        isSelected 
                          ? "bg-primary/10 border-primary/40 shadow-button" 
                          : "bg-card/60 border-border/40 hover:border-accent/40"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(pair.id)
                            }}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star className={cn(
                              "w-3 h-3",
                              isFav ? "text-warning fill-warning" : "text-muted-foreground"
                            )} />
                          </button>
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
                            ${pair.last_price.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vol: ${(pair.volume_24h / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          isProfit ? "text-success" : "text-danger"
                        )}>
                          {isProfit ? "+" : ""}{pair.price_change_24h.toFixed(2)}%
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {!isLoading && filteredPairs.length === 0 && (
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
            Buy {selectedPair.base_symbol}
          </Button>
          <Button 
            className="h-12 bg-danger hover:bg-danger/90 text-danger-foreground shadow-button"
            onClick={() => navigate(`/app/trading/sell/${selectedPair.symbol}`)}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Sell {selectedPair.base_symbol}
          </Button>
        </div>
    </div>
  )
}
