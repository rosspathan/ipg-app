import * as React from "react"
import { Bell, User, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { StatChip } from "@/components/ui/stat-chip"
import { BalanceDisplay } from "@/components/ui/balance-display"
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
      "flex items-center justify-between p-4 top-safe bg-background/80 backdrop-blur-xl border-b border-border/30",
      className
    )}>
      {/* Left: Avatar & Portfolio */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 rounded-full p-0"
          onClick={() => navigate("/app/profile")}
        >
          <Avatar className="h-10 w-10 border-2 border-accent/20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {userApp?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
        
        <span className="text-sm font-semibold">{displayName}</span>
        
        {showPortfolio && (
          <div className="flex flex-col">
            <div className="text-xs text-muted-foreground">Total Portfolio</div>
            <BalanceDisplay
              amount={totalPortfolio}
              currency="INR"
              size="sm"
              className="font-mono"
            />
          </div>
        )}
        
        {title && !showPortfolio && (
          <h1 className="font-heading text-lg font-semibold">{title}</h1>
        )}
      </div>

      {/* Right: Stats & Notifications */}
      <div className="flex items-center gap-2">
        {portfolioChange && (
          <StatChip
            variant={portfolioChange.isPositive ? "success" : "danger"}
            size="sm"
            icon={<TrendingUp className="h-3 w-3" />}
            value={`${portfolioChange.isPositive ? "+" : ""}${portfolioChange.percentage.toFixed(1)}%`}
            glow="subtle"
          />
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 relative"
          onClick={() => navigate("/app/notifications")}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-danger rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-danger-foreground">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            </div>
          )}
        </Button>
      </div>
    </header>
  )
}