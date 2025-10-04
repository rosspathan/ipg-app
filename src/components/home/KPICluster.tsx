import * as React from "react"
import { TrendingUp, TrendingDown, Award } from "lucide-react"
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
    switch (type) {
      case "portfolio":
        return "💰"
      case "change":
        return "📈"
      case "status":
        return "⭐"
      default:
        return "💎"
    }
  }

  const getBgClass = (type: string) => {
    switch (type) {
      case "portfolio":
        return "from-success/20 to-success/5"
      case "change":
        return "from-primary/20 to-primary/5"
      case "status":
        return "from-warning/20 to-warning/5"
      default:
        return "from-accent/20 to-accent/5"
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
            "relative p-3 rounded-2xl overflow-hidden",
            "bg-card/60 backdrop-blur-xl border border-border/30",
            "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            "hover:scale-[1.03] hover:border-primary/40 active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            "group"
          )}
          style={{
            WebkitBackdropFilter: 'blur(16px)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}
        >
          {/* Gradient background */}
          <div 
            className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-40",
              "transition-opacity duration-[220ms]",
              "group-hover:opacity-60",
              getBgClass(kpi.type)
            )}
          />

          {/* Content */}
          <div className="relative space-y-1.5">
            {/* Icon */}
            <div className="text-xl leading-none">{getIcon(kpi.type)}</div>

            {/* Value */}
            <div className={cn(
              "font-[Space_Grotesk] font-bold text-foreground",
              "transition-all duration-[120ms]",
              kpi.type === "status" ? "text-sm" : "text-base tabular-nums"
            )}>
              {kpi.value}
            </div>

            {/* SubValue or Label */}
            <div className="flex items-center gap-1 text-[10px] font-[Inter] font-medium">
              {kpi.trend && (
                kpi.trend === "up" ? (
                  <TrendingUp className={cn("h-3 w-3", getTrendColor(kpi.trend))} />
                ) : kpi.trend === "down" ? (
                  <TrendingDown className={cn("h-3 w-3", getTrendColor(kpi.trend))} />
                ) : null
              )}
              <span className={cn(
                kpi.trend ? getTrendColor(kpi.trend) : "text-muted-foreground"
              )}>
                {kpi.subValue || kpi.label}
              </span>
            </div>
          </div>

          {/* Shine effect on hover */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[320ms] pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, transparent 30%, rgba(124, 77, 255, 0.1) 50%, rgba(0, 229, 255, 0.1) 70%, transparent)',
              animation: 'shine 2s ease-in-out infinite'
            }}
          />
        </button>
      ))}
    </div>
  )
}
