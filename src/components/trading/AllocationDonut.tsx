import * as React from "react"
import { cn } from "@/lib/utils"

interface AllocationDonutProps {
  percentage: number // 0-100
  className?: string
}

/**
 * AllocationDonut - Micro donut showing allocation percentage
 */
export function AllocationDonut({ percentage, className }: AllocationDonutProps) {
  const radius = 16
  const strokeWidth = 3
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div 
      data-testid="allocation-donut"
      className={cn("relative inline-flex items-center justify-center", className)}
    >
      <svg width="40" height="40" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r={normalizedRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx="20"
          cy="20"
          r={normalizedRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            "text-primary transition-all duration-[120ms] ease-out",
            "motion-reduce:transition-none"
          )}
        />
      </svg>
      
      {/* Center Text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold tabular-nums">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  )
}
