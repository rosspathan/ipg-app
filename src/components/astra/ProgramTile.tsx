import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { AstraCard } from "./AstraCard"

const programTileVariants = cva(
  "relative h-40 w-full transition-all duration-slow cursor-pointer group",
  {
    variants: {
      category: {
        earn: "hover:shadow-[0_8px_32px_rgba(0,229,255,0.3)]",
        games: "hover:shadow-[0_8px_32px_rgba(136,83,255,0.3)]", 
        finance: "hover:shadow-[0_8px_32px_rgba(247,165,59,0.3)]",
        trading: "hover:shadow-[0_8px_32px_rgba(43,214,123,0.3)]"
      },
      status: {
        available: "",
        locked: "opacity-60",
        coming_soon: "opacity-50"
      }
    },
    defaultVariants: {
      category: "earn",
      status: "available"
    }
  }
)

const badgeVariants = cva(
  "absolute -top-1 -right-1 px-2 py-0.5 text-xs font-bold rounded-full z-10",
  {
    variants: {
      type: {
        new: "bg-accent text-accent-foreground animate-pulse",
        hot: "bg-danger text-danger-foreground",
        daily: "bg-warning text-warning-foreground",
        live: "bg-success text-success-foreground animate-pulse"
      }
    }
  }
)

export interface ProgramTileProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof programTileVariants> {
  icon: React.ReactNode
  title: string
  description: string
  badge?: {
    type: "new" | "hot" | "daily" | "live"
    text: string
  }
  onPress?: () => void
}

const ProgramTile = React.forwardRef<HTMLDivElement, ProgramTileProps>(
  ({ 
    className, 
    category, 
    status, 
    icon, 
    title, 
    description, 
    badge, 
    onPress,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(programTileVariants({ category, status, className }))}
        onClick={status === "available" ? onPress : undefined}
        data-testid={`program-tile-${title.toLowerCase().replace(/\s+/g, '-')}`}
        {...props}
      >
        {badge && (
          <div className={cn(badgeVariants({ type: badge.type }))}>
            {badge.text}
          </div>
        )}
        
        <AstraCard 
          variant="elevated" 
          className="h-full group-hover:scale-105 group-active:scale-[0.98] transition-transform duration-slow p-6"
        >
          <div className="flex flex-col h-full">
            {/* Icon Section */}
            <div className="flex items-center justify-center mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-slow",
                category === "earn" && "bg-accent/10 text-accent group-hover:bg-accent/20 group-hover:shadow-[0_0_16px_rgba(0,229,255,0.4)]",
                category === "games" && "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:shadow-[0_0_16px_rgba(136,83,255,0.4)]",
                category === "finance" && "bg-warning/10 text-warning group-hover:bg-warning/20 group-hover:shadow-[0_0_16px_rgba(247,165,59,0.4)]",
                category === "trading" && "bg-success/10 text-success group-hover:bg-success/20 group-hover:shadow-[0_0_16px_rgba(43,214,123,0.4)]"
              )}>
                {icon}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 text-center">
              <h3 className="font-heading font-semibold text-sm mb-2 group-hover:text-primary transition-all duration-standard">
                {title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {description}
              </p>
            </div>
            
            {/* Status indicator */}
            {status === "locked" && (
              <div className="absolute inset-0 bg-background-primary/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <div className="text-xs font-medium bg-card-glass/80 px-3 py-1 rounded border border-border-subtle">
                  Locked
                </div>
              </div>
            )}
            
            {status === "coming_soon" && (
              <div className="absolute inset-0 bg-background-primary/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <div className="text-xs font-medium bg-card-glass/80 px-3 py-1 rounded border border-border-subtle">
                  Coming Soon
                </div>
              </div>
            )}
          </div>
        </AstraCard>
      </div>
    )
  }
)
ProgramTile.displayName = "ProgramTile"

export { ProgramTile, programTileVariants }