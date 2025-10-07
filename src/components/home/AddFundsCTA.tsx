import * as React from "react"
import { ArrowUpRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AddFundsCTAProps {
  onPress?: () => void
  className?: string
}

/**
 * AddFundsCTA - Gradient button with "Instant" chip
 */
export function AddFundsCTA({ onPress, className }: AddFundsCTAProps) {
  return (
    <Button
      onClick={onPress}
      className={cn(
        "w-full h-14 rounded-2xl relative overflow-hidden",
        "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%]",
        "text-white font-[Space_Grotesk] font-bold text-base",
        "transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:bg-[position:100%_0] hover:opacity-90",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "group",
        className
      )}
      style={{
        boxShadow: '0 8px 24px rgba(124, 77, 255, 0.4)'
      }}
      data-testid="add-funds-cta"
    >
      {/* Animated background glow */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[600ms]"
      />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        <ArrowUpRight className="h-5 w-5" />
        <span>Add Funds</span>
        
        {/* "Instant" chip */}
        <span className={cn(
          "ml-2 px-2 py-0.5 rounded-full text-[10px] font-[Inter] font-semibold",
          "bg-white/20 backdrop-blur-sm border border-white/30"
        )}>
          <Zap className="inline h-2.5 w-2.5 mr-0.5" />
          Instant
        </span>
      </div>
    </Button>
  )
}
