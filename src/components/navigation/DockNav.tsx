import * as React from "react"
import { Home, Wallet, TrendingUp, Grid3x3, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocation } from "react-router-dom"
import { LogoDockButton } from "./LogoDockButton"

interface DockNavProps {
  onNavigate?: (path: string) => void
  onCenterPress?: () => void
  className?: string
}

const navItems = [
  { id: "home", label: "Home", icon: Home, path: "/app/home" },
  { id: "wallet", label: "Wallet", icon: Wallet, path: "/app/wallet" },
  { id: "center", label: "Quick", icon: null, path: null }, // Center button placeholder
  { id: "trade", label: "Trade", icon: TrendingUp, path: "/app/trade" },
  { id: "programs", label: "Programs", icon: Grid3x3, path: "/app/programs" }
]

/**
 * DockNav - Sticky bottom glass dock with center LogoDockButton
 * Purple Nova DS - glass morphism, neon underlines, breathing glow
 */
export function DockNav({ onNavigate, onCenterPress, className }: DockNavProps) {
  const location = useLocation()

  const isActive = (path: string | null) => {
    if (!path) return false
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }

  const handleNavClick = (path: string | null) => {
    if (path && onNavigate) {
      onNavigate(path)
    }
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card/40 backdrop-blur-xl border-t border-border/40",
        "pb-[env(safe-area-inset-bottom)]",
        "transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        className
      )}
      style={{
        WebkitBackdropFilter: 'blur(24px)',
        backdropFilter: 'blur(24px)'
      }}
      data-testid="dock-nav"
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1 relative">
        {navItems.map((item) => {
          if (item.id === "center") {
            return (
              <LogoDockButton
                key={item.id}
                onClick={onCenterPress}
              />
            )
          }

          const Icon = item.icon!
          const active = isActive(item.path)

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl",
                "transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "hover:bg-primary/10",
                active && "text-primary",
                !active && "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn(
                "h-5 w-5 transition-all duration-[120ms]",
                active && "scale-110"
              )} />
              
              <span className={cn(
                "text-[10px] font-medium transition-all duration-[120ms]",
                "font-[Inter,sans-serif]",
                active && "font-semibold"
              )}>
                {item.label}
              </span>

              {/* Active indicator - neon underline */}
              {active && (
                <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-gradient-to-r from-primary to-accent rounded-full"
                  style={{
                    boxShadow: '0 0 8px hsl(var(--primary))'
                  }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
