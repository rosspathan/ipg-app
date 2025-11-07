import * as React from "react"
import { useState, useEffect } from "react"
import { Bell, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/hooks/useNavigation"
import { useDisplayName } from "@/hooks/useDisplayName"
import { useUsernameBackfill } from "@/hooks/useUsernameBackfill"
import { cn } from "@/lib/utils"
import ipgLogo from "@/assets/ipg-logo.jpg"
import logoAlt from "@/assets/logo-alt.jpg"

interface HomeHeaderProProps {
  notificationCount?: number
  className?: string
}

/**
 * HomeHeaderPro - Premium mobile header with animated logo flip
 * Left: Brand logo (flips every 5s)
 * Center: Username + greeting
 * Right: Notifications + WhatsApp support
 */
export function HomeHeaderPro({ notificationCount = 2, className }: HomeHeaderProProps) {
  const { navigate } = useNavigation()
  const displayName = useDisplayName()
  useUsernameBackfill()
  // Static logo (animation disabled to prevent flicker)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  return (
    <header 
      className={cn(
        "sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/40",
        "transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "h-16 flex items-center justify-between px-4",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(24px)',
        backdropFilter: 'blur(24px)',
      }}
      data-testid="home-header"
    >
      {/* Left: Animated Brand Logo */}
      <button
        onClick={() => navigate("/app/home")}
        className="relative h-14 w-14 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50"
        style={{ perspective: '1000px' }}
      >
          <img
            src={ipgLogo}
            alt="IPG I-SMART"
            className="absolute inset-0 w-full h-full object-cover rounded-full"
          />
      </button>

      {/* Center: Username + Greeting */}
      <div className="flex-1 text-center px-4">
        <p className="text-xs text-muted-foreground font-[Inter] font-medium">
          {getGreeting()}
        </p>
        <h1 className="text-sm font-[Space_Grotesk] font-bold text-foreground truncate">
          {displayName}
        </h1>
      </div>

      {/* Right: Notifications */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-full relative hover:bg-accent/10 focus:ring-2 focus:ring-accent/50"
          onClick={() => navigate("/app/notifications")}
        >
          <Bell className="h-4.5 w-4.5 text-foreground" />
          {notificationCount > 0 && (
            <div 
              className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-danger rounded-full text-[9px] flex items-center justify-center text-white font-bold font-[Inter]"
              style={{ boxShadow: '0 0 8px rgba(255, 92, 92, 0.6)' }}
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </div>
          )}
        </Button>
      </div>
    </header>
  )
}
