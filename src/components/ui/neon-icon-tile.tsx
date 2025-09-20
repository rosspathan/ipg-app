import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

const neonIconTileVariants = cva(
  [
    "relative group rounded-2xl p-4 cursor-pointer",
    "bg-card-glass backdrop-blur-[16px] border border-white/10",
    "transition-all duration-normal ease-out",
    "hover:scale-105 hover:shadow-cyber",
    "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-ring",
    "before:opacity-0 before:transition-opacity before:duration-normal before:-z-10",
    "hover:before:opacity-30"
  ],
  {
    variants: {
      variant: {
        default: "",
        primary: "bg-primary/10 border-primary/30",
        secondary: "bg-secondary/10 border-secondary/30", 
        accent: "bg-accent/10 border-accent/30"
      },
      size: {
        sm: "w-16 h-16 p-3",
        md: "w-20 h-20 p-4",
        lg: "w-24 h-24 p-5"
      },
      glow: {
        none: "",
        subtle: "shadow-glow-primary/50",
        strong: "shadow-cyber animate-cyber-glow"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      glow: "none"
    }
  }
);

export interface NeonIconTileProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof neonIconTileVariants> {
  icon: LucideIcon;
  label?: string;
  badge?: string | number;
}

const NeonIconTile = React.forwardRef<HTMLButtonElement, NeonIconTileProps>(
  ({ className, variant, size, glow, icon: Icon, label, badge, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(neonIconTileVariants({ variant, size, glow }), className)}
      {...props}
    >
      <div className="flex flex-col items-center justify-center w-full h-full space-y-1">
        <div className="relative">
          <Icon className={cn(
            "text-primary transition-all duration-normal group-hover:scale-110",
            size === "sm" && "w-6 h-6",
            size === "md" && "w-8 h-8", 
            size === "lg" && "w-10 h-10"
          )} />
          {badge && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{badge}</span>
            </div>
          )}
        </div>
        {label && (
          <span className="text-xs font-medium text-center leading-tight text-muted-foreground group-hover:text-foreground transition-colors">
            {label}
          </span>
        )}
      </div>
    </button>
  )
);

NeonIconTile.displayName = "NeonIconTile";

export { NeonIconTile, neonIconTileVariants };