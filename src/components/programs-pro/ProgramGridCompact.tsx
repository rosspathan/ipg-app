import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgramGridCompactProps {
  children: React.ReactNode
  className?: string
}

/**
 * ProgramGridCompact - Responsive compact grid for PhonePe-style tiles
 * - 3 cols @ ≤359px
 * - 4 cols @ 360-430px
 * - 5 cols @ ≥480px
 */
export function ProgramGridCompact({ children, className }: ProgramGridCompactProps) {
  return (
    <div 
      data-testid="program-grid-compact"
      className={cn(
        "grid gap-3 w-full",
        // 3 columns for very small screens
        "grid-cols-3",
        // 4 columns for 360-430px (PhonePe-like)
        "xs:grid-cols-4",
        // 5 columns for ≥480px
        "sm:grid-cols-5",
        className
      )}
    >
      {children}
    </div>
  )
}
