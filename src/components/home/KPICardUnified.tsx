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
        "relative w-full px-5 py-3.5 rounded-[20px] overflow-hidden",
        "bg-gradient-to-br from-card/95 via-card/90 to-card/95",
        "backdrop-blur-xl border border-border/50",
        "transition-all duration-300 ease-out",
        "hover:border-primary/40 hover:shadow-[0_8px_32px_rgba(124,77,255,0.12)]",
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
      {/* Main content grid - Clear sections */}
      <div className="relative grid grid-cols-[auto_1px_auto_1px_auto] items-center gap-4">
        
        {/* Section 1: Portfolio Value */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-[14px] flex items-center justify-center",
            "bg-gradient-to-br from-success/25 to-success/5",
            "transition-all duration-300 group-hover:scale-105"
          )}>
            <Wallet className="h-5 w-5 text-success" />
          </div>
          
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-[Inter] font-semibold text-muted-foreground/60 uppercase tracking-wider leading-none">
              Portfolio
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-[Space_Grotesk] font-bold text-xl text-foreground tabular-nums leading-none tracking-tight">
                {portfolioData?.value || "₹0"}
              </span>
              {portfolioData?.subValue && (
                <span className="text-xs font-[Inter] font-bold text-success tabular-nums leading-none">
                  {portfolioData.subValue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Divider 1 */}
        <div className="h-10 w-px bg-gradient-to-b from-transparent via-border/50 to-transparent" />

        {/* Section 2: 24h Change */}
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "h-8 w-8 rounded-[12px] flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-primary/5",
            "transition-all duration-300 group-hover:scale-105"
          )}>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-[Inter] font-semibold text-muted-foreground/60 uppercase tracking-wider leading-none">
              24h Change
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                "font-[Space_Grotesk] font-bold text-base tabular-nums leading-none",
                changeData?.trend === "up" ? "text-success" : "text-danger"
              )}>
                {changeData?.value || "+0%"}
              </span>
              {changeData?.subValue && (
                <span className="text-[10px] font-[Inter] font-medium text-muted-foreground/70 tabular-nums leading-none">
                  {changeData.subValue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Divider 2 */}
        <div className="h-10 w-px bg-gradient-to-b from-transparent via-border/50 to-transparent" />

        {/* Section 3: Status & Trend */}
        <div className="flex items-center gap-2">
          {/* Trend Badge */}
          {changeData?.trend && (
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg",
              "transition-all duration-300",
              changeData.trend === "up" && "bg-success/15 text-success group-hover:bg-success/20",
              changeData.trend === "down" && "bg-danger/15 text-danger group-hover:bg-danger/20"
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
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
            "bg-gradient-to-r from-warning/25 to-warning/10",
            "border border-warning/40",
            "transition-all duration-300 group-hover:border-warning/50"
          )}>
            <Award className="h-3.5 w-3.5 text-warning" />
            <span className="text-[11px] font-[Space_Grotesk] font-bold text-warning leading-none">
              {statusData?.value || "Member"}
            </span>
          </div>
        </div>

      </div>

      {/* Subtle gradient overlay on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(120deg, transparent 25%, rgba(255, 255, 255, 0.04) 50%, transparent 75%)',
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
