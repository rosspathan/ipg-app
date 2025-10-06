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
        "relative w-full px-4 py-3 rounded-[20px] overflow-hidden",
        "bg-gradient-to-br from-card/95 via-card/85 to-card/95",
        "backdrop-blur-xl border border-border/50",
        "transition-all duration-300 ease-out",
        "hover:border-primary/40 hover:shadow-[0_8px_32px_rgba(124,77,255,0.15)]",
        "active:scale-[0.99]",
        "focus:outline-none focus:ring-2 focus:ring-primary/30",
        "group cursor-pointer",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(24px)',
        backdropFilter: 'blur(24px)',
      }}
      data-testid="kpi-card-unified"
    >
      {/* Main content - Single horizontal line with stacked percentage */}
      <div className="relative flex items-center justify-between gap-4">
        {/* Left: Portfolio Icon + Value with stacked percentage */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Icon */}
          <div className={cn(
            "h-9 w-9 rounded-[14px] flex items-center justify-center",
            "bg-gradient-to-br from-success/20 to-success/5",
            "transition-all duration-300 group-hover:scale-105 group-hover:from-success/25"
          )}>
            <Wallet className="h-4.5 w-4.5 text-success" />
          </div>

          {/* Portfolio Value with percentage below */}
          <div className="flex flex-col gap-0.5">
            <span className="font-[Space_Grotesk] font-bold text-lg text-foreground tabular-nums leading-none tracking-tight">
              {portfolioData?.value || "₹0"}
            </span>
            {portfolioData?.subValue && (
              <span className="text-[11px] font-[Inter] font-semibold text-success tabular-nums leading-none">
                {portfolioData.subValue}
              </span>
            )}
          </div>
        </div>

        {/* Center: 24h Change Section */}
        <div className="flex items-center gap-3">
          {/* 24h Change Value */}
          {changeData && (
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-[Inter] font-semibold text-muted-foreground/50 uppercase tracking-wider leading-none">
                  24H CHANGE
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn(
                    "font-[Space_Grotesk] font-bold text-sm tabular-nums leading-none",
                    changeData?.trend === "up" ? "text-success" : "text-danger"
                  )}>
                    {changeData.value}
                  </span>
                  {changeData.subValue && (
                    <span className="text-[10px] font-[Inter] font-medium text-muted-foreground/60 tabular-nums leading-none">
                      {changeData.subValue}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Trend Badge */}
          {changeData?.trend && (
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg",
              "transition-all duration-300",
              changeData.trend === "up" && "bg-success/10 text-success group-hover:bg-success/15",
              changeData.trend === "down" && "bg-danger/10 text-danger group-hover:bg-danger/15"
            )}>
              <span className="text-[10px] font-[Inter] font-bold leading-none">
                {changeData.trend === "up" ? "Bullish" : "Bearish"}
              </span>
            </div>
          )}
        </div>

        {/* Right: Status Badge */}
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "bg-gradient-to-r from-warning/20 to-warning/10",
          "border border-warning/30",
          "transition-all duration-300 group-hover:border-warning/40 group-hover:from-warning/25"
        )}>
          <Award className="h-3.5 w-3.5 text-warning" />
          <span className="text-[11px] font-[Space_Grotesk] font-bold text-warning leading-none">
            {statusData?.value || "Member"}
          </span>
        </div>
      </div>

      {/* Subtle gradient overlay on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(120deg, transparent 25%, rgba(255, 255, 255, 0.05) 50%, transparent 75%)',
          backgroundSize: '200% 100%',
          animation: 'shine-sweep 3s ease-in-out infinite'
        }}
      />

      <style>{`
        @keyframes shine-sweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </button>
  )
}
