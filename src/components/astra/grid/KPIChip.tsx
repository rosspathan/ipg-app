import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const kpiChipVariants = cva(
  "flex items-center gap-2 rounded-xl border transition-all duration-220",
  {
    variants: {
      variant: {
        default: "bg-card/60 border-border/40 text-foreground",
        primary: "bg-primary/20 border-primary/40 text-primary",
        success: "bg-success/20 border-success/40 text-success",
        warning: "bg-warning/20 border-warning/40 text-warning",
        accent: "bg-accent/20 border-accent/40 text-accent"
      },
      size: {
        sm: "px-3 py-2 text-xs",
        md: "px-4 py-3 text-sm",
        lg: "px-6 py-4 text-base"
      },
      glow: {
        true: "shadow-neon",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      glow: false
    }
  }
)

export interface KPIChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kpiChipVariants> {
  icon?: React.ReactNode
  value: string | number
  label: string
  trending?: "up" | "down" | "neutral"
}

export const KPIChip = React.forwardRef<HTMLDivElement, KPIChipProps>(
  ({ className, variant, size, glow, icon, value, label, trending, ...props }, ref) => {
    const trendIcon = {
      up: "📈",
      down: "📉", 
      neutral: "➡️"
    }

    return (
      <div
        className={cn(kpiChipVariants({ variant, size, glow, className }))}
        ref={ref}
        {...props}
      >
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="font-bold font-mono tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          <div className="text-xs opacity-75 line-clamp-1">
            {label}
          </div>
        </div>
        
        {trending && (
          <div className="text-xs">
            {trendIcon[trending]}
          </div>
        )}
      </div>
    )
  }
)

KPIChip.displayName = "KPIChip"

export { kpiChipVariants }