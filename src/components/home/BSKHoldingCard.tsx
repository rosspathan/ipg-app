import * as React from "react"
import { Eye, EyeOff, Lock, Calendar, RefreshCw } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface BSKSource {
  label: string
  amount: number
  color: string
}

interface BSKHoldingCardProps {
  balance?: number
  fiatValue?: number
  sources?: BSKSource[]
  isLoading?: boolean
  onViewSchedule?: () => void
  onRefresh?: () => void
  className?: string
}

const defaultSources: BSKSource[] = [
  { label: "Ads", amount: 25000, color: "bg-success" },
  { label: "Referrals", amount: 18500, color: "bg-primary" },
  { label: "Spin", amount: 12000, color: "bg-accent" },
  { label: "Draw", amount: 8000, color: "bg-warning" },
  { label: "One-time", amount: 20000, color: "bg-danger" },
  { label: "Other", amount: 6000, color: "bg-muted" }
]

/**
 * BSKHoldingCard - Locked promotional BSK with source chips
 */
export function BSKHoldingCard({
  balance = 89500,
  fiatValue = 8950,
  sources = defaultSources,
  isLoading = false,
  onViewSchedule,
  onRefresh,
  className
}: BSKHoldingCardProps) {
  const [isPrivate, setIsPrivate] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true)
      await onRefresh()
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)} data-testid="bsk-holding-card">
        <Skeleton className="h-36 rounded-2xl" />
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
        boxShadow: '0 4px 20px rgba(124, 77, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}
      data-testid="bsk-holding-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-warning" />
          <div>
            <h3 className="font-[Space_Grotesk] font-bold text-xs text-foreground">
              BSK — Holding
            </h3>
            <p className="font-[Inter] text-[10px] text-muted-foreground">
              Locked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0 hover:bg-muted/20 transition-all duration-[120ms]"
            aria-label="Refresh balance"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isRefreshing && "animate-spin")} />
          </Button>
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
      </div>

      {/* Balance */}
      <div>
        <div className="font-[Space_Grotesk] font-bold text-2xl text-primary tabular-nums">
          {isPrivate ? "••••••" : balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-base text-primary/70">BSK</span>
        </div>
        <div className="font-[Inter] text-xs text-muted-foreground tabular-nums mt-1">
          {isPrivate ? "••••••" : `≈ ₹${fiatValue.toLocaleString()}`}
        </div>
      </div>

      {/* Sources Chips */}
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <div
            key={index}
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-[Inter] font-semibold",
              "bg-card/80 border border-border/30",
              "flex items-center gap-1"
            )}
          >
            <div className={cn("h-1 w-1 rounded-full", source.color)} />
            <span className="text-foreground">{source.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {source.amount.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      {/* View Schedule CTA */}
      {onViewSchedule && (
        <Button
          onClick={onViewSchedule}
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-10",
            "border-border/30 hover:border-border/50 hover:bg-card/80",
            "text-foreground font-[Inter] font-medium",
            "focus:ring-2 focus:ring-border/30"
          )}
        >
          <Calendar className="h-4 w-4 mr-2" />
          View Schedule
        </Button>
      )}
    </div>
  )
}
