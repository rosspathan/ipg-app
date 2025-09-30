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
        "w-16 h-16 rounded-full",
        "bg-gradient-to-br from-primary via-secondary to-accent",
        "shadow-[0_0_24px_rgba(124,77,255,0.6),0_0_48px_rgba(124,77,255,0.4)]",
        "border-2 border-white/30",
        "transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:scale-110 hover:shadow-[0_0_32px_rgba(124,77,255,0.8),0_0_60px_rgba(124,77,255,0.5)]",
        "active:scale-95",
        "focus:outline-none focus:ring-4 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background",
        "animate-[breathing_3s_ease-in-out_infinite]",
        className
      )}
      aria-label="Quick Actions"
      data-testid="dock-logo-button"
    >
      {/* Outer breathing glow */}
      <div 
        className="absolute -inset-3 rounded-full blur-2xl opacity-70 bg-gradient-to-br from-primary via-secondary to-accent animate-[breathing_3s_ease-in-out_infinite]"
        style={{
          animationDelay: '0.5s'
        }}
      />

      {/* Inner backdrop */}
      <div className="absolute inset-[3px] rounded-full bg-background/20 backdrop-blur-sm border border-white/10" />

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
      <div className="relative z-10 flex items-center justify-center w-full h-full p-2">
        <img 
          src={logoImage} 
          alt="IPG I-SMART" 
          className="w-full h-full object-contain rounded-full drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]"
        />
      </div>
    </button>
  )
}
