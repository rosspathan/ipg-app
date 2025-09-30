import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

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

      {/* Logo mark - "IS" monogram */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
        >
          {/* "I" */}
          <rect x="6" y="8" width="4" height="16" fill="white" rx="1" />
          
          {/* "S" */}
          <path
            d="M18 8C15.79 8 14 9.79 14 12C14 13.1 14.4 14.1 15 14.83C15.6 15.53 16.4 16 17.5 16H19C19.55 16 20 16.45 20 17C20 17.55 19.55 18 19 18H14V20H19C21.21 20 23 18.21 23 16C23 14.9 22.6 13.9 22 13.17C21.4 12.47 20.6 12 19.5 12H18C17.45 12 17 11.55 17 11C17 10.45 17.45 10 18 10H23V8H18Z"
            fill="white"
          />

          {/* Spark on "I" dot (blinks) */}
          {blink && !prefersReducedMotion && (
            <circle cx="8" cy="6" r="1.5" fill="#00E5FF" className="animate-ping" />
          )}
        </svg>
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
