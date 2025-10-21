import * as React from "react"
import { Home, Wallet, TrendingUp, Gift, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocation } from "react-router-dom"
import { useNavigation } from "@/hooks/useNavigation"

const navItems = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    route: "/app"
  },
  {
    id: "wallet", 
    label: "Wallet",
    icon: Wallet,
    route: "/app/wallet"
  },
  {
    id: "trading",
    label: "Trading", 
    icon: TrendingUp,
    route: "/app/trading"
  },
  {
    id: "programs",
    label: "Programs",
    icon: Gift,
    route: "/app/programs"
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    route: "/app/profile"
  }
]

export function BottomNavBar() {
  const location = useLocation()
  const { navigate } = useNavigation()

  const isActive = (route: string) => {
    if (route === "/app") {
      return location.pathname === "/app" || location.pathname === "/app/"
    }
    return location.pathname.startsWith(route)
  }

  return (
    <nav 
      className="mobile-fixed z-50 bg-card border-t border-border"
      style={{
        bottom: 'var(--bso)',
        height: 'var(--dock-h)'
      }}
    >
      <div 
        className="h-full flex items-center justify-around"
        style={{
          paddingLeft: 'var(--bsl)',
          paddingRight: 'var(--bsr)',
          paddingBottom: '8px',
          paddingTop: '8px'
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.route)
          
          return (
            <button
              key={item.id}
              onClick={(e) => {
                console.log('[NAV] Button clicked:', {
                  id: item.id,
                  route: item.route,
                  target: e.target,
                  timestamp: Date.now()
                });
                navigate(item.route);
              }}
              className={cn(
                "flex flex-col items-center justify-center px-2 py-1 rounded-md min-w-[56px]",
                active ? "text-accent" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium mt-0.5">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}