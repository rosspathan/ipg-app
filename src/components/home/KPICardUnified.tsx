import * as React from "react"
import { useState } from "react"
import { Wallet, TrendingUp, Award, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserBadge } from "@/hooks/useUserBadge"

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
 * KPICardUnified - Compact mobile-optimized card showing portfolio metrics and user badge
 */
export function KPICardUnified({ data, isLoading = false, onCardPress, className }: KPICardUnifiedProps) {
  const { badge, loading: badgeLoading } = useUserBadge()
  const [showBalance, setShowBalance] = useState(true)
  
  if (isLoading) {
    return (
      <Skeleton className="h-20 rounded-2xl" data-testid="kpi-card-unified" />
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
      subValue: "+₹2,721",
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
  const userBadge = badge || "None"

  return (
    <div className="relative">
      <button
        onClick={onCardPress}
        className={cn(
          "relative w-full px-4 py-4 pr-12 rounded-2xl overflow-hidden",
          "glass-card",
          "bg-gradient-to-br from-card/95 via-card/85 to-card/95",
          "backdrop-blur-xl border-2 border-primary/20",
          "transition-all duration-300 ease-out",
          "hover:border-primary/40 hover:shadow-glow-primary hover:scale-[1.01]",
          "active:scale-[0.99]",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          "group cursor-pointer touch-manipulation",
          "animate-fade-in-scale",
          className
        )}
        data-testid="kpi-card-unified"
        aria-label="Portfolio overview card"
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        {/* Compact mobile-first layout */}
        <div className="relative flex items-center justify-between gap-3">
          
          {/* Left: Portfolio Section */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
              "bg-gradient-to-br from-success/25 to-success/5"
            )}>
              <Wallet className="h-4 w-4 text-success" />
            </div>
            
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[8px] font-semibold text-muted-foreground/70 uppercase tracking-wide leading-none">
                Portfolio
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading font-bold text-lg text-foreground tabular-nums leading-none">
                  {showBalance ? (portfolioData?.value || "₹0") : "••••••"}
                </span>
                {portfolioData?.subValue && (
                  <span className="text-[10px] font-bold text-success tabular-nums leading-none">
                    {showBalance ? portfolioData.subValue : "••••"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Vertical Divider */}
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent flex-shrink-0" />

          {/* Right: 24H Change + Badge Section */}
          <div className="flex flex-col gap-1.5 flex-shrink-0 pr-2">
            {/* 24H Change */}
            <div className="flex items-center gap-1.5">
              <TrendingUp className={cn(
                "h-3 w-3 flex-shrink-0",
                changeData?.trend === "up" ? "text-success" : "text-danger"
              )} />
              <div className="flex flex-col gap-0">
                <span className="text-[7px] font-semibold text-muted-foreground/70 uppercase tracking-wide leading-none">
                  24H Change
                </span>
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "font-heading font-bold text-sm tabular-nums leading-none",
                    changeData?.trend === "up" ? "text-success" : "text-danger"
                  )}>
                    {showBalance ? (changeData?.value || "+0%") : "••••"}
                  </span>
                  {changeData?.subValue && (
                    <span className="text-[9px] font-medium text-muted-foreground/80 tabular-nums leading-none">
                      {showBalance ? changeData.subValue : "••••"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* User Badge */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full self-start",
              "bg-gradient-to-r from-warning/20 to-warning/10",
              "border border-warning/40",
              "transition-all duration-300 group-hover:border-warning/60"
            )}>
              <Award className="h-2.5 w-2.5 text-warning flex-shrink-0" />
              <span className="text-[9px] font-heading font-bold text-warning leading-none whitespace-nowrap">
                {badgeLoading ? "..." : userBadge}
              </span>
            </div>
          </div>

        </div>
      </button>

      {/* Eye/EyeOff Toggle Button - Dedicated space top right */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowBalance(!showBalance)
        }}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 right-3 z-10",
          "p-1.5",
          "transition-opacity duration-200",
          "hover:opacity-70",
          "focus:outline-none"
        )}
        aria-label={showBalance ? "Hide portfolio" : "Show portfolio"}
        title={showBalance ? "Hide portfolio" : "Show portfolio"}
      >
        {showBalance ? (
          <EyeOff className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground" />
        )}
      </button>
    </div>
  )
}
