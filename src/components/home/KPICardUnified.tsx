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
        "relative w-full p-6 rounded-[24px] overflow-hidden",
        "bg-gradient-to-br from-card/95 via-card/85 to-card/95",
        "backdrop-blur-2xl border border-border/50",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.02] hover:border-primary/60 active:scale-[0.98]",
        "hover:shadow-[0_20px_60px_rgba(124,77,255,0.25)]",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "group cursor-pointer",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(32px)',
        backdropFilter: 'blur(32px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.25)'
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
        style={{
          animation: 'gradient-shift 6s ease infinite',
          backgroundSize: '200% 200%'
        }}
      />

      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Main content */}
      <div className="relative space-y-5">
        {/* Portfolio Section - Main Focus */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Icon with glow effect */}
            <div className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-success/25 to-success/10",
              "transition-all duration-300",
              "group-hover:scale-110 group-hover:rotate-6 group-hover:from-success/35 group-hover:to-success/15"
            )}>
              <Wallet className="h-6 w-6 text-success drop-shadow-[0_0_8px_rgba(43,214,123,0.5)]" />
            </div>

            {/* Portfolio Value */}
            <div className="space-y-1">
              <span className="text-[10px] font-[Inter] font-semibold text-muted-foreground/60 uppercase tracking-[0.1em] block">
                {portfolioData?.label || "Portfolio"}
              </span>
              <div className="font-[Space_Grotesk] font-bold text-2xl text-foreground tabular-nums tracking-tight leading-none group-hover:text-primary transition-colors duration-300">
                {portfolioData?.value || "₹0"}
              </div>
              {portfolioData?.subValue && portfolioData?.trend && (
                <div className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-lg",
                  "bg-success/15 text-success",
                  "transition-all duration-300 group-hover:bg-success/25"
                )}>
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-[Inter] font-bold tabular-nums">
                    {portfolioData.subValue}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Badge - Top Right */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full",
            "bg-gradient-to-r from-warning/20 to-warning/10",
            "border border-warning/30",
            "transition-all duration-300",
            "group-hover:from-warning/30 group-hover:to-warning/15 group-hover:border-warning/50",
            "group-hover:shadow-[0_0_20px_rgba(247,165,59,0.4)]"
          )}>
            <Award className="h-4 w-4 text-warning" />
            <span className="text-sm font-[Space_Grotesk] font-bold text-warning">
              {statusData?.value || "Member"}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

        {/* 24h Change Section - Bottom */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Change Icon */}
            <div className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-primary/10",
              "transition-all duration-300",
              "group-hover:scale-105 group-hover:from-primary/30 group-hover:to-primary/15"
            )}>
              <Activity className="h-4.5 w-4.5 text-primary" />
            </div>

            {/* Change Label & Value */}
            <div className="space-y-0.5">
              <span className="text-[9px] font-[Inter] font-semibold text-muted-foreground/50 uppercase tracking-[0.1em] block">
                {changeData?.label || "24h Change"}
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-[Space_Grotesk] font-bold text-base tabular-nums",
                  changeData?.trend === "up" ? "text-success" : "text-danger"
                )}>
                  {changeData?.value || "+0%"}
                </span>
                {changeData?.subValue && (
                  <span className="text-xs font-[Inter] font-medium text-muted-foreground tabular-nums">
                    {changeData.subValue}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Trend Indicator */}
          {changeData?.trend && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
              "transition-all duration-300",
              changeData.trend === "up" && "bg-success/10 text-success group-hover:bg-success/20",
              changeData.trend === "down" && "bg-danger/10 text-danger group-hover:bg-danger/20"
            )}>
              {changeData.trend === "up" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span className="text-xs font-[Inter] font-bold">
                {changeData.trend === "up" ? "Bullish" : "Bearish"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Premium shine sweep effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: 'linear-gradient(110deg, transparent 25%, rgba(255, 255, 255, 0.12) 50%, transparent 75%)',
          backgroundSize: '200% 100%',
          animation: 'shine-sweep 2.5s ease-in-out infinite'
        }}
      />

      {/* Corner accent glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-success/20 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />

      {/* Animated gradient keyframes */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shine-sweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </button>
  )
}
