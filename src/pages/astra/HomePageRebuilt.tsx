import * as React from "react"
import { useState } from "react"
import { Gift, Target, Zap, Star, Users, TrendingUp, Shield, Coins, MessageCircle } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { KPICardUnified } from "@/components/home/KPICardUnified"
import { AddFundsCTA } from "@/components/home/AddFundsCTA"
import { AssetsPanel } from "@/components/home/AssetsPanel"
import { BalanceDuoGrid } from "@/components/home/BalanceDuoGrid"
import { BskCardCompact } from "@/components/home/BskCardCompact"
import { RewardsBreakdown } from "@/components/home/RewardsBreakdown"
import { AnnouncementsBar } from "@/components/home/AnnouncementsBar"
import { HeroCarousel } from "@/components/home/HeroCarousel"
import { ProgramsGrid } from "@/components/programs-pro/ProgramsGrid"
import { ActivityTimeline } from "@/components/home/ActivityTimeline"
import { QuickSwitchMenu } from "@/components/navigation/QuickSwitchMenu"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { ScrollingAnnouncement } from "@/components/home/ScrollingAnnouncement"
import { AnnouncementCarousel } from "@/components/home/AnnouncementCarousel"
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp"

/**
 * HomePageRebuilt - World-class mobile-first home screen
 * DO NOT MODIFY THE FOOTER - DockNav remains untouched
 */
