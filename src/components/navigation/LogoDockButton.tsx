import * as React from "react"
import { useState } from "react"
import { Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoDockButtonProps {
  onClick?: () => void
  className?: string
}

/**
 * LogoDockButton - Center button in DockNav
 * Round purple coin button with breathing glow
 * Press = ripple + radial QuickSwitch menu
 */
export function LogoDockButton({ onClick, className }: LogoDockButtonProps) {
  const [ripple, setRipple] = useState(false)

  const handleClick = () => {
    setRipple(true)
    setTimeout(() => setRipple(false), 600)
    onClick?.()
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative flex items-center justify-center",
        "w-14 h-14 -mt-8 rounded-full",
        "bg-gradient-to-br from-primary via-secondary to-primary",
        "shadow-2xl shadow-primary/50",
        "transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-4 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background",
        "animate-[breathing_3s_ease-in-out_infinite]",
        className
      )}
      aria-label="Quick Actions"
      data-testid="dock-logo-button"
    >
      {/* Outer breathing glow */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-60 bg-gradient-to-br from-primary to-accent animate-[breathing_3s_ease-in-out_infinite]"
        style={{
          animationDelay: '0.5s'
        }}
      />

      {/* Inner ring */}
      <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-white/30" />

      {/* Ripple effect */}
      {ripple && (
        <div 
          className="absolute inset-0 rounded-full bg-white/30 animate-ping"
          style={{
            animationDuration: '600ms',
            animationIterationCount: '1'
          }}
        />
      )}

      {/* Icon */}
      <Zap className="relative z-10 h-6 w-6 text-white" fill="white" />
    </button>
  )
}
