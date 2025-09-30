import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import logoImage from "@/assets/ipg-ismart-logo.jpg"

interface BrandLogoBlinkProps {
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  showAnimation?: boolean
  status?: "idle" | "loading" | "success" | "error"
  className?: string
}

/**
 * BrandLogoBlink - Animated top-left sticky logo
 * - Blinks/twinkles every ~6s
 * - Reacts to status (loading spin, success pulse, error shake)
 * - Respects prefers-reduced-motion
 */
export function BrandLogoBlink({
  size = "md",
  onClick,
  showAnimation = true,
  status = "idle",
  className
}: BrandLogoBlinkProps) {
  const [blink, setBlink] = useState(false)
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false

  // Blink cycle every 6s
  useEffect(() => {
    if (!showAnimation || prefersReducedMotion) return

    const interval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 200)
    }, 6000)

    return () => clearInterval(interval)
  }, [showAnimation, prefersReducedMotion])

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  }

  const statusClasses = {
    idle: "",
    loading: "animate-spin",
    success: "animate-pulse",
    error: "animate-shake"
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center rounded-full",
        "bg-gradient-to-br from-primary to-secondary",
        "transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
        sizeClasses[size],
        statusClasses[status],
        className
      )}
      aria-label="i-SMART Logo"
      data-testid="brand-logo-blink"
    >
      {/* Outer glow */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full blur-lg opacity-0 transition-opacity duration-[220ms]",
          "bg-gradient-to-br from-primary to-accent",
          blink && "opacity-80",
          status === "success" && "opacity-60 bg-success"
        )}
      />

      {/* Inner glow ring */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full",
          "ring-1 ring-inset ring-white/20",
          status === "success" && "ring-success",
          status === "error" && "ring-danger"
        )}
      />

      {/* Logo mark - IPG I-SMART */}
      <div className={cn(
        "relative z-10 flex items-center justify-center w-full h-full p-1",
        "transition-all duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        blink && "brightness-150 scale-110"
      )}>
        <img 
          src={logoImage} 
          alt="IPG I-SMART" 
          className="w-full h-full object-contain rounded-full drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]"
        />
      </div>

      {/* Status indicator */}
      {status !== "idle" && (
        <div 
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
            status === "loading" && "bg-warning",
            status === "success" && "bg-success animate-pulse",
            status === "error" && "bg-danger"
          )}
        />
      )}
    </button>
  )
}
