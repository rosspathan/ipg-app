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
      <div className="flex items-center justify-between px-3 py-2 h-14">
        {/* Left: Animated Logo */}
        <div className="flex-shrink-0">
          <BrandLogoBlink size="sm" />
        </div>

        {/* Center: Title/Subtitle - only show if provided */}
        {(title || subtitle) && (
          <div className="flex-1 text-center mx-3">
            {title && (
              <h1 className="font-heading text-base font-bold text-foreground leading-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Spacer if no title/subtitle */}
        {!(title || subtitle) && <div className="flex-1" />}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onProfileClick}
            className="h-9 w-9 p-0 rounded-full hover:bg-primary/10 transition-all duration-[120ms]"
            aria-label="Profile"
          >
            <User className="h-[18px] w-[18px]" />
          </Button>

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
