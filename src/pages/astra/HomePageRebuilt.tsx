import * as React from "react"
import { useState } from "react"
import { Gift, Target, Zap, Star, Users, TrendingUp, Shield, Coins, MessageCircle } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { KPICardUnified } from "@/components/home/KPICardUnified"
import { AddFundsCTA } from "@/components/home/AddFundsCTA"
import { BalanceDuoGrid } from "@/components/home/BalanceDuoGrid"
import { BskCardCompact } from "@/components/home/BskCardCompact"
import { RewardsBreakdown } from "@/components/home/RewardsBreakdown"
import { AnnouncementsBar } from "@/components/home/AnnouncementsBar"
import { HeroCarousel } from "@/components/home/HeroCarousel"
import { ProgramsGrid } from "@/components/programs-pro/ProgramsGrid"
import { ActivityTimeline } from "@/components/home/ActivityTimeline"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp"
import { ScrollingAnnouncement } from "@/components/home/ScrollingAnnouncement"
import { AnnouncementCarousel } from "@/components/home/AnnouncementCarousel"
import { useDisplayName } from "@/hooks/useDisplayName"
import { supabase } from "@/integrations/supabase/client"
/**
 * HomePageRebuilt - World-class mobile-first home screen
 * DO NOT MODIFY THE FOOTER - DockNav remains untouched
 */
export function HomePageRebuilt() {
  const { navigate } = useNavigation()
  const [showRewardsBreakdown, setShowRewardsBreakdown] = useState(false)
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const displayName = useDisplayName()

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        console.info('USR_WALLET_LINK_V3', { user: data.user.id });
      }
    });
  }, []);

  const handleKPIPress = () => {
    console.log("KPI card pressed")
    navigate("/app/wallet")
  }

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
    <>
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40 -mx-4 -mt-4 mb-4">
        <div className="flex items-center justify-between p-4">
          {/* Left: Avatar + Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Welcome back</p>
              <p className="text-sm font-semibold" data-testid="header-username">{displayName}</p>
            </div>
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6" data-testid="page-home" data-version="usr-wallet-link-v3">
        {/* Add Funds CTA */}
        <AddFundsCTA onPress={() => navigate("/app/wallet/deposit")} />

        {/* KPI Card Unified */}
        <KPICardUnified 
          onCardPress={handleKPIPress}
          data={[
            { label: "Portfolio", value: "₹0", subValue: "+0%", trend: "up", type: "portfolio" },
            { label: "24h Change", value: "+0%", subValue: "+₹0", trend: "up", type: "change" },
            { label: "User", value: displayName, type: "status" }
          ]}
        />

        {/* BSK Balance Cards - Side by Side */}
        <BalanceDuoGrid>
          <BskCardCompact
            variant="withdrawable"
            balance={0}
            fiatValue={0}
            bonusMetrics={{ today: 0, week: 0, lifetime: 0 }}
            onWithdraw={() => navigate("/app/programs/bsk-withdraw")}
            onTransfer={() => navigate("/app/programs/bsk-transfer")}
            onHistory={() => navigate("/app/wallet/history")}
            onViewBreakdown={() => setShowRewardsBreakdown(true)}
          />
          
          <BskCardCompact
            variant="holding"
            balance={0}
            fiatValue={0}
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
      </div>

      {/* Rewards Breakdown Bottom Sheet */}
      <RewardsBreakdown
        isOpen={showRewardsBreakdown}
        onClose={() => setShowRewardsBreakdown(false)}
      />

      {/* Floating WhatsApp Support Button - Fixed above footer */}
      <SupportLinkWhatsApp
        variant="fab"
        className="fixed bottom-24 right-5 z-[60]"
      />

      {/* Quick Switch Radial Menu */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={(action) => {
          switch (action) {
            case "deposit":
              navigate("/app/wallet/deposit")
              break
            case "convert":
              navigate("/app/swap")
              break
            case "trade":
              navigate("/app/trade")
              break
            case "programs":
              navigate("/app/programs")
              break
          }
        }}
      />

      {/* Footer - DO NOT MODIFY THIS SECTION */}
      <DockNav onNavigate={(path) => navigate(path)} onCenterPress={() => setShowQuickSwitch(true)} />
    </>
  )
}
