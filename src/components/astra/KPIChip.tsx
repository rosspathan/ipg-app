import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const kpiChipVariants = cva(
  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-standard",
  {
    variants: {
      variant: {
        default: "bg-card-glass/50 text-text-secondary border border-border-subtle",
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/10 text-warning border border-warning/20", 
        danger: "bg-danger/10 text-danger border border-danger/20",
        primary: "bg-primary/10 text-primary border border-primary/20",
        accent: "bg-accent/10 text-accent border border-accent/20",
        glass: "bg-card-glass backdrop-blur-xl text-text-primary border border-border-subtle",
        neon: "bg-transparent border border-accent text-accent shadow-[0_0_8px_rgba(0,229,255,0.3)]"
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1.5 text-xs",
        lg: "px-4 py-2 text-sm"
      },
      glow: {
        none: "",
        subtle: "shadow-sm",
        medium: "shadow-md",
        strong: "shadow-lg shadow-current/20"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      glow: "none"
    }
  }
)

export interface KPIChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kpiChipVariants> {
  icon?: React.ReactNode
  value?: string | number
  label?: string
}

const KPIChip = React.forwardRef<HTMLDivElement, KPIChipProps>(
  ({ className, variant, size, glow, icon, value, label, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(kpiChipVariants({ variant, size, glow, className }))}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {value && (
          <span className="font-mono tabular-nums font-semibold">
            {value}
          </span>
        )}
        {label && (
          <span className="text-text-secondary">
            {label}
          </span>
        )}
        {children}
      </div>
    )
  }
)
KPIChip.displayName = "KPIChip"

export { KPIChip, kpiChipVariants }