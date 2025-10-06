import * as React from "react"
import { useState } from "react"
import { Eye, EyeOff, Lock, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface BSKHoldingCardProps {
  balance?: number
  className?: string
}

export function BSKHoldingCard({ balance = 89500, className }: BSKHoldingCardProps) {
  const [isPrivate, setIsPrivate] = useState(false)

  const fiatValue = (balance * 0.1).toFixed(2) // Mock conversion rate

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl p-5 transition-all duration-300",
        "bg-gradient-to-br from-warning/15 via-warning/5 to-transparent",
        "border border-warning/30 backdrop-blur-xl",
        "hover:shadow-lg hover:shadow-warning/15 hover:border-warning/40",
        className
      )}
      data-testid="bsk-holding-card"
    >
      {/* Decorative gradient orb */}
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-warning/15 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-warning" />
            <h3 className="font-heading font-bold text-sm text-warning tracking-wide">
              BSK — HOLDING
            </h3>
            <span className="text-xs text-muted-foreground font-medium">(Locked)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPrivate(!isPrivate)}
            className="h-8 w-8 p-0 hover:bg-warning/10 transition-colors"
            aria-label={isPrivate ? "Show balance" : "Hide balance"}
          >
            {isPrivate ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Balance Display */}
        <div className="mb-5">
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-3xl text-foreground tabular-nums">
              {isPrivate ? "••••••" : `${(balance / 1000).toFixed(1)}K`}
            </span>
            <span className="font-heading font-semibold text-base text-warning">BSK</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            {isPrivate ? "••••••" : `≈ ₹${parseFloat(fiatValue).toLocaleString()}`}
          </p>
        </div>

        {/* Info Badge */}
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-card/50 border border-border/30 mb-4">
          <Calendar className="h-4 w-4 text-warning flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Locked balance with scheduled releases
          </p>
        </div>

        {/* View Schedule Button */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-10",
            "border-warning/30 hover:border-warning/50",
            "hover:bg-warning/10 text-foreground",
            "transition-all duration-200"
          )}
        >
          <Calendar className="h-4 w-4 mr-2" />
          View Release Schedule
        </Button>
      </div>
    </div>
  )
}
