import * as React from "react"
import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface PercentChipProProps {
  value: number
  onSelect: (percent: number) => void
  disabled?: boolean
  className?: string
}

const PRESET_PERCENTS = [0, 25, 50, 75, 100]

/**
 * PercentChipsPro - Premium percentage selector with haptics
 */
export function PercentChipsPro({
  value,
  onSelect,
  disabled = false,
  className
}: PercentChipProProps) {
  const [pressedChip, setPressedChip] = useState<number | null>(null)

  const handlePress = useCallback((percent: number) => {
    if (disabled) return
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
    
    setPressedChip(percent)
    onSelect(percent)
    
    setTimeout(() => setPressedChip(null), 120)
  }, [disabled, onSelect])

  return (
    <div 
      data-testid="pct-chips"
      className={cn("flex gap-2", className)}
    >
      {PRESET_PERCENTS.map((percent) => {
        const isSelected = value === percent
        const isPressed = pressedChip === percent
        
        return (
          <button
            key={percent}
            onClick={() => handlePress(percent)}
            disabled={disabled}
            aria-label={`Set amount to ${percent} percent`}
            className={cn(
              "relative flex-1 h-9 rounded-full font-semibold text-xs",
              "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              "border",
              // Default state
              !isSelected && !isPressed && "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50",
              // Selected state - glowing
              isSelected && [
                "bg-gradient-to-br from-primary/20 to-primary/10",
                "border-primary/40 text-primary",
                "shadow-[0_0_12px_rgba(124,77,255,0.3)]",
                "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5",
                "after:bg-gradient-to-r after:from-transparent after:via-primary after:to-transparent",
                "after:opacity-60 after:blur-[1px]"
              ],
              // Pressed state
              isPressed && "scale-[0.97]",
              // Disabled
              disabled && "opacity-40 cursor-not-allowed",
              // Reduced motion
              "motion-reduce:transition-none motion-reduce:scale-100"
            )}
          >
            {percent}%
          </button>
        )
      })}
    </div>
  )
}
