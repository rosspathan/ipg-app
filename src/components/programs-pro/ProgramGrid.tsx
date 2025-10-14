import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgramGridProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "compact"
}

/**
 * ProgramGrid - Unified responsive grid for all program tiles
 * - default: 2 cols @ 360-430px, 3 cols @ ≥480px (auto-fit 156px tiles)
 * - compact: 3 cols @ ≤359px, 4 cols @ 360-430px, 5 cols @ ≥480px (PhonePe-style)
 */
export function ProgramGrid({ 
  children, 
  className,
  variant = "default" 
}: ProgramGridProps) {
  return (
    <div 
      data-testid={variant === "compact" ? "program-grid-compact" : "program-grid"}
      className={cn(
        "grid gap-4 w-full",
        variant === "default" && [
          "grid-cols-[repeat(auto-fit,minmax(156px,1fr))]",
          "auto-rows-fr"
        ],
        variant === "compact" && [
          "gap-3",
          "grid-cols-3",
          "xs:grid-cols-4",
          "sm:grid-cols-5"
        ],
        className
      )}
    >
      {children}
    </div>
  )
}
