import * as React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import logoImage from "@/assets/ipg-ismart-logo.jpg"

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
        "w-20 h-20 rounded-full",
        "bg-gradient-to-br from-primary via-secondary to-accent",
        "shadow-[0_0_32px_rgba(124,77,255,0.7),0_0_64px_rgba(124,77,255,0.5),0_-8px_24px_rgba(124,77,255,0.4)]",
        "border-4 border-background/80",
        "transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        // Remove continuous breathing animation to prevent flicker
        "hover:scale-110 hover:shadow-[0_0_40px_rgba(124,77,255,0.9),0_0_80px_rgba(124,77,255,0.6),0_-12px_32px_rgba(124,77,255,0.5)]",
        "active:scale-95",
        "focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-4 focus:ring-offset-background",
        className
      )}
      style={{
        transform: 'translateY(-20px)'
      }}
      aria-label="Quick Actions"
      data-testid="dock-logo-button"
    >
      {/* Outer glow (static, no animation) */}
      <div 
        className="absolute -inset-4 rounded-full blur-2xl opacity-60 bg-gradient-to-br from-primary via-secondary to-accent"
      />

      {/* Inner backdrop with stronger border */}
      <div className="absolute inset-[4px] rounded-full bg-background/30 backdrop-blur-sm border-2 border-white/20" />

      {/* Ripple effect */}
      {ripple && (
        <div 
          className="absolute inset-0 rounded-full bg-white/40 animate-ping"
          style={{
            animationDuration: '600ms',
            animationIterationCount: '1'
          }}
        />
      )}

      {/* IPG I-SMART Logo */}
      <div className="relative z-10 flex items-center justify-center w-full h-full p-2.5">
        <img 
          src={logoImage} 
          alt="IPG I-SMART" 
          className="w-full h-full object-contain rounded-full drop-shadow-[0_4px_12px_rgba(255,255,255,0.5)]"
        />
      </div>

      {/* Action hint ring on hover */}
      <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-white/0 hover:ring-white/30 transition-all duration-[220ms]" />
    </button>
  )
}
