import * as React from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Plus } from "lucide-react"
import { AppHeader } from "@/components/navigation/AppHeader"
import { BottomNavBar } from "@/components/navigation/BottomNavBar"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { Toaster } from "@/components/ui/toaster"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useNavigation } from "@/hooks/useNavigation"

export function AppLayout() {
  const location = useLocation()
  const { navigate } = useNavigation()
  const { user } = useAuthUser()

  // Determine FAB context based on current route
  const getFABContext = () => {
    if (location.pathname.includes("/wallet")) return "wallet"
    if (location.pathname.includes("/trading")) return "trading" 
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
        navigate("/app/deposit")
        break
      case "trading":
        navigate("/app/trading")
        break
      default:
        navigate("/app/deposit")
        break
    }
  }

  // Get page title based on route
  const getPageTitle = () => {
    const path = location.pathname
    if (path === "/app" || path === "/app/") return undefined
    if (path.includes("/wallet")) return "Wallet"
    if (path.includes("/trading")) return "Trading"
    if (path.includes("/programs")) return "Programs"
    if (path.includes("/profile")) return "Profile"
    return undefined
  }

  // Mock portfolio data - replace with real data
  const portfolioData = {
    total: 125430.50,
    change: {
      value: 2340.20,
      percentage: 1.87,
      isPositive: true
    }
  }

  return (
    <div className="min-h-screen bg-gradient-background relative">
      {/* App Header */}
      <AppHeader 
        title={getPageTitle()}
        showPortfolio={location.pathname === "/app" || location.pathname === "/app/"}
        totalPortfolio={portfolioData.total}
        portfolioChange={portfolioData.change}
        notificationCount={3}
      />

      {/* Main Content */}
      <main className="pb-20 min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>

      {/* Floating Action Button */}
      {shouldShowFAB() && (
        <FloatingActionButton onClick={handleFABAction}>
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      )}

      {/* Bottom Navigation */}
      <BottomNavBar />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}