export function HomePageRebuilt() {
  const { navigate } = useNavigation()
  const [showRewardsBreakdown, setShowRewardsBreakdown] = useState(false)
  const [showQuickMenu, setShowQuickMenu] = useState(false)

  const handleKPIPress = () => {
    console.log("KPI card pressed")
    navigate("/app/wallet")
  }

  const handleAssetPress = (asset: any) => {
    console.log("Asset pressed:", asset.symbol)
    navigate("/app/wallet")
  }

  const mockAssets = [
    { id: "1", symbol: "BTC", name: "Bitcoin", balance: 0.0342, valueUSD: 1456.78, change24h: 2.4 },
    { id: "2", symbol: "ETH", name: "Ethereum", balance: 2.891, valueUSD: 4821.45, change24h: -1.2 },
    { id: "3", symbol: "BNB", name: "BNB", balance: 12.45, valueUSD: 2890.12, change24h: 0.8 },
    { id: "4", symbol: "USDT", name: "Tether", balance: 5420.00, valueUSD: 5420.00, change24h: 0 }
  ]

  const programs = [
    {
      id: "1",
      title: "Ad Mining",
      icon: <Gift className="h-5 w-5" />,
      onPress: () => navigate("/app/programs/advertising")
    },
    {
      id: "2",
      title: "Lucky Draw",
      icon: <Target className="h-5 w-5" />,
      onPress: () => navigate("/app/programs/lucky-draw")
    },
    {
      id: "3",
      title: "Spin Wheel",
      icon: <Zap className="h-5 w-5" />,
      onPress: () => navigate("/app/programs/spin")
    },
    {
      id: "4",
      title: "Purchase",
      icon: <Coins className="h-5 w-5" />,
      onPress: () => navigate("/app/programs/bsk-purchase-manual")
    },
    {
      id: "5",
      title: "Referrals",
      icon: <Users className="h-5 w-5" />,
      onPress: () => navigate("/app/programs/referrals")
    },
    {
      id: "6",
      title: "Staking",
      icon: <Star className="h-5 w-5" />,
      onPress: () => navigate("/app/programs/staking")
    },
    {
      id: "7",
      title: "Loans",
      icon: <TrendingUp className="h-5 w-5" />,
      onPress: () => navigate("/app/programs/loans")
    },
    {
      id: "8",
      title: "Insurance",
      icon: <Shield className="h-5 w-5" />,
      onPress: () => navigate("/app/programs/insurance")
    }
  ]

  const activities = [
    {
      id: "1",
      type: "reward" as const,
      title: "Daily Ad Mining Reward",
      subtitle: "Premium subscription tier",
      amount: 150,
      currency: "BSK",
      timestamp: new Date(Date.now() - 1800000),
      status: "completed" as const,
      icon: <Gift className="h-4 w-4" />
    },
    {
      id: "2",
      type: "spin" as const,
      title: "Fortune Wheel Spin",
      subtitle: "Lucky spin result",
      amount: 50,
      currency: "BSK",
      timestamp: new Date(Date.now() - 3600000),
      status: "completed" as const,
      icon: <Zap className="h-4 w-4" />
    },
    {
      id: "3",
      type: "stake" as const,
      title: "Staking Reward",
      subtitle: "12.4% APY earnings",
      amount: 89,
      currency: "BSK",
      timestamp: new Date(Date.now() - 7200000),
      status: "completed" as const,
      icon: <Star className="h-4 w-4" />
    }
  ]

  const announcementItems = [
    { id: "1", text: "BSK Loans: 0% interest for 16 weeks on amounts up to ₹50,000", type: "promotion" as const },
    { id: "2", text: "Trading competition starts Monday - Win up to ₹25,000 in prizes", type: "info" as const },
    { id: "3", text: "New insurance plans available with 24/7 claim support", type: "success" as const }
  ]

  const heroSlides = [
    {
      id: "1",
      image: "/placeholder.svg",
      title: "Welcome to IPG I-SMART",
      description: "Trade crypto, earn rewards, and grow your portfolio",
      cta: {
        label: "Get Started",
        onClick: () => navigate("/app/programs")
      }
    }
  ]

  return (
    <div className="min-h-screen" data-testid="page-home">
      {/* Main Content */}
      <main className="pb-28 px-4 space-y-6 pt-4">
        {/* Add Funds CTA */}
        <AddFundsCTA onPress={() => navigate("/app/wallet/deposit")} />

        {/* KPI Card Unified */}
        <KPICardUnified onCardPress={handleKPIPress} />

        {/* BSK Balance Cards - Side by Side */}
        <BalanceDuoGrid>
          <BskCardCompact
            variant="withdrawable"
            balance={125000}
            fiatValue={12500}
            bonusMetrics={{ today: 150, week: 1250, lifetime: 125000 }}
            onWithdraw={() => navigate("/app/programs/bsk-withdraw")}
            onTransfer={() => navigate("/app/programs/bsk-transfer")}
            onHistory={() => navigate("/app/wallet/history")}
            onViewBreakdown={() => setShowRewardsBreakdown(true)}
          />
          
          <BskCardCompact
            variant="holding"
            balance={89500}
            fiatValue={8950}
            onViewSchedule={() => setShowRewardsBreakdown(true)}
          />
        </BalanceDuoGrid>

        {/* Scrolling Announcement */}
        <ScrollingAnnouncement />

        {/* Announcement Carousel */}
        <AnnouncementCarousel />

        {/* Programs Grid */}
        <ProgramsGrid
          programs={programs}
          onViewAll={() => navigate("/app/programs")}
        />

        {/* Crypto Assets Panel */}
        <AssetsPanel
          assets={mockAssets}
          onAssetPress={handleAssetPress}
          onViewAll={() => navigate("/app/wallet")}
        />
      </main>

      {/* Rewards Breakdown Bottom Sheet */}
      <RewardsBreakdown
        isOpen={showRewardsBreakdown}
        onClose={() => setShowRewardsBreakdown(false)}
      />

      {/* Radial Menu Trigger (Center) */}
      <FloatingActionButton
        onClick={() => setShowQuickMenu(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
      >
        <Gift className="h-6 w-6" />
      </FloatingActionButton>

      {/* Radial Menu */}
      <QuickSwitchMenu isOpen={showQuickMenu} onClose={() => setShowQuickMenu(false)} />

      {/* Floating WhatsApp Support Button - Fixed above footer */}
      <SupportLinkWhatsApp
        className="fixed bottom-20 right-5 z-30 h-14 w-14 rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/40 hover:shadow-xl hover:shadow-[#25D366]/50 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center"
      >
        <MessageCircle className="h-7 w-7 text-white fill-white" />
      </SupportLinkWhatsApp>
    </div>
  )
}
