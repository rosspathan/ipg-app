import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgramGridProProps {
  children: React.ReactNode
  className?: string
}

export function ProgramGridPro({ children, className }: ProgramGridProProps) {
  return (
    <div 
      data-testid="program-grid"
      className={cn(
        "grid gap-4 w-full",
        "grid-cols-[repeat(auto-fit,minmax(156px,1fr))]",
        "auto-rows-fr",
        className
      )}
    >
      {children}
    </div>
  )
}
