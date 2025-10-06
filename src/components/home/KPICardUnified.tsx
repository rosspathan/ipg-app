import * as React from "react"
import { Wallet, TrendingUp, Award } from "lucide-react"
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
    <button
      onClick={onCardPress}
      className={cn(
        "relative w-full px-4 py-3 rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-card/90 via-card/80 to-card/90",
        "backdrop-blur-xl border border-border/60",
        "transition-all duration-300 ease-out",
        "hover:border-primary/50 hover:shadow-[0_8px_24px_rgba(124,77,255,0.15)]",
        "active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-primary/30",
        "group cursor-pointer",
        className
      )}
      data-testid="kpi-card-unified"
    >
      {/* Compact mobile-first layout */}
      <div className="relative flex items-center justify-between gap-3">
        
        {/* Left: Portfolio Section */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
            "bg-gradient-to-br from-success/25 to-success/5",
            "transition-transform duration-300 group-hover:scale-105"
          )}>
            <Wallet className="h-4 w-4 text-success" />
          </div>
          
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[8px] font-semibold text-muted-foreground/70 uppercase tracking-wide leading-none">
              Portfolio
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading font-bold text-lg text-foreground tabular-nums leading-none">
                {portfolioData?.value || "₹0"}
              </span>
              {portfolioData?.subValue && (
                <span className="text-[10px] font-bold text-success tabular-nums leading-none">
                  {portfolioData.subValue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Vertical Divider */}
        <div className="h-12 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent flex-shrink-0" />

        {/* Right: 24H Change + Badge Section */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
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
                  {changeData?.value || "+0%"}
                </span>
                {changeData?.subValue && (
                  <span className="text-[9px] font-medium text-muted-foreground/80 tabular-nums leading-none">
                    {changeData.subValue}
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

      {/* Subtle shine effect on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: 'linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.03) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'shine-sweep 2.5s ease-in-out infinite'
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
