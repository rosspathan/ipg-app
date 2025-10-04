import * as React from "react"
import { useState } from "react"
import { ArrowLeftRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AmountInputProProps {
  value: string
  onChange: (value: string) => void
  unit: "base" | "quote"
  onUnitToggle: () => void
  baseSymbol: string
  quoteSymbol: string
  minNotional?: string
  stepSize?: string
  disabled?: boolean
  className?: string
}

/**
 * AmountInputPro - Large numeric input with unit toggle
 */
export function AmountInputPro({
  value,
  onChange,
  unit,
  onUnitToggle,
  baseSymbol,
  quoteSymbol,
  minNotional,
  stepSize,
  disabled = false,
  className
}: AmountInputProProps) {
  const currentSymbol = unit === "base" ? baseSymbol : quoteSymbol
  
  return (
    <div 
      data-testid="amount-input"
      className={cn("space-y-2", className)}
    >
      <div className="flex items-center gap-2">
        {/* Main Input */}
        <div className="flex-1 relative">
          <Input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="0.00"
            className={cn(
              "h-14 pr-16 text-xl font-bold font-mono tabular-nums",
              "bg-muted/30 border-border/50"
            )}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
            {currentSymbol}
          </span>
        </div>
        
        {/* Unit Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={onUnitToggle}
          disabled={disabled}
          className={cn(
            "h-14 w-14 border-border/50",
            "hover:bg-primary/10 hover:border-primary/30",
            "transition-all duration-200"
          )}
          aria-label={`Toggle between ${baseSymbol} and ${quoteSymbol}`}
        >
          <ArrowLeftRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Helper Text */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
        {minNotional && (
          <span>Min notional: {minNotional}</span>
        )}
        {stepSize && (
          <span>Step: {stepSize}</span>
        )}
      </div>
    </div>
  )
}
