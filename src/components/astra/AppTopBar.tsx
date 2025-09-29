import * as React from "react"
import { Bell, User, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { KPIChip } from "./KPIChip"
import { BalanceDisplay } from "@/components/ui/balance-display"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useNavigation } from "@/hooks/useNavigation"
import { useLocation } from "react-router-dom"

interface AppTopBarProps {
  className?: string
}

export function AppTopBar({ className }: AppTopBarProps) {
  const { user } = useAuthUser()
  const { navigate } = useNavigation()
  const location = useLocation()

  // Mock portfolio data - replace with real data
  const portfolioData = {
    total: 125430.50,
    change: {
      value: 2340.20,
      percentage: 1.87,
      isPositive: true
    }
  }

  const showPortfolio = location.pathname === "/app/home" || location.pathname === "/app"
  const notificationCount = 3 // Mock data

  return (
    <header 
      className={cn(
        "flex items-center justify-between p-4 bg-background-primary/80 backdrop-blur-xl border-b border-border-subtle",
        "safe-area-top sticky top-0 z-40",
        className
      )}
      data-testid="app-top-bar"
    >
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
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
        
        {showPortfolio && (
          <div className="flex flex-col" data-testid="portfolio-display">
            <div className="text-xs text-text-secondary">Total Portfolio</div>
            <BalanceDisplay
              amount={portfolioData.total}
              currency="INR"
              size="sm"
              className="font-mono"
            />
          </div>
        )}
      </div>

      {/* Right: Stats & Notifications */}
      <div className="flex items-center gap-2">
        {portfolioData.change && showPortfolio && (
          <KPIChip
            variant={portfolioData.change.isPositive ? "success" : "danger"}
            size="sm"
            icon={<TrendingUp className="h-3 w-3" />}
            value={`${portfolioData.change.isPositive ? "+" : ""}${portfolioData.change.percentage.toFixed(1)}%`}
            glow="subtle"
          />
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 relative"
          onClick={() => navigate("/app/notifications")}
          data-testid="notifications-button"
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