import * as React from "react"
import { Wallet, Activity, Award, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface KPIData {
  label: string
  value: string
  subValue?: string
  trend?: "up" | "down" | "neutral"
  type: "portfolio" | "change" | "status"
}

interface KPICardUnifiedProps {
  data?: KPIData[]
  isLoading?: boolean
  onCardPress?: () => void
  className?: string
}

/**
 * KPICardUnified - Single premium card showing all key metrics
 * Portfolio / 24h Change / Status in one beautiful design
 */
export function KPICardUnified({ data, isLoading = false, onCardPress, className }: KPICardUnifiedProps) {
  if (isLoading) {
    return (
      <Skeleton className="h-32 rounded-3xl" data-testid="kpi-card-unified" />
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
      value: "VIP",
      type: "status"
    }
  ]

  const kpiData = data || defaultData
  const portfolioData = kpiData.find(k => k.type === "portfolio")
  const changeData = kpiData.find(k => k.type === "change")
  const statusData = kpiData.find(k => k.type === "status")

  return (
    <button
      onClick={onCardPress}
      className={cn(
        "relative w-full px-4 py-3 rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-card/95 via-card/85 to-card/95",
        "backdrop-blur-2xl border border-border/50",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.01] hover:border-primary/60 active:scale-[0.99]",
        "hover:shadow-[0_8px_30px_rgba(124,77,255,0.2)]",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "group cursor-pointer",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(32px)',
        backdropFilter: 'blur(32px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}
      data-testid="kpi-card-unified"
    >
      {/* Animated gradient overlay */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100",
          "bg-gradient-to-br from-primary/10 via-accent/10 to-success/10",
          "transition-opacity duration-500"
        )}
      />

      {/* Main content - Single horizontal line */}
      <div className="relative flex items-center justify-between gap-3">
        {/* Left: Portfolio */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Icon */}
          <div className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
            "bg-gradient-to-br from-success/25 to-success/10",
            "transition-all duration-300",
            "group-hover:scale-105 group-hover:from-success/35 group-hover:to-success/15"
          )}>
            <Wallet className="h-4 w-4 text-success" />
          </div>

          {/* Portfolio Value */}
          <div className="min-w-0">
            <div className="text-[9px] font-[Inter] font-semibold text-muted-foreground/50 uppercase tracking-wider leading-none mb-0.5">
              {portfolioData?.label || "Portfolio"}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-[Space_Grotesk] font-bold text-lg text-foreground tabular-nums leading-none group-hover:text-primary transition-colors">
                {portfolioData?.value || "₹0"}
              </span>
              {portfolioData?.subValue && (
                <span className="text-[10px] font-[Inter] font-bold text-success tabular-nums leading-none">
                  {portfolioData.subValue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: 24h Change */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Change Icon */}
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-primary/10",
            "transition-all duration-300",
            "group-hover:scale-105 group-hover:from-primary/30 group-hover:to-primary/15"
          )}>
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>

          {/* Change Value */}
          <div>
            <div className="text-[8px] font-[Inter] font-semibold text-muted-foreground/40 uppercase tracking-wider leading-none mb-0.5">
              {changeData?.label || "24h Change"}
            </div>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "font-[Space_Grotesk] font-bold text-sm tabular-nums leading-none",
                changeData?.trend === "up" ? "text-success" : "text-danger"
              )}>
                {changeData?.value || "+0%"}
              </span>
              {changeData?.subValue && (
                <span className="text-[9px] font-[Inter] font-medium text-muted-foreground/60 tabular-nums leading-none">
                  {changeData.subValue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status & Trend */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Trend Badge */}
          {changeData?.trend && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg",
              "transition-all duration-300",
              changeData.trend === "up" && "bg-success/10 text-success group-hover:bg-success/20",
              changeData.trend === "down" && "bg-danger/10 text-danger group-hover:bg-danger/20"
            )}>
              {changeData.trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span className="text-[10px] font-[Inter] font-bold leading-none">
                {changeData.trend === "up" ? "Bullish" : "Bearish"}
              </span>
            </div>
          )}

          {/* Status Badge */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
            "bg-gradient-to-r from-warning/20 to-warning/10",
            "border border-warning/30",
            "transition-all duration-300",
            "group-hover:from-warning/30 group-hover:to-warning/15 group-hover:border-warning/50"
          )}>
            <Award className="h-3 w-3 text-warning" />
            <span className="text-[10px] font-[Space_Grotesk] font-bold text-warning leading-none">
              {statusData?.value || "Member"}
            </span>
          </div>
        </div>
      </div>

      {/* Premium shine effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: 'linear-gradient(110deg, transparent 25%, rgba(255, 255, 255, 0.1) 50%, transparent 75%)',
          backgroundSize: '200% 100%',
          animation: 'shine-sweep 2.5s ease-in-out infinite'
        }}
      />

      {/* Animated gradient keyframes */}
      <style>{`
        @keyframes shine-sweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </button>
  )
}
