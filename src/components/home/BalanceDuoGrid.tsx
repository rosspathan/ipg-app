import * as React from "react"
import { cn } from "@/lib/utils"

interface BalanceDuoGridProps {
  children: React.ReactNode
  className?: string
}

/**
 * BalanceDuoGrid - Two-column grid for side-by-side BSK cards
 * Renders 2 columns on standard phones, 1 column on very narrow screens
 */
export function BalanceDuoGrid({ children, className }: BalanceDuoGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        "grid-cols-1 min-[340px]:grid-cols-2",
        "w-full",
        className
      )}
      data-testid="bsk-duo-grid"
    >
      {children}
    </div>
  )
}
