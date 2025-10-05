import * as React from "react"
import { useState } from "react"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface Asset {
  id: string
  symbol: string
  name: string
  balance: number
  valueUSD: number
  logoUrl?: string
  change24h?: number
}

interface AssetsPanelProps {
  assets?: Asset[]
  isLoading?: boolean
  onAssetPress?: (asset: Asset) => void
  onViewAll?: () => void
  className?: string
}

/**
 * AssetsPanel - Collapsible crypto assets list with search
 * Shows top 3 by default, expandable to show all
 */
export function AssetsPanel({ 
  assets = [], 
  isLoading = false, 
  onAssetPress, 
  onViewAll,
  className 
}: AssetsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)

  const filteredAssets = assets.filter(asset =>
    asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const displayedAssets = isExpanded ? filteredAssets : filteredAssets.slice(0, 3)

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)} data-testid="assets-panel">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)} data-testid="assets-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-[Space_Grotesk] font-bold text-sm text-foreground">
          Crypto Assets
        </h2>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-[10px] text-accent hover:text-accent-glow font-[Inter] font-semibold"
          >
            View All →
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(
            "pl-9 h-10 bg-card/60 backdrop-blur-xl border-border/30",
            "focus:border-primary/50 focus:ring-1 focus:ring-primary/30",
            "font-[Inter] text-sm"
          )}
        />
      </div>

      {/* Assets List */}
      <div className="space-y-2">
        {displayedAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground font-[Inter] text-sm">
            No assets found
          </div>
        ) : (
          displayedAssets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onAssetPress?.(asset)}
              className={cn(
                "w-full p-3 rounded-xl bg-card/60 backdrop-blur-xl border border-border/30",
                "hover:border-primary/40 hover:bg-card/80",
                "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                "active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
            >
              <div className="flex items-center justify-between">
                {/* Left: Icon + Name */}
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-[Space_Grotesk] font-bold text-xs">
                    {asset.symbol.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="font-[Space_Grotesk] font-bold text-xs text-foreground">
                      {asset.symbol}
                    </div>
                    <div className="font-[Inter] text-[10px] text-muted-foreground">
                      {asset.name}
                    </div>
                  </div>
                </div>

                {/* Right: Balance + Value */}
                <div className="text-right">
                  <div className="font-[Space_Grotesk] font-bold text-xs text-foreground tabular-nums">
                    {asset.balance.toFixed(4)}
                  </div>
                  <div className="font-[Inter] text-[10px] text-muted-foreground tabular-nums">
                    ${asset.valueUSD.toFixed(2)}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Expand/Collapse */}
      {filteredAssets.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-sm font-[Inter] font-medium text-accent hover:text-accent-glow"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show All ({filteredAssets.length - 3} more)
            </>
          )}
        </Button>
      )}
    </div>
  )
}
