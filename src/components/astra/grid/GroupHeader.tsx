import * as React from "react"
import { cn } from "@/lib/utils"

interface GroupHeaderProps {
  title: string
  subtitle?: string
  count?: number
  icon?: React.ReactNode
  action?: React.ReactNode
  sticky?: boolean
  className?: string
}

export function GroupHeader({
  title,
  subtitle,
  count,
  icon,
  action,
  sticky = true,
  className
}: GroupHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 px-4",
        "bg-background/95 backdrop-blur-sm border-b border-border/30",
        sticky && "sticky top-16 z-30",
        className
      )}
      data-testid="group-header"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-6 h-6 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
        
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg text-foreground">
              {title}
            </h2>
            
            {typeof count === "number" && (
              <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded-full font-mono tabular-nums">
                {count}
              </span>
            )}
          </div>
          
          {subtitle && (
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}