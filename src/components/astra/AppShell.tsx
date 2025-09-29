import * as React from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Home, Wallet, TrendingUp, Gift, User, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavigation } from "@/hooks/useNavigation"
import { AppTopBar } from "./AppTopBar"
import { FloatingActionButton } from "../ui/floating-action-button"

const navItems = [
  {
    id: "home",
    label: "Home", 
    icon: Home,
    route: "/app/home"
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
    route: "/app/trade"
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

export function AppShell() {
  const location = useLocation()
  const { navigate } = useNavigation()

  const isActive = (route: string) => {
    if (route === "/app/home") {
      return location.pathname === "/app/home" || location.pathname === "/app"
    }
    return location.pathname.startsWith(route)
  }

  // Determine FAB context based on current route
  const getFABContext = () => {
    if (location.pathname.includes("/wallet")) return "wallet"
    if (location.pathname.includes("/trade")) return "trading"
    return "default"
  }

  // Determine if we should show FAB
  const shouldShowFAB = () => {
    const hideFABRoutes = ["/app/profile", "/app/notifications", "/app/settings"]
    return !hideFABRoutes.some(route => location.pathname.includes(route))
  }

  // FAB action handler
  const handleFABAction = () => {
    const context = getFABContext()
    switch (context) {
      case "wallet":
        navigate("/app/wallet/deposit")
        break
      case "trading":
        navigate("/app/trade")
        break
      default:
        navigate("/app/wallet/deposit")
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary to-background-secondary relative max-w-[430px] mx-auto" data-testid="app-shell">
      {/* Top Bar */}
      <AppTopBar />

      {/* Main Content */}
      <main className="pb-20 min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>

      {/* Floating Action Button */}
      {shouldShowFAB() && (
        <FloatingActionButton 
          onClick={handleFABAction}
          className="fixed bottom-24 right-6 z-30"
        >
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      )}

      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
        data-testid="bottom-nav"
      >
        <div className="bg-card-glass backdrop-blur-xl border-t border-border-subtle">
          <div className="flex items-center justify-around py-3 px-4 safe-area-bottom">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.route)
              
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.route)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-standard min-w-[60px] relative",
                    "hover:bg-accent/10 active:scale-95",
                    active && "bg-accent/10"
                  )}
                  data-testid={`nav-${item.id}`}
                >
                  <div className={cn(
                    "relative p-1 rounded-lg transition-all duration-standard",
                    active && "bg-accent/20"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5 transition-colors duration-standard",
                      active ? "text-accent" : "text-text-secondary"
                    )} />
                    
                    {/* Active glow indicator */}
                    {active && (
                      <div className="absolute inset-0 rounded-lg bg-accent/20 animate-pulse" />
                    )}
                  </div>
                  
                  <span className={cn(
                    "text-xs font-medium mt-1 transition-colors duration-standard",
                    active ? "text-accent" : "text-text-secondary"
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
    </div>
  )
}