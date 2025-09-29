import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  variant?: "default" | "primary" | "success" | "warning" | "danger"
  onPress: () => void
}

interface QuickActionsRibbonProps {
  actions: QuickAction[]
  className?: string
  compact?: boolean
}

const variantStyles = {
  default: "bg-card-secondary/60 text-foreground hover:bg-card-secondary border-border/40",
  primary: "bg-primary/20 text-primary hover:bg-primary/30 border-primary/40",
  success: "bg-success/20 text-success hover:bg-success/30 border-success/40", 
  warning: "bg-warning/20 text-warning hover:bg-warning/30 border-warning/40",
  danger: "bg-danger/20 text-danger hover:bg-danger/30 border-danger/40"
}

export function QuickActionsRibbon({ 
  actions, 
  className, 
  compact = false 
}: QuickActionsRibbonProps) {
  if (actions.length === 0) return null

  return (
    <div 
      className={cn(
        "grid gap-2 w-full",
        actions.length <= 2 && "grid-cols-2",
        actions.length === 3 && "grid-cols-3", 
        actions.length === 4 && "grid-cols-2 sm:grid-cols-4",
        actions.length >= 5 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-5",
        className
      )}
      data-testid="quick-actions"
    >
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={action.onPress}
          className={cn(
            "flex flex-col items-center gap-2 border transition-all duration-220",
            "hover:scale-105 active:scale-95",
            compact ? "h-16 p-2" : "h-20 p-3",
            variantStyles[action.variant || "default"]
          )}
        >
          <div className={cn(
            "flex items-center justify-center",
            compact ? "w-5 h-5" : "w-6 h-6"
          )}>
            {action.icon}
          </div>
          
          <span className={cn(
            "font-medium text-center leading-tight line-clamp-2",
            compact ? "text-xs" : "text-sm"
          )}>
            {action.label}
          </span>
        </Button>
      ))}
    </div>
  )
}