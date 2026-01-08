import * as React from "react"
import { useState, useEffect } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { AppTopBar } from "@/components/astra/AppTopBar"
import { BottomNavBar } from "@/components/navigation/BottomNavBar"
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp"
import { ReferralCodeClaimBanner } from "@/components/referrals/ReferralCodeClaimBanner"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useSafeAreaPolyfill } from "@/hooks/useSafeAreaPolyfill"
import { useRealtimeTradingBalances } from "@/hooks/useRealtimeTradingBalances"
import { Button } from "@/components/ui/button"
import { X, AlertCircle } from "lucide-react"

export function AstraLayout() {
  // Global real-time balance subscription - updates all wallet screens instantly
  useRealtimeTradingBalances();
  useSafeAreaPolyfill()
  const { user, signOut } = useAuthUser()
  const navigate = useNavigate()
  const [showMismatchBanner, setShowMismatchBanner] = useState(false)
  const [onboardingEmail, setOnboardingEmail] = useState<string | null>(null)

  // Check for session mismatch
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('verificationEmail')
      if (user?.email && cached && cached !== user.email) {
        setOnboardingEmail(cached)
        setShowMismatchBanner(true)
      } else {
        setShowMismatchBanner(false)
      }
    } catch (err) {
      console.error('Error checking session mismatch:', err)
    }
  }, [user?.email])

  const handleSwitchAccount = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Switch account error:', err)
    }
    navigate("/auth/login", { replace: true })
  }

  const handleDismiss = () => {
    setShowMismatchBanner(false)
    try {
      sessionStorage.removeItem('verificationEmail')
      localStorage.removeItem('ipg_onboarding_state')
    } catch (err) {
      console.error('Error clearing storage:', err)
    }
  }

  return (
    <div className="app-shell bg-background">
      {/* Sticky Header */}
      <AppTopBar />

      {/* Referral Code Claim Banner */}
      <ReferralCodeClaimBanner />

      {/* Session Mismatch Banner */}
      {showMismatchBanner && onboardingEmail && (
        <div className="sticky top-[60px] z-40 bg-warning/10 border-b border-warning/30 backdrop-blur-xl">
          <div className="flex items-center gap-3 p-3 px-4 max-w-md mx-auto">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                You're signed in as <span className="font-semibold">{user?.email}</span>, but started onboarding as <span className="font-semibold">{onboardingEmail}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSwitchAccount}
                className="text-xs h-7 px-2 bg-background/50 border-warning/50 hover:bg-warning/20"
              >
                Switch
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-warning/20 rounded transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

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