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
      role="region"
      aria-label={`BSK ${isWithdrawable ? "Withdrawable" : "Holding"} Balance Card`}
      className={cn(
        "p-4 rounded-2xl border-2 space-y-3",
        "glass-card",
        "transition-all duration-300 ease-out",
        "flex flex-col h-full",
        "hover:shadow-elevated hover:scale-[1.02] active:scale-[0.99]",
        "animate-fade-in-scale",
        "focus-within:ring-2 focus-within:ring-offset-2",
        isWithdrawable 
          ? "bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/30 hover:border-success/50 focus-within:ring-success/30" 
          : "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30 hover:border-primary/50 focus-within:ring-primary/30",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(16px)',
        backdropFilter: 'blur(16px)',
        boxShadow: isWithdrawable 
          ? '0 8px 32px rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
          : '0 8px 32px rgba(124, 77, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
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
          className="h-8 w-8 p-0 hover:bg-muted/20 transition-all duration-200 hover:scale-110 flex-shrink-0 touch-manipulation"
          aria-label={isPrivate ? "Show balance" : "Hide balance"}
          aria-pressed={isPrivate}
        >
          {isPrivate ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Amount Row */}
      <div className="relative" role="status" aria-live="polite">
        <div className={cn(
          "font-heading font-bold text-2xl tabular-nums animate-count-up",
          isWithdrawable ? "text-success" : "text-primary"
        )}>
          {isPrivate ? "••••••" : `${(balance / 1000).toFixed(1)}K`}{" "}
          <span className={cn(
            "text-base font-semibold",
            isWithdrawable ? "text-success/70" : "text-primary/70"
          )} aria-hidden="true">BSK</span>
        </div>
        <div className="font-body text-xs text-muted-foreground tabular-nums mt-1">
          {isPrivate ? "••••••" : `≈ ₹${fiatValue.toLocaleString()}`}
        </div>
        {/* Subtle glow behind amount */}
        <div className={cn(
          "absolute -inset-4 blur-2xl opacity-20 pointer-events-none animate-pulse-slow",
          isWithdrawable ? "bg-success" : "bg-primary"
        )} aria-hidden="true" />
      </div>

      {/* Actions Row */}
      {isWithdrawable ? (
        <div className="flex items-center gap-1">
          <Button
            onClick={onWithdraw}
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 h-11 px-3 min-w-0",
              "border-success/40 hover:border-success/60 hover:bg-success/15",
              "text-success font-body font-semibold text-xs",
              "focus:ring-2 focus:ring-success/30",
              "transition-all duration-200 hover:scale-105 active:scale-95",
              "touch-manipulation"
            )}
            aria-label="Withdraw BSK"
          >
            <ArrowDownToLine className="h-4 w-4 mr-1.5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">Withdraw</span>
          </Button>
          <Button
            onClick={onTransfer}
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 h-11 px-3 min-w-0",
              "border-primary/40 hover:border-primary/60 hover:bg-primary/15",
              "text-primary font-body font-semibold text-xs",
              "focus:ring-2 focus:ring-primary/30",
              "transition-all duration-200 hover:scale-105 active:scale-95",
              "touch-manipulation"
            )}
            aria-label="Transfer BSK"
          >
            <ArrowRightLeft className="h-4 w-4 mr-1.5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">Transfer</span>
          </Button>
        </div>
      ) : (
        <Button
          onClick={onViewSchedule}
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-9",
            "border-primary/40 hover:border-primary/60 hover:bg-primary/15",
            "text-primary font-body font-semibold text-xs",
            "focus:ring-2 focus:ring-primary/30",
            "transition-all duration-200 active:scale-95"
          )}
        >
          <Calendar className="h-3.5 w-3.5 mr-1.5" />
          View Schedule
        </Button>
      )}

      {/* Metrics Row - Removed per user request */}

      {/* Footer Link - Removed per user request */}
    </div>
  )
}
