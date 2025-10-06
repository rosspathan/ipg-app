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
        "relative w-full px-4 py-2.5 rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-card/90 via-card/80 to-card/90",
        "backdrop-blur-xl border border-border/40",
        "transition-all duration-300 ease-out",
        "hover:border-primary/50 active:scale-[0.99]",
        "hover:shadow-[0_4px_20px_rgba(124,77,255,0.15)]",
        "focus:outline-none focus:ring-2 focus:ring-primary/40",
        "group cursor-pointer",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(24px)',
        backdropFilter: 'blur(24px)',
      }}
      data-testid="kpi-card-unified"
    >
      {/* Main content - Single clean horizontal line */}
      <div className="relative flex items-center gap-3">
        {/* Left: Portfolio Icon + Value */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Icon */}
          <div className={cn(
            "h-7 w-7 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-success/20 to-success/10",
            "transition-all duration-300 group-hover:scale-105"
          )}>
            <Wallet className="h-3.5 w-3.5 text-success" />
          </div>

          {/* Portfolio Value + Change */}
          <div className="flex items-baseline gap-1.5">
            <span className="font-[Space_Grotesk] font-bold text-base text-foreground tabular-nums leading-none">
              {portfolioData?.value || "₹0"}
            </span>
            {portfolioData?.subValue && (
              <span className="text-xs font-[Inter] font-bold text-success tabular-nums leading-none">
                {portfolioData.subValue}
              </span>
            )}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-5 w-px bg-border/40" />

        {/* Center: 24h Change */}
        {changeData?.subValue && (
          <>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "font-[Space_Grotesk] font-semibold text-sm tabular-nums leading-none",
                changeData?.trend === "up" ? "text-success" : "text-danger"
              )}>
                {changeData.value}
              </span>
              <span className="text-[10px] font-[Inter] font-medium text-muted-foreground/60 tabular-nums leading-none">
                {changeData.subValue}
              </span>
            </div>

            {/* Vertical divider */}
            <div className="h-5 w-px bg-border/40" />
          </>
        )}

        {/* Trend Badge */}
        {changeData?.trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0",
            "transition-all duration-300",
            changeData.trend === "up" && "bg-success/10 text-success",
            changeData.trend === "down" && "bg-danger/10 text-danger"
          )}>
            <span className="text-[10px] font-[Inter] font-bold leading-none">
              {changeData.trend === "up" ? "Bullish" : "Bearish"}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Status Badge */}
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0",
          "bg-gradient-to-r from-warning/15 to-warning/10",
          "border border-warning/25",
          "transition-all duration-300 group-hover:border-warning/40"
        )}>
          <Award className="h-3 w-3 text-warning" />
          <span className="text-[10px] font-[Space_Grotesk] font-bold text-warning leading-none">
            {statusData?.value || "Member"}
          </span>
        </div>
      </div>

      {/* Subtle hover shine */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'shine-sweep 2s ease-in-out infinite'
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
