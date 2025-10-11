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
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
      }}
    >
      <div className="bottom-bar-blur border-t border-border/30">
        <div 
          className="flex items-center justify-around py-2 px-4"
          style={{
            paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
            paddingRight: 'max(env(safe-area-inset-right), 1rem)',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.route)
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.route)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-220 min-w-[60px]",
                  "hover:bg-accent/10 active:scale-95",
                  active && "bg-accent/10"
                )}
              >
                <div className={cn(
                  "relative p-1 rounded-lg transition-all duration-220",
                  active && "bg-accent/20"
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-colors duration-220",
                    active ? "text-accent" : "text-muted-foreground"
                  )} />
                  
                  {/* Active glow indicator */}
                  {active && (
                    <div className="absolute inset-0 rounded-lg bg-accent/20 animate-pulse" />
                  )}
                </div>
                
                <span className={cn(
                  "text-xs font-medium mt-1 transition-colors duration-220",
                  active ? "text-accent" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
                
                {/* Glow underline for active */}
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}