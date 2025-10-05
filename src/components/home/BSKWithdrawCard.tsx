import * as React from "react"
import { Eye, EyeOff, ArrowUpRight, ArrowLeftRight, History, TrendingUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface BonusStrip {
  today: number
  week: number
  lifetime: number
}

interface BSKWithdrawCardProps {
  balance?: number
  fiatValue?: number
  bonusStrip?: BonusStrip
  isLoading?: boolean
  onWithdraw?: () => void
  onTransfer?: () => void
  onHistory?: () => void
  onViewBreakdown?: () => void
  className?: string
}

/**
 * BSKWithdrawCard - Tradable BSK balance with actions and bonus strip
 */
export function BSKWithdrawCard({
  balance = 125000,
  fiatValue = 12500,
  bonusStrip,
  isLoading = false,
  onWithdraw,
  onTransfer,
  onHistory,
  onViewBreakdown,
  className
}: BSKWithdrawCardProps) {
  const [isPrivate, setIsPrivate] = useState(false)

  const defaultBonusStrip: BonusStrip = bonusStrip || {
    today: 150,
    week: 1250,
    lifetime: 125000
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)} data-testid="bsk-withdrawable-card">
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "p-4 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 space-y-4",
        "transition-all duration-[220ms]",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(16px)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 4px 20px rgba(43, 214, 123, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}
      data-testid="bsk-withdrawable-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-[Space_Grotesk] font-bold text-xs text-foreground">
            BSK — Withdrawable
          </h3>
          <p className="font-[Inter] text-[10px] text-muted-foreground mt-0.5">
            Tradable / Transferable
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPrivate(!isPrivate)}
          className="h-8 w-8 p-0 hover:bg-muted/20 transition-all duration-[120ms]"
          aria-label={isPrivate ? "Show balance" : "Hide balance"}
        >
          {isPrivate ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Balance */}
      <div>
        <div className="font-[Space_Grotesk] font-bold text-2xl text-success tabular-nums">
          {isPrivate ? "••••••" : `${(balance / 1000).toFixed(1)}K`} <span className="text-base text-success/70">BSK</span>
        </div>
        <div className="font-[Inter] text-xs text-muted-foreground tabular-nums mt-1">
          {isPrivate ? "••••••" : `≈ ₹${fiatValue.toLocaleString()}`}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={onWithdraw}
          variant="outline"
          size="sm"
          className={cn(
            "h-12 flex flex-col items-center justify-center gap-1",
            "border-success/30 hover:border-success/50 hover:bg-success/10",
            "focus:ring-2 focus:ring-success/30"
          )}
        >
          <ArrowUpRight className="h-3.5 w-3.5 text-success" />
          <span className="text-[10px] font-[Inter] font-semibold text-success">Withdraw</span>
        </Button>

        <Button
          onClick={onTransfer}
          variant="outline"
          size="sm"
          className={cn(
            "h-12 flex flex-col items-center justify-center gap-1",
            "border-accent/30 hover:border-accent/50 hover:bg-accent/10",
            "focus:ring-2 focus:ring-accent/30"
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-accent" />
          <span className="text-[10px] font-[Inter] font-semibold text-accent">Transfer</span>
        </Button>

        <Button
          onClick={onHistory}
          variant="outline"
          size="sm"
          className={cn(
            "h-12 flex flex-col items-center justify-center gap-1",
            "border-muted/30 hover:border-muted/50 hover:bg-muted/10",
            "focus:ring-2 focus:ring-muted/30"
          )}
        >
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-[Inter] font-semibold text-muted-foreground">History</span>
        </Button>
      </div>

      {/* Bonus Strip */}
      <div className="pt-3 border-t border-border/30">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-[Inter] text-[10px] text-muted-foreground uppercase tracking-wider">
              Today
            </div>
            <div className="font-[Space_Grotesk] font-bold text-sm text-success tabular-nums mt-0.5">
              +{defaultBonusStrip.today}
            </div>
          </div>
          <div>
            <div className="font-[Inter] text-[10px] text-muted-foreground uppercase tracking-wider">
              7 Days
            </div>
            <div className="font-[Space_Grotesk] font-bold text-sm text-success tabular-nums mt-0.5">
              +{defaultBonusStrip.week.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-[Inter] text-[10px] text-muted-foreground uppercase tracking-wider">
              Lifetime
            </div>
            <div className="font-[Space_Grotesk] font-bold text-sm text-success tabular-nums mt-0.5">
              {(defaultBonusStrip.lifetime / 1000).toFixed(1)}K
            </div>
          </div>
        </div>

        <Button
          onClick={onViewBreakdown}
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-xs font-[Inter] font-medium text-accent hover:text-accent-glow"
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          View Breakdown
        </Button>
      </div>
    </div>
  )
}
