import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface BalanceDisplayProps {
  amount: string | number
  currency?: string
  secondary?: string
  size?: "sm" | "md" | "lg" | "xl"
  showCurrency?: boolean
  showToggle?: boolean
  isPrivate?: boolean
  onTogglePrivacy?: () => void
  className?: string
  gradient?: boolean
  glow?: boolean
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl font-semibold",
  xl: "text-3xl font-bold"
}

export function BalanceDisplay({
  amount,
  currency = "BSK",
  secondary,
  size = "md",
  showCurrency = true,
  showToggle = false,
  isPrivate = false,
  onTogglePrivacy,
  className,
  gradient = false,
  glow = false,
  ...props
}: BalanceDisplayProps) {
  const formatAmount = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "0.00"
    
    // Format large numbers with abbreviations
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(num)
  }

  const displayAmount = isPrivate ? "••••••" : formatAmount(amount)

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <div className="flex flex-col">
        <div className={cn(
          "font-mono tabular-nums transition-all duration-220",
          sizeClasses[size],
          gradient && "text-gradient",
          glow && "text-glow",
          className
        )}>
          {displayAmount}
          {showCurrency && !isPrivate && (
            <span className="ml-1 text-muted-foreground font-normal">
              {currency}
            </span>
          )}
        </div>
        {secondary && !isPrivate && (
          <div className="text-xs text-muted-foreground">
            {secondary}
          </div>
        )}
      </div>
      
      {showToggle && onTogglePrivacy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePrivacy}
          className="h-6 w-6 p-0 ml-2"
        >
          {isPrivate ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  )
}