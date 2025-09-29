import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgramGridProps {
  children: React.ReactNode
  className?: string
  compact?: boolean
  columns?: 2 | 3 | 4
}

export function ProgramGrid({ 
  children, 
  className, 
  compact = false,
  columns
}: ProgramGridProps) {
  const getGridCols = () => {
    if (columns) {
      return {
        2: "grid-cols-2",
        3: "grid-cols-2 md:grid-cols-3",
        4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      }[columns]
    }
    
    // Responsive default: 2 cols @ 360-430px, 3 cols @ ≥480px
    return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3"
  }

  return (
    <div 
      className={cn(
        "grid gap-4 w-full",
        "auto-rows-fr", // Equal height rows
        getGridCols(),
        compact ? "gap-3" : "gap-4",
        className
      )}
      data-testid="program-grid"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(156px, 1fr))"
      }}
    >
      {children}
    </div>
  )
}