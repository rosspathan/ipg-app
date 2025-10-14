import * as React from "react"
import { Outlet, useLocation } from "react-router-dom"
import { useNavigation } from "@/hooks/useNavigation"
import { AppHeader } from "@/components/navigation/AppHeader"
import { BottomNavBar } from "@/components/navigation/BottomNavBar"
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp"

export function AstraLayout() {
  const location = useLocation()
  const { navigate } = useNavigation()

  // Get page title based on route
  const getPageTitle = () => {
    const path = location.pathname
    if (path === "/app" || path === "/app/" || path === "/app/home") return undefined
    if (path.includes("/wallet")) return "Wallet"
    if (path.includes("/trade")) return "Trading"
    if (path.includes("/programs")) return "Programs"
    if (path.includes("/profile")) return "Profile"
    return undefined
  }

  // Mock portfolio data
  const portfolioData = {
    total: 125430.50,
    change: {
      value: 2340.20,
      percentage: 1.87,
      isPositive: true
    }
  }

  return (
    <div className="app-shell bg-background">
      {/* Sticky Header */}
      <AppHeader 
        title={getPageTitle()}
        showPortfolio={location.pathname === "/app/home" || location.pathname === "/app" || location.pathname === "/app/"}
        totalPortfolio={portfolioData.total}
        portfolioChange={portfolioData.change}
        notificationCount={3}
      />

      {/* Main Scrollable Content */}
      <main className="app-main with-dock">
        <Outlet />
      </main>

      {/* WhatsApp Support - Fixed above dock */}
      <SupportLinkWhatsApp variant="fab" />

      {/* Sticky Footer Navigation */}
      <BottomNavBar />
    </div>
  )
}