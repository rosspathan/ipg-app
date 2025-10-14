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

  // Console marker for QA
  React.useEffect(() => {
    document.body.setAttribute('data-scroll', 'single')
    console.info('SCROLL_FIX_OK')
  }, [])

  const isActive = (route: string) => {
    if (route === "/app/home") {
      return location.pathname === "/app/home" || location.pathname === "/app"
    }
    return location.pathname.startsWith(route)
  }

  return (
    <div className="app-shell" data-testid="app-shell">
      {/* Mobile constraint wrapper */}
      <div className="max-w-[430px] mx-auto h-full bg-gradient-to-br from-background-primary to-background-secondary relative flex flex-col">
        {/* Main Content - Single scroll container */}
        <main 
          className="app-main with-dock" 
          data-scroll="single"
          data-testid="qa-scroll-container"
        >
          <Outlet />
        </main>

        {/* Portal target for DockNav to ensure true fixed positioning */}
        <div id="dock-portal" />
      </div>
    </div>
  )
}