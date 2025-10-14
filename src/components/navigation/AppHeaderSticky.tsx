import * as React from "react"
import { Bell, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper"
import { useDisplayName } from "@/hooks/useDisplayName"

interface AppHeaderStickyProps {
  onProfileClick?: () => void
  onNotificationsClick?: () => void
  notificationCount?: number
  className?: string
}

/**
 * AppHeaderSticky - Purple Nova DS sticky header
 * Left: BrandLogoBlink (animated, blinking logo)
 * Right: Profile name + Notifications
 */
export function AppHeaderSticky({
  onProfileClick,
  onNotificationsClick,
  notificationCount = 0,
  className
}: AppHeaderStickyProps) {
  const userName = useDisplayName()
  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-card border-b border-border",
        "pt-[env(safe-area-inset-top)]",
        className
      )}
      data-testid="header-sticky"
    >
      <div className="flex items-center justify-between px-4 py-2 h-16">
        {/* Left: Logo */}
        <div className="flex-shrink-0">
          <HeaderLogoFlipper size="lg" />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Profile Name + Notifications */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Profile Name */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onProfileClick}
            className="h-9 px-3 rounded-full hover:bg-primary/10 transition-all duration-[120ms] flex items-center gap-2"
            aria-label="Profile"
          >
            <User className="h-[18px] w-[18px]" />
            <span className="text-sm font-semibold text-foreground max-w-[120px] truncate">
              {userName}
            </span>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onNotificationsClick}
            className="h-9 w-9 p-0 rounded-full relative hover:bg-accent/10 transition-all duration-[120ms]"
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
          >
            <Bell className="h-[18px] w-[18px]" />
            {notificationCount > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full text-[9px] flex items-center justify-center text-white font-bold shadow-lg shadow-danger/50">
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
