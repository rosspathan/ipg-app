import * as React from "react"
import { Outlet } from "react-router-dom"
import { AppTopBar } from "@/components/astra/AppTopBar"
import { BottomNavBar } from "@/components/navigation/BottomNavBar"
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp"

export function AstraLayout() {
  return (
    <div className="app-shell bg-background">
      {/* Sticky Header */}
      <AppTopBar />

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