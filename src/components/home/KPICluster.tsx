import * as React from "react"
import { TrendingUp, TrendingDown, Wallet, Activity, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface KPIData {
  label: string
  value: string
  subValue?: string
  trend?: "up" | "down" | "neutral"
  type: "portfolio" | "change" | "status"
}

interface KPIClusterProps {
  data?: KPIData[]
  isLoading?: boolean
  onTilePress?: (type: string) => void
  className?: string
}

/**
 * KPICluster - 3 compact glassy tiles for key metrics
 * Portfolio / 24h Change / Status
 */
export function KPICluster({ data, isLoading = false, onTilePress, className }: KPIClusterProps) {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-3 gap-3", className)} data-testid="kpi-cluster">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    )
  }

  const defaultData: KPIData[] = [
    {
      label: "Portfolio",
      value: "₹2,45,678",
      subValue: "+12.4%",
      trend: "up",
      type: "portfolio"
    },
    {
      label: "24h Change",
      value: "+12.4%",
      subValue: "+₹27,450",
      trend: "up",
      type: "change"
    },
    {
      label: "Status",
      value: "VIP Gold",
      type: "status"
    }
  ]

  const kpiData = data || defaultData

  const getIcon = (type: string) => {
    const iconClass = "h-5 w-5"
    switch (type) {
      case "portfolio":
        return <Wallet className={cn(iconClass, "text-success")} />
      case "change":
        return <Activity className={cn(iconClass, "text-primary")} />
      case "status":
        return <Award className={cn(iconClass, "text-warning")} />
      default:
        return <Wallet className={iconClass} />
    }
  }

  const getBgClass = (type: string) => {
    switch (type) {
      case "portfolio":
        return "from-success/15 via-success/8 to-transparent"
      case "change":
        return "from-primary/15 via-primary/8 to-transparent"
      case "status":
        return "from-warning/15 via-warning/8 to-transparent"
      default:
        return "from-accent/15 via-accent/8 to-transparent"
    }
  }

  const getBorderGlow = (type: string) => {
    switch (type) {
      case "portfolio":
        return "hover:shadow-[0_0_20px_rgba(43,214,123,0.3)]"
      case "change":
        return "hover:shadow-[0_0_20px_rgba(124,77,255,0.3)]"
      case "status":
        return "hover:shadow-[0_0_20px_rgba(247,165,59,0.3)]"
      default:
        return "hover:shadow-[0_0_20px_rgba(0,229,255,0.3)]"
    }
  }

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case "up":
        return "text-success"
      case "down":
        return "text-danger"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div 
      className={cn("grid grid-cols-3 gap-3", className)} 
      data-testid="kpi-cluster"
    >
      {kpiData.map((kpi, index) => (
        <button
          key={kpi.type}
          onClick={() => onTilePress?.(kpi.type)}
          className={cn(
            "relative p-4 rounded-[20px] overflow-hidden",
            "bg-gradient-to-br from-card/90 via-card/70 to-card/90",
            "backdrop-blur-2xl border border-border/40",
            "transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            "hover:scale-[1.04] hover:border-primary/50 active:scale-[0.97]",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            "group cursor-pointer",
            getBorderGlow(kpi.type)
          )}
          style={{
            WebkitBackdropFilter: 'blur(24px)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Animated gradient background */}
          <div 
            className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0",
              "transition-all duration-[320ms]",
              "group-hover:opacity-100",
              getBgClass(kpi.type)
            )}
            style={{
              animation: 'gradient-shift 3s ease infinite',
              backgroundSize: '200% 200%'
            }}
          />

          {/* Top glow rim */}
          <div 
            className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[220ms]"
          />

          {/* Content */}
          <div className="relative space-y-2.5">
            {/* Icon with glow */}
            <div className="flex items-center justify-between">
              <div className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br transition-all duration-[220ms]",
                "group-hover:scale-110 group-hover:rotate-3",
                kpi.type === "portfolio" && "from-success/20 to-success/10 group-hover:from-success/30 group-hover:to-success/15",
                kpi.type === "change" && "from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/15",
                kpi.type === "status" && "from-warning/20 to-warning/10 group-hover:from-warning/30 group-hover:to-warning/15"
              )}>
                {getIcon(kpi.type)}
              </div>
              
              {/* Label - moved to top right */}
              <span className="text-[8px] font-[Inter] font-semibold text-muted-foreground/70 uppercase tracking-[0.08em]">
                {kpi.label}
              </span>
            </div>

            {/* Value with enhanced typography */}
            <div className="space-y-0.5">
              <div className={cn(
                "font-[Space_Grotesk] font-bold text-foreground",
                "transition-all duration-[180ms]",
                "group-hover:text-primary-glow",
                kpi.type === "status" ? "text-sm" : "text-base tabular-nums tracking-tight",
                "leading-none"
              )}>
                {kpi.value}
              </div>

              {/* SubValue with trend indicator */}
              {kpi.subValue && (
                <div className="flex items-center gap-1.5 mt-1">
                  {kpi.trend && (
                    <div className={cn(
                      "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md",
                      "transition-all duration-[180ms]",
                      kpi.trend === "up" && "bg-success/15 text-success",
                      kpi.trend === "down" && "bg-danger/15 text-danger"
                    )}>
                      {kpi.trend === "up" ? (
                        <TrendingUp className="h-2 w-2" />
                      ) : (
                        <TrendingDown className="h-2 w-2" />
                      )}
                      <span className="text-[9px] font-[Inter] font-bold tabular-nums">
                        {kpi.subValue}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Premium shine sweep effect */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[500ms] pointer-events-none"
            style={{
              background: 'linear-gradient(110deg, transparent 25%, rgba(255, 255, 255, 0.1) 50%, transparent 75%)',
              backgroundSize: '200% 100%',
              animation: 'shine-sweep 2s ease-in-out infinite'
            }}
          />

          {/* Corner accent */}
          <div 
            className={cn(
              "absolute top-0 right-0 w-12 h-12 opacity-20 blur-2xl transition-opacity duration-[320ms]",
              "group-hover:opacity-40",
              kpi.type === "portfolio" && "bg-success",
              kpi.type === "change" && "bg-primary",
              kpi.type === "status" && "bg-warning"
            )}
          />
        </button>
      ))}
    </div>
  )
}
