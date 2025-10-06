import * as React from "react"
import { Bell, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/hooks/useNavigation"
import { useLocation } from "react-router-dom"
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper"
import { useDisplayName } from "@/hooks/useDisplayName"


interface AppTopBarProps {
  className?: string
}

export function AppTopBar({ className }: AppTopBarProps) {
  const { navigate } = useNavigation()
  const location = useLocation()

  const notificationCount = 3 // Mock data

  const userName = useDisplayName();

  return (
    <header 
      className={cn(
        "flex items-center justify-between p-4 bg-background/95 backdrop-blur-2xl border-b border-border/60",
        "sticky top-0 z-50 shadow-lg shadow-primary/5",
        "transition-all duration-300 ease-in-out",
        className
      )}
      data-testid="app-top-bar"
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <HeaderLogoFlipper size="md" />
      </div>

      {/* Right: Profile name + Notifications */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-10 px-4 rounded-full relative overflow-hidden group",
            "transition-all duration-300 ease-out",
            "hover:scale-105 hover:shadow-lg hover:shadow-primary/20",
            "border border-transparent hover:border-primary/30"
          )}
          onClick={() => navigate("/app/profile")}
          data-testid="profile-button"
        >
          {/* Animated gradient background on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
          
          {/* Sparkle icon with animation */}
          <Sparkles className="h-3.5 w-3.5 mr-2 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12" />
          
          {/* Username with gradient text */}
          <span className={cn(
            "text-sm font-bold max-w-[140px] truncate relative z-10",
            "bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text",
            "group-hover:from-primary group-hover:via-accent group-hover:to-primary",
            "transition-all duration-500",
            "animate-fade-in"
          )}>
            {userName}
          </span>

          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-primary/20 pointer-events-none" />
        </Button>

        <div
          className={cn(
            "h-10 w-10 p-0 relative rounded-full flex items-center justify-center",
            "transition-all duration-200"
          )}
          data-testid="notifications-button"
        >
          <Bell className="h-5 w-5 transition-transform duration-300" />
          {notificationCount > 0 && (
            <div className={cn(
              "absolute -top-1 -right-1 h-5 w-5 bg-danger rounded-full",
              "flex items-center justify-center",
              "animate-pulse shadow-lg shadow-danger/50",
              "border-2 border-background"
            )}>
              <span className="text-[10px] font-bold text-danger-foreground">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}