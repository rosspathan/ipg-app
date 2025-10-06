import * as React from "react"
import { Eye, EyeOff, Lock, ArrowDownToLine, ArrowRightLeft, History, Calendar, Info } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface BonusMetrics {
  today: number
  week: number
  lifetime: number
}

interface Source {
  label: string
  amount: number
}

interface BskCardCompactProps {
  variant: "withdrawable" | "holding"
  balance?: number
  fiatValue?: number
  bonusMetrics?: BonusMetrics
  sources?: Source[]
  isLoading?: boolean
  onWithdraw?: () => void
  onTransfer?: () => void
  onHistory?: () => void
  onViewBreakdown?: () => void
  onViewSchedule?: () => void
  className?: string
}

const defaultSources: Source[] = [
  { label: "Ads", amount: 25000 },
  { label: "Refs", amount: 18500 },
  { label: "Spin", amount: 12000 },
  { label: "Draw", amount: 8000 },
  { label: "One-time", amount: 20000 },
  { label: "Other", amount: 6000 }
]

/**
 * BskCardCompact - Compact BSK balance card for side-by-side layout
 */
export function BskCardCompact({
  variant,
  balance = variant === "withdrawable" ? 125000 : 89500,
  fiatValue = variant === "withdrawable" ? 12500 : 8950,
  bonusMetrics = { today: 150, week: 1250, lifetime: 125000 },
  sources = defaultSources,
  isLoading = false,
  onWithdraw,
  onTransfer,
  onHistory,
  onViewBreakdown,
  onViewSchedule,
  className
}: BskCardCompactProps) {
  const [isPrivate, setIsPrivate] = useState(false)

  const isWithdrawable = variant === "withdrawable"

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)} data-testid="bsk-card">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "p-3 rounded-2xl border border-border/30 space-y-3",
        "transition-all duration-[220ms]",
        "flex flex-col h-full",
        isWithdrawable 
          ? "bg-success/5 backdrop-blur-xl" 
          : "bg-primary/5 backdrop-blur-xl",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(16px)',
        backdropFilter: 'blur(16px)',
        boxShadow: isWithdrawable 
          ? '0 4px 20px rgba(34, 197, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 4px 20px rgba(124, 77, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}
      data-testid="bsk-card"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {!isWithdrawable && <Lock className="h-3 w-3 text-warning flex-shrink-0" />}
          <div className="min-w-0">
            <h3 className="font-[Space_Grotesk] font-bold text-[11px] text-foreground truncate">
              BSK — {isWithdrawable ? "Withdrawable" : "Holding"}
            </h3>
            <p className="font-[Inter] text-[9px] text-muted-foreground">
              {isWithdrawable ? "Tradable / Transferable" : "Locked"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPrivate(!isPrivate)}
          className="h-6 w-6 p-0 hover:bg-muted/20 transition-all duration-[120ms] flex-shrink-0"
          aria-label={isPrivate ? "Show balance" : "Hide balance"}
        >
          {isPrivate ? (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Amount Row */}
      <div>
        <div className={cn(
          "font-[Space_Grotesk] font-bold text-xl tabular-nums",
          isWithdrawable ? "text-success" : "text-primary"
        )}>
          {isPrivate ? "••••••" : `${(balance / 1000).toFixed(1)}K`}{" "}
          <span className={cn(
            "text-sm",
            isWithdrawable ? "text-success/70" : "text-primary/70"
          )}>BSK</span>
        </div>
        <div className="font-[Inter] text-[10px] text-muted-foreground tabular-nums mt-0.5">
          {isPrivate ? "••••••" : `≈ ₹${fiatValue.toLocaleString()}`}
        </div>
      </div>

      {/* Actions Row */}
      {isWithdrawable ? (
        <div className="flex items-center gap-1">
          <Button
            onClick={onWithdraw}
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 h-7 px-1.5 min-w-0",
              "border-success/30 hover:border-success/50 hover:bg-success/10",
              "text-success font-[Inter] font-medium text-[8px]",
              "focus:ring-2 focus:ring-success/30"
            )}
          >
            <ArrowDownToLine className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
            <span className="truncate">Withdraw</span>
          </Button>
          <Button
            onClick={onTransfer}
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 h-7 px-1.5 min-w-0",
              "border-primary/30 hover:border-primary/50 hover:bg-primary/10",
              "text-primary font-[Inter] font-medium text-[8px]",
              "focus:ring-2 focus:ring-primary/30"
            )}
          >
            <ArrowRightLeft className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
            <span className="truncate">Transfer</span>
          </Button>
        </div>
      ) : (
        <Button
          onClick={onViewSchedule}
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-7",
            "border-primary/30 hover:border-primary/50 hover:bg-primary/10",
            "text-primary font-[Inter] font-medium text-[8px]",
            "focus:ring-2 focus:ring-primary/30"
          )}
        >
          <Calendar className="h-2.5 w-2.5 mr-1" />
          View Schedule
        </Button>
      )}

      {/* Metrics Row - Removed per user request */}

      {/* Footer Link - Removed per user request */}
    </div>
  )
}
