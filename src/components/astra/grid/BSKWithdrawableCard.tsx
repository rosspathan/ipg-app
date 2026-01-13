import * as React from "react"
import { useState } from "react"
import { Eye, EyeOff, ArrowUpRight, ArrowLeftRight, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

interface BSKWithdrawableCardProps {
  balance?: number
  className?: string
}

export function BSKWithdrawableCard({ balance = 0, className }: BSKWithdrawableCardProps) {
  const [isPrivate, setIsPrivate] = useState(false)
  const navigate = useNavigate()

  const fiatValue = (balance * 1.0).toFixed(2) // 1 BSK = ₹1.00

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl p-5 transition-all duration-300",
        "bg-gradient-to-br from-success/20 via-success/10 to-transparent",
        "border border-success/30 backdrop-blur-xl",
        "hover:shadow-lg hover:shadow-success/20 hover:border-success/40",
        className
      )}
      data-testid="bsk-withdrawable-card"
    >
      {/* Decorative gradient orb */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-success/20 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <h3 className="font-heading font-bold text-sm text-success tracking-wide">
              BSK — WITHDRAWABLE
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPrivate(!isPrivate)}
            className="h-8 w-8 p-0 hover:bg-success/10 transition-colors"
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
              {isPrivate ? "••••••" : balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="font-heading font-semibold text-base text-success">BSK</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            {isPrivate ? "••••••" : `≈ ₹${parseFloat(fiatValue).toLocaleString()}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => navigate("/app/programs/bsk-withdraw")}
            size="sm"
            className={cn(
              "flex flex-col items-center gap-1.5 h-auto py-3",
              "bg-success/10 hover:bg-success/20 text-success",
              "border border-success/30 hover:border-success/50",
              "transition-all duration-200"
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
            <span className="text-xs font-semibold">Withdraw</span>
          </Button>

          <Button
            onClick={() => navigate("/app/programs/bsk-transfer")}
            size="sm"
            variant="outline"
            className={cn(
              "flex flex-col items-center gap-1.5 h-auto py-3",
              "border-border/40 hover:border-border/60",
              "transition-all duration-200"
            )}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="text-xs font-semibold">Transfer</span>
          </Button>

          <Button
            onClick={() => navigate("/app/wallet/history/bsk")}
            size="sm"
            variant="outline"
            className={cn(
              "flex flex-col items-center gap-1.5 h-auto py-3",
              "border-border/40 hover:border-border/60",
              "transition-all duration-200"
            )}
          >
            <History className="h-4 w-4" />
            <span className="text-xs font-semibold">History</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
