import * as React from "react"
import { useState } from "react"
import { Gift, Target, Star, Zap, ArrowDownUp, ArrowUpRight, ArrowLeftRight, Send, Users } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { AppHeaderSticky } from "@/components/navigation/AppHeaderSticky"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { KPIChipRow } from "@/components/astra/KPIChipRow"
import { BalanceCluster } from "@/components/astra/grid/BalanceCluster"
import { CardLane } from "@/components/astra/CardLane"
import { ProgramTile } from "@/components/astra/grid/ProgramTile"
import { AnnouncementsCarousel } from "@/components/astra/grid/AnnouncementsCarousel"
import { Marquee } from "@/components/astra/grid/Marquee"
import { ActivityGrid } from "@/components/astra/grid/ActivityGrid"
import { QuickActionsRibbon } from "@/components/astra/grid/QuickActionsRibbon"

const kpiData = [
  { 
    icon: "💰", 
    value: "₹2,45,678", 
    label: "Portfolio", 
    variant: "success" as const, 
    trend: "up" as const,
    changePercent: "+12.4%"
  },
  { 
    icon: "📈", 
    value: "+12.4%", 
    label: "24h Change", 
    variant: "primary" as const, 
    trend: "up" as const 
  },
  { 
    icon: "⭐", 
    value: "VIP Gold", 
    label: "Status", 
    variant: "warning" as const, 
    trend: "neutral" as const 
  }
]

const announcements = [
  {
    id: "1",
    title: "New Staking Rewards",
    message: "Earn up to 15% APY on BSK with enhanced staking program",
    type: "promotion" as const,
    actionLabel: "Stake Now",
    region: ["global"],
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000 * 7)
  },
  {
    id: "2",
    title: "Lucky Draw #127 Live",
    message: "₹50,000 prize pool now open! Get your tickets before it fills up",
    type: "feature" as const,
    actionLabel: "Join Draw",
    region: ["india"],
    startDate: new Date(Date.now() - 3600000),
    endDate: new Date(Date.now() + 86400000 * 3)
  }
]

const marqueeItems = [
  { id: "1", text: "BSK Loans: 0% interest for 16 weeks on amounts up to ₹50,000", type: "promotion" as const },
  { id: "2", text: "Trading competition starts Monday - Win up to ₹25,000 in prizes", type: "info" as const },
  { id: "3", text: "New insurance plans available with 24/7 claim support", type: "success" as const }
]

const recentActivities = [
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

export function HomePageRebuilt() {
  const { navigate } = useNavigation()
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)

  const myPrograms = [
    {
      title: "Advertise Mining",
      subtitle: "Watch ads daily\nEarn BSK rewards",
      icon: <Gift className="h-6 w-6 text-success" />,
      badge: "DAILY" as const,
      sparkline: [100, 120, 115, 140, 135, 160, 155],
      onPress: () => navigate("/app/programs/ads")
    },
    {
      title: "Lucky Draw",
      subtitle: "Pool-based lottery\nWin big prizes",
      icon: <Target className="h-6 w-6 text-warning" />,
      badge: "HOT" as const,
      progress: 78,
      onPress: () => navigate("/app/programs/draws")
    },
    {
      title: "BSK Fortune Wheel",
      subtitle: "Daily spins\nProvably fair",
      icon: <Zap className="h-6 w-6 text-accent" />,
      badge: "LIVE" as const,
      onPress: () => navigate("/app/programs/spin")
    },
    {
      title: "Staking Rewards",
      subtitle: "12.4% APY\nFlexible terms",
      icon: <Star className="h-6 w-6 text-primary" />,
      sparkline: [50, 55, 52, 58, 62, 59, 65],
      onPress: () => navigate("/app/staking")
    },
    {
      title: "Referral Program",
      subtitle: "Invite friends\nEarn together",
      icon: <Users className="h-6 w-6 text-secondary" />,
      badge: "NEW" as const,
      onPress: () => navigate("/app/referrals")
    }
  ]

  const quickActions = [
    { id: "deposit", label: "Deposit", icon: <ArrowDownUp className="h-4 w-4" />, variant: "success" as const, onPress: () => navigate("/app/deposit") },
    { id: "withdraw", label: "Withdraw", icon: <ArrowUpRight className="h-4 w-4" />, variant: "warning" as const, onPress: () => navigate("/app/withdraw") },
    { id: "swap", label: "Swap", icon: <ArrowLeftRight className="h-4 w-4" />, variant: "default" as const, onPress: () => navigate("/app/swap") },
    { id: "send", label: "Send", icon: <Send className="h-4 w-4" />, variant: "default" as const, onPress: () => navigate("/app/send") }
  ]

  const handleQuickSwitchAction = (action: string) => {
    switch (action) {
      case "deposit": navigate("/app/deposit"); break
      case "convert": navigate("/app/swap"); break
      case "trade": navigate("/app/trade"); break
      case "programs": navigate("/app/programs"); break
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24" data-testid="page-home">
      {/* Header */}
      <AppHeaderSticky
        title="Dashboard"
        subtitle="Welcome back"
        onProfileClick={() => navigate("/app/profile")}
        onNotificationsClick={() => navigate("/app/notifications")}
        notificationCount={2}
      />

      {/* Main Content */}
      <div className="space-y-6 pt-4">
        {/* KPI Row */}
        <div className="px-4">
          <KPIChipRow data={kpiData} />
        </div>

        {/* Balance Cluster */}
        <div className="px-4">
          <BalanceCluster />
        </div>

        {/* My Programs Lane */}
        <CardLane
          title="My Programs"
          action={{ label: "View All", onClick: () => navigate("/app/programs") }}
          enableParallax
        >
          {myPrograms.map((program) => (
            <div key={program.title} className="w-40">
              <ProgramTile {...program} />
            </div>
          ))}
        </CardLane>

        {/* Quick Actions Lane */}
        <CardLane title="Quick Actions" enableParallax={false}>
          {quickActions.map((action) => (
            <div key={action.id} className="w-24">
              <button
                onClick={action.onPress}
                className="w-full h-24 rounded-2xl bg-card/50 border border-border/40 hover:bg-card hover:border-primary/30 transition-all duration-[120ms] flex flex-col items-center justify-center gap-2"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  action.variant === "success" ? "bg-success/10 text-success" :
                  action.variant === "warning" ? "bg-warning/10 text-warning" :
                  "bg-primary/10 text-primary"
                }`}>
                  {action.icon}
                </div>
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </button>
            </div>
          ))}
        </CardLane>

        {/* Announcements */}
        <div className="px-4">
          <AnnouncementsCarousel announcements={announcements} />
        </div>

        {/* Marquee */}
        <Marquee items={marqueeItems} />

        {/* Recent Activity */}
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground">Recent Activity</h2>
            <button 
              onClick={() => navigate("/app/history")}
              className="text-sm font-medium text-accent hover:text-accent/80 transition-colors duration-[120ms]"
            >
              View All →
            </button>
          </div>
          <ActivityGrid activities={recentActivities} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <DockNav
        onNavigate={navigate}
        onCenterPress={() => setShowQuickSwitch(true)}
      />

      {/* Quick Switch Radial Menu */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />
    </div>
  )
}
