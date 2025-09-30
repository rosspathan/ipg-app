import * as React from "react"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useNavigation } from "@/hooks/useNavigation"
import { useLocation } from "react-router-dom"
import { BrandLogoBlink } from "@/components/brand/BrandLogoBlink"

interface AppTopBarProps {
  className?: string
}

export function AppTopBar({ className }: AppTopBarProps) {
  const { user } = useAuthUser()
  const { navigate } = useNavigation()
  const location = useLocation()

  const notificationCount = 3 // Mock data

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"

  return (
    <header 
      className={cn(
        "flex items-center justify-between p-4 bg-background-primary/80 backdrop-blur-xl border-b border-border-subtle",
        "safe-area-top sticky top-0 z-40",
        className
      )}
      data-testid="app-top-bar"
    >
      {/* Left: Blinking Brand Logo */}
      <div className="flex items-center gap-3">
        <BrandLogoBlink size="sm" />
      </div>

      {/* Right: Profile name + Notifications */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-3 rounded-full"
          onClick={() => navigate("/app/profile")}
          data-testid="profile-button"
        >
          <span className="text-sm font-semibold max-w-[140px] truncate">{userName}</span>
        </Button>

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