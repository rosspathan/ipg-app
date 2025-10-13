import * as React from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Home, Wallet, TrendingUp, Gift, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavigation } from "@/hooks/useNavigation"
import { AppTopBar } from "./AppTopBar"

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

  // Lock body scroll while Astra app is mounted to avoid duplicate scrollbars
  React.useEffect(() => {
    if (typeof document === 'undefined') return
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    }
  }, [])


  const isActive = (route: string) => {
    if (route === "/app/home") {
      return location.pathname === "/app/home" || location.pathname === "/app"
    }
    return location.pathname.startsWith(route)
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background-primary to-background-secondary overflow-hidden" data-testid="app-shell">
      {/* Mobile constraint wrapper */}
      <div className="max-w-[430px] mx-auto h-full bg-background relative flex flex-col overflow-hidden">
        {/* Top Bar - Sticky */}
        <AppTopBar />

        {/* Main Content - Scrollable with safe-area padding */}
        <main 
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ 
            paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
            overscrollBehavior: 'contain'
          }}
        >
          <Outlet />
        </main>

        {/* Portal target for DockNav to ensure true fixed positioning */}
        <div id="dock-portal" />
      </div>
    </div>
  )
}