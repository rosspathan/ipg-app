import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

const kpiChipVariants = cva(
  [
    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5",
    "bg-card-glass backdrop-blur-[14px] border border-white/10",
    "text-xs font-medium"
  ],
  {
    variants: {
      variant: {
        default: "text-foreground",
        success: "text-success border-success/20 bg-success/5",
        warning: "text-warning border-warning/20 bg-warning/5", 
        danger: "text-danger border-danger/20 bg-danger/5",
        primary: "text-primary border-primary/20 bg-primary/5"
      },
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-xs",
        lg: "px-4 py-2 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface KpiChipProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kpiChipVariants> {
  icon?: LucideIcon;
  value: string | number;
  label?: string;
  delta?: number;
  animate?: boolean;
}

const KpiChip = React.forwardRef<HTMLDivElement, KpiChipProps>(
  ({ className, variant, size, icon: Icon, value, label, delta, animate = false, ...props }, ref) => {
    const getDeltaColor = () => {
      if (delta === undefined) return "";
      if (delta > 0) return "text-success";
      if (delta < 0) return "text-danger";
      return "text-muted-foreground";
    };

    const getDeltaSymbol = () => {
      if (delta === undefined) return "";
      if (delta > 0) return "↑";
      if (delta < 0) return "↓";
      return "";
    };

    return (
      <div
        ref={ref}
        className={cn(
          className

        )}
        {...props}
      >
        {Icon && <Icon className="w-3 h-3" />}
        <div className="flex flex-col">
          <span className="font-bold tabular-nums">{value}</span>
          {label && (
            <span className="text-[10px] text-muted-foreground leading-none">
              {label}
            </span>
          )}
        </div>
        {delta !== undefined && (
          <span className={cn("text-xs font-medium", getDeltaColor())}>
            {getDeltaSymbol()}{Math.abs(delta)}%
          </span>
        )}
      </div>
    );
  }
);

KpiChip.displayName = "KpiChip";

export { KpiChip, kpiChipVariants };