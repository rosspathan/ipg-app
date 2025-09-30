import * as React from "react"
import { Bell, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BrandLogoBlink } from "@/components/brand/BrandLogoBlink"

interface AppHeaderStickyProps {
  title?: string
  subtitle?: string
  onProfileClick?: () => void
  onNotificationsClick?: () => void
  notificationCount?: number
  className?: string
}

/**
 * AppHeaderSticky - Purple Nova DS sticky header
 * Top-left: BrandLogoBlink (animated, blinking logo)
 * Center: Title/subtitle
 * Right: Profile + Notifications
 */
export function AppHeaderSticky({
  title,
  subtitle,
  onProfileClick,
  onNotificationsClick,
  notificationCount = 0,
  className
}: AppHeaderStickyProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50",
        "bg-card/40 backdrop-blur-xl border-b border-border/40",
        "pt-[env(safe-area-inset-top)]",
        "transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(24px)',
        backdropFilter: 'blur(24px)'
      }}
      data-testid="header-sticky"
    >
      <div className="flex items-center justify-between px-4 py-3 h-16">
        {/* Left: Animated Logo */}
        <BrandLogoBlink />

        {/* Center: Title/Subtitle */}
        {(title || subtitle) && (
          <div className="flex-1 text-center mx-4">
            {title && (
              <h1 className="font-heading text-lg font-bold text-foreground leading-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onProfileClick}
            className="h-10 w-10 p-0 rounded-full hover:bg-primary/10 transition-all duration-[120ms]"
            aria-label="Profile"
          >
            <User className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNotificationsClick}
            className="h-10 w-10 p-0 rounded-full relative hover:bg-accent/10 transition-all duration-[120ms]"
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-danger rounded-full text-[10px] flex items-center justify-center text-white font-bold shadow-lg shadow-danger/50">
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
