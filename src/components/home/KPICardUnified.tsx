import * as React from "react"
import { useState, useMemo } from "react"
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
 * Optimized with React.memo to prevent unnecessary re-renders
 */
const KPICardUnifiedComponent = ({ data, isLoading = false, onCardPress, className }: KPICardUnifiedProps) => {
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

  // Memoize computed values to prevent re-calculations
  const kpiData = useMemo(() => data || defaultData, [data])
  const portfolioData = useMemo(() => kpiData.find(k => k.type === "portfolio"), [kpiData])
  const changeData = useMemo(() => kpiData.find(k => k.type === "change"), [kpiData])
  const userBadge = useMemo(() => badge || "None", [badge])

  return (
    <div className="relative">
      <button
        onClick={onCardPress}
        className={cn(
          "relative w-full p-4 pr-10 rounded-2xl overflow-hidden",
          "glass-card",
          "bg-gradient-to-br from-card/95 via-card/85 to-card/95",
          "backdrop-blur-xl border-2 border-primary/20",
          // Keep subtle color transitions only to avoid flicker
          "transition-colors duration-200 ease-out",
          // Removed hover scale/shadow to prevent blinking
          "hover:border-primary/40",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          "group cursor-pointer touch-manipulation",
          className
        )}
        data-testid="kpi-card-unified"
        aria-label="Portfolio overview card"
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        {/* Clean 2-column vertical layout */}
        <div className="relative flex flex-col gap-3 max-w-[calc(100%-2.5rem)]">
          
          {/* Row 1: Portfolio Section */}
          <div className="flex items-center gap-3 w-full">
            <div className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
              "bg-gradient-to-br from-success/25 to-success/5"
            )}>
              <Wallet className="h-4.5 w-4.5 text-success" />
            </div>
            
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">
                Portfolio
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-heading font-bold text-lg text-foreground tabular-nums">
                  {showBalance ? (portfolioData?.value || "₹0") : "••••••"}
                </span>
                {portfolioData?.subValue && (
                  <span className="text-xs font-semibold text-success/80 tabular-nums">
                    {showBalance ? portfolioData.subValue : "••••••"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: 24H Change (Left) + Badge (Right) */}
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Left: 24H Change */}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/5">
                <TrendingUp className={cn(
                  "h-3.5 w-3.5",
                  changeData?.trend === "up" ? "text-success" : "text-danger"
                )} />
              </div>
              
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">
                  Today
                </span>
                <span className={cn(
                  "font-heading font-bold text-sm tabular-nums",
                  changeData?.trend === "up" ? "text-success" : "text-danger"
                )}>
                  {showBalance ? (
                    <>
                      {changeData?.value || "+0%"}
                      {changeData?.subValue && (
                        <span className="text-sm ml-1">
                          ({changeData.subValue})
                        </span>
                      )}
                    </>
                  ) : "••••"}
                </span>
              </div>
            </div>

            {/* Right: Badge */}
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
              "bg-gradient-to-r from-warning/20 to-warning/10",
              "border border-warning/40",
              "transition-all duration-300 group-hover:border-warning/60"
            )}>
              <Award className="h-3 w-3 text-warning" />
              <span className="text-xs font-heading font-bold text-warning whitespace-nowrap">
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
          "absolute top-4 right-4 z-10",
          "p-1.5",
          "transition-opacity duration-200",
          "hover:opacity-70",
          "focus:outline-none"
        )}
        aria-label={showBalance ? "Hide portfolio" : "Show portfolio"}
        title={showBalance ? "Hide portfolio" : "Show portfolio"}
      >
        {showBalance ? (
          <EyeOff className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground" />
        ) : (
          <Eye className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground" />
        )}
      </button>
    </div>
  )
}

// Export memoized version to prevent unnecessary re-renders
export const KPICardUnified = React.memo(KPICardUnifiedComponent)
