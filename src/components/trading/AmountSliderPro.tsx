import * as React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface AmountSliderProProps {
  value: number // 0-100
  onChange: (percent: number) => void
  baseAmount: string
  quoteAmount: string
  baseSymbol: string
  quoteSymbol: string
  disabled?: boolean
  className?: string
}

/**
 * AmountSliderPro - Premium slider with value bubble and ticks
 */
export function AmountSliderPro({
  value,
  onChange,
  baseAmount,
  quoteAmount,
  baseSymbol,
  quoteSymbol,
  disabled = false,
  className
}: AmountSliderProProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showBubble, setShowBubble] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return
    
    setIsDragging(true)
    setShowBubble(true)
    
    if (navigator.vibrate) {
      navigator.vibrate(5)
    }
    
    const slider = sliderRef.current
    if (!slider) return
    
    const updateValue = (clientX: number) => {
      const rect = slider.getBoundingClientRect()
      const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      onChange(Math.round(percent))
    }
    
    updateValue(e.clientX)
    
    const handlePointerMove = (e: PointerEvent) => {
      updateValue(e.clientX)
    }
    
    const handlePointerUp = () => {
      setIsDragging(false)
      setShowBubble(false)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
    
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }, [disabled, onChange])

  return (
    <div 
      data-testid="amount-slider"
      className={cn("relative py-6", className)}
    >
      {/* Value Bubble */}
      {showBubble && (
        <div
          className={cn(
            "absolute -top-1 z-10",
            "px-3 py-2 rounded-lg",
            "bg-gradient-to-br from-primary/95 to-primary/85 backdrop-blur-sm",
            "border border-primary/30 shadow-lg shadow-primary/20",
            "pointer-events-none",
            "animate-scale-in origin-bottom",
            "motion-reduce:animate-none"
          )}
          style={{
            left: `${value}%`,
            transform: `translateX(-50%)`
          }}
        >
          <div className="text-xs font-bold text-white whitespace-nowrap tabular-nums">
            {baseAmount} {baseSymbol}
          </div>
          <div className="text-[10px] text-primary-foreground/70 tabular-nums">
            ≈ {quoteAmount} {quoteSymbol}
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45 border-r border-b border-primary/30" />
        </div>
      )}
      
      {/* Slider Track */}
      <div
        ref={sliderRef}
        onPointerDown={handlePointerDown}
        className={cn(
          "relative h-2 rounded-full cursor-pointer",
          "bg-muted/30",
          disabled && "opacity-40 cursor-not-allowed"
        )}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Set amount"
        tabIndex={disabled ? -1 : 0}
      >
        {/* Ticks */}
        <div className="absolute inset-0 flex justify-between items-center px-1">
          {[0, 25, 50, 75, 100].map((tick) => (
            <div
              key={tick}
              className="w-0.5 h-3 bg-border/40 rounded-full"
            />
          ))}
        </div>
        
        {/* Filled Track */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            "bg-gradient-to-r from-primary via-accent to-primary",
            "transition-all duration-100 ease-out",
            "motion-reduce:transition-none"
          )}
          style={{ width: `${value}%` }}
        />
        
        {/* Thumb */}
        <div
          ref={thumbRef}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "w-5 h-5 rounded-full",
            "bg-background border-2 border-primary",
            "shadow-lg shadow-primary/30",
            "transition-all duration-[120ms] ease-out",
            isDragging && "scale-125 shadow-xl shadow-primary/40",
            "motion-reduce:scale-100 motion-reduce:shadow-lg"
          )}
          style={{ left: `${value}%` }}
        />
      </div>
      
      {/* Min/Max Labels */}
      <div className="flex justify-between mt-2 px-1">
        <span className="text-[10px] text-muted-foreground tabular-nums">0%</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">100%</span>
      </div>
    </div>
  )
}
