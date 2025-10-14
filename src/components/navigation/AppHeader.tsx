import * as React from "react"
import { Bell, User, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { StatChip } from "@/components/ui/stat-chip"
import { BalanceDisplay } from "@/components/ui/balance-display"
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useNavigation } from "@/hooks/useNavigation"
import { useProfile } from "@/hooks/useProfile"
import { useDisplayName } from "@/hooks/useDisplayName"

interface AppHeaderProps {
  title?: string
  showPortfolio?: boolean
  totalPortfolio?: number
  portfolioChange?: {
    value: number
    percentage: number
    isPositive: boolean
  }
  notificationCount?: number
  className?: string
}

export function AppHeader({
  title,
  showPortfolio = true,
  totalPortfolio = 0,
  portfolioChange,
  notificationCount = 0,
  className
}: AppHeaderProps) {
  const { user } = useAuthUser()
  const { navigate } = useNavigation()
  const { userApp } = useProfile()
  const displayName = useDisplayName()

  return (
    <header className={cn(
      "flex items-center justify-between px-3 py-2 top-safe bg-background/80 backdrop-blur-xl border-b border-border/30",
      className
    )}>
      {/* Left: Logo & Title/Portfolio */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <HeaderLogoFlipper 
          size="sm"
          className="shrink-0"
        />
        
        {showPortfolio ? (
          <div className="flex flex-col min-w-0">
            <div className="text-[10px] text-muted-foreground leading-tight">Portfolio</div>
            <BalanceDisplay
              amount={totalPortfolio}
              currency="INR"
              size="sm"
              className="font-mono leading-tight"
            />
          </div>
        ) : title ? (
          <h1 className="font-heading text-base font-semibold truncate">{title}</h1>
        ) : null}
      </div>

      {/* Right: Stats, Notifications & Profile */}
      <div className="flex items-center gap-1 shrink-0">
        {portfolioChange && (
          <StatChip
            variant={portfolioChange.isPositive ? "success" : "danger"}
            size="sm"
            icon={<TrendingUp className="h-3 w-3" />}
            value={`${portfolioChange.isPositive ? "+" : ""}${portfolioChange.percentage.toFixed(1)}%`}
            glow="subtle"
            className="hidden sm:flex"
          />
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 relative"
          onClick={() => navigate("/app/notifications")}
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-danger rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-danger-foreground">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            </div>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-full p-0"
          onClick={() => navigate("/app/profile")}
        >
          <Avatar className="h-8 w-8 border border-accent/20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {userApp?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </div>
    </header>
  )
}