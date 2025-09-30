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
    <div className="fixed inset-0 bg-gradient-to-br from-background-primary to-background-secondary overflow-hidden" data-testid="app-shell">
      {/* Mobile constraint wrapper */}
      <div className="max-w-[430px] mx-auto h-full bg-background relative flex flex-col overflow-hidden">
        {/* Top Bar - Sticky */}
        <AppTopBar />

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto pb-24">
          <Outlet />
        </main>

        {/* Floating Action Button */}
        {shouldShowFAB() && (
          <FloatingActionButton 
            onClick={handleFABAction}
            className="fixed bottom-28 right-6 z-30"
          >
            <Plus className="h-6 w-6" />
          </FloatingActionButton>
        )}

        {/* Bottom Navigation handled by each page via DockNav */}
      </div>
    </div>
  )
}