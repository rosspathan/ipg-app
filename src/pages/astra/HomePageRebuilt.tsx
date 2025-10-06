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
import { ProgramsLaneUltra } from "@/components/programs-pro/ProgramsLaneUltra"
import { ActivityTimeline } from "@/components/home/ActivityTimeline"
import { DockNav } from "@/components/navigation/DockNav"
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp"
import { ScrollingAnnouncement } from "@/components/home/ScrollingAnnouncement"
import { AnnouncementCarousel } from "@/components/home/AnnouncementCarousel"

/**
 * HomePageRebuilt - World-class mobile-first home screen
 * DO NOT MODIFY THE FOOTER - DockNav remains untouched
 */
export function HomePageRebuilt() {
  const { navigate } = useNavigation()
  const [showRewardsBreakdown, setShowRewardsBreakdown] = useState(false)

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
      title: "Advertise Mining",
      subtitle: "Watch ads daily\nEarn BSK rewards",
      icon: <Gift className="h-6 w-6" />,
      badge: "DAILY" as const,
      onPress: () => {
        console.log("Program clicked: Advertise Mining")
        navigate("/app/advertising")
      }
    },
    {
      id: "2",
      title: "Lucky Draw",
      subtitle: "Pool-based lottery\nWin big prizes",
      icon: <Target className="h-6 w-6" />,
      badge: "HOT" as const,
      onPress: () => {
        console.log("Program clicked: Lucky Draw")
        navigate("/app/lucky-draw")
      }
    },
    {
      id: "3",
      title: "Fortune Wheel",
      subtitle: "Daily spins\nProvably fair",
      icon: <Zap className="h-6 w-6" />,
      badge: "LIVE" as const,
      onPress: () => {
        console.log("Program clicked: Fortune Wheel")
        navigate("/app/spin")
      }
    },
    {
      id: "4",
      title: "BSK Purchase",
      subtitle: "One-time bonus\nSpecial offers",
      icon: <Coins className="h-6 w-6" />,
      badge: "NEW" as const,
      onPress: () => {
        console.log("Program clicked: BSK Purchase")
        navigate("/programs/bsk-purchase")
      }
    },
    {
      id: "5",
      title: "Referrals",
      subtitle: "Invite friends\nEarn together",
      icon: <Users className="h-6 w-6" />,
      onPress: () => {
        console.log("Program clicked: Referrals")
        navigate("/app/referrals")
      }
    },
    {
      id: "6",
      title: "Staking",
      subtitle: "12.4% APY\nFlexible terms",
      icon: <Star className="h-6 w-6" />,
      onPress: () => {
        console.log("Program clicked: Staking")
        navigate("/app/staking")
      }
    },
    {
      id: "7",
      title: "Loans",
      subtitle: "0% interest\n16 weeks",
      icon: <TrendingUp className="h-6 w-6" />,
      onPress: () => {
        console.log("Program clicked: Loans")
        navigate("/programs/loans")
      }
    },
    {
      id: "8",
      title: "Insurance",
      subtitle: "Protect assets\n24/7 claims",
      icon: <Shield className="h-6 w-6" />,
      onPress: () => {
        console.log("Program clicked: Insurance")
        navigate("/programs/insurance")
      }
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

        {/* Scrolling Announcement */}
        <ScrollingAnnouncement />

        {/* Announcement Carousel */}
        <AnnouncementCarousel />

        {/* Crypto Assets Panel */}
        <AssetsPanel
          assets={mockAssets}
          onAssetPress={handleAssetPress}
          onViewAll={() => navigate("/app/wallet")}
        />

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

        {/* Announcements Bar */}
        <AnnouncementsBar items={announcementItems} />

        {/* Hero Carousel */}
        <HeroCarousel slides={heroSlides} />

        {/* Programs Lane */}
        <ProgramsLaneUltra
          programs={programs}
          onViewAll={() => navigate("/app/programs")}
        />

        {/* Activity Timeline */}
        <ActivityTimeline
          activities={activities}
          onViewAll={() => navigate("/app/wallet/history")}
        />
      </main>

      {/* Rewards Breakdown Bottom Sheet */}
      <RewardsBreakdown
        isOpen={showRewardsBreakdown}
        onClose={() => setShowRewardsBreakdown(false)}
      />

      {/* Floating WhatsApp Support Button - Fixed above footer */}
      <SupportLinkWhatsApp
        className="fixed bottom-20 right-5 z-30 h-12 w-12 rounded-full bg-success shadow-lg shadow-success/30 hover:shadow-xl hover:shadow-success/40 hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-background"
      >
        <MessageCircle className="h-5 w-5 text-white" />
      </SupportLinkWhatsApp>

      {/* Footer - DO NOT MODIFY THIS SECTION */}
      <DockNav onNavigate={(path) => navigate(path)} />
    </div>
  )
}
