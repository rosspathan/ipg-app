import * as React from "react"
import { useState } from "react"
import { Gift, Target, Star, Zap, ArrowDownUp, ArrowUpRight, ArrowLeftRight, Send, Users } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
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
      onPress: () => navigate("/app/programs/advertising")
    },
    {
      title: "Lucky Draw",
      subtitle: "Pool-based lottery\nWin big prizes",
      icon: <Target className="h-6 w-6 text-warning" />,
      badge: "HOT" as const,
      progress: 78,
      onPress: () => navigate("/app-legacy/lucky")
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
      onPress: () => navigate("/app/programs/staking")
    },
    {
      title: "Referral Program",
      subtitle: "Invite friends\nEarn together",
      icon: <Users className="h-6 w-6 text-secondary" />,
      badge: "NEW" as const,
      onPress: () => navigate("/app/programs/referrals")
    }
  ]

  const quickActions = [
    { id: "deposit", label: "Deposit", icon: <ArrowDownUp className="h-4 w-4" />, variant: "success" as const, onPress: () => navigate("/app-legacy/wallet/deposit") },
    { id: "withdraw", label: "Withdraw", icon: <ArrowUpRight className="h-4 w-4" />, variant: "warning" as const, onPress: () => navigate("/app-legacy/wallet/withdraw") },
    { id: "swap", label: "Swap", icon: <ArrowLeftRight className="h-4 w-4" />, variant: "default" as const, onPress: () => navigate("/app-legacy/swap") },
    { id: "send", label: "Send", icon: <Send className="h-4 w-4" />, variant: "default" as const, onPress: () => navigate("/app-legacy/wallet/send") }
  ]

  const handleQuickSwitchAction = (action: string) => {
    switch (action) {
      case "deposit": navigate("/app-legacy/wallet/deposit"); break
      case "convert": navigate("/app-legacy/swap"); break
      case "trade": navigate("/app/trade"); break
      case "programs": navigate("/app/programs"); break
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-home">
      {/* Main Content */}
      <div className="space-y-4 pt-3 pb-4">
        {/* KPI Row */}
        <div className="px-3">
          <KPIChipRow data={kpiData} />
        </div>

        {/* Add Funds - Premium CTA */}
        <div className="px-3">
          <button
            onClick={() => navigate("/app-legacy/wallet/deposit")}
            className="w-full h-14 rounded-2xl relative overflow-hidden group
                       bg-gradient-to-r from-primary via-accent to-primary
                       text-primary-foreground font-bold tracking-wide
                       border border-primary/40 shadow-lg shadow-primary/20
                       transition-all duration-300 ease-out
                       hover:scale-[1.02] active:scale-95"
            aria-label="Add funds to your wallet"
          >
            <span className="absolute inset-0 bg-white/20 translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700 ease-out" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <ArrowDownUp className="h-5 w-5" />
              Add Funds
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-background/20 border border-white/30">Instant</span>
            </span>
          </button>
        </div>

        {/* Balance Cluster */}
        <div className="px-3">
          <BalanceCluster />
        </div>

        {/* Marquee - Top placement below portfolio */}
        <Marquee items={marqueeItems} />

        {/* Promotional Banner */}
        <div className="px-3">
          <div 
            onClick={() => navigate("/app/programs/loans")}
            className="relative rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-[220ms] overflow-hidden"
          >
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-2xl opacity-50 pointer-events-none bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse" />
            
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground leading-snug">
                  0% interest for 16 weeks on amounts up to ₹50,000
                </p>
              </div>
              <div className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30">
                <span className="text-xs font-bold text-primary tracking-wide">Trading</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Programs Lane */}
        <CardLane
          title="My Programs"
          action={{ label: "View All", onClick: () => navigate("/app/programs") }}
          enableParallax
        >
          {myPrograms.map((program) => (
            <div key={program.title} className="w-[156px]">
              <ProgramTile {...program} />
            </div>
          ))}
        </CardLane>

        {/* Quick Actions Grid - Mobile Friendly */}
        <div className="px-3 space-y-2">
          <h3 className="font-heading text-base font-bold text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onPress}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-card/50 border border-border/40 hover:bg-card hover:border-primary/30 transition-all duration-[120ms] min-h-[88px]"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  action.variant === "success" ? "bg-success/10 text-success" :
                  action.variant === "warning" ? "bg-warning/10 text-warning" :
                  "bg-primary/10 text-primary"
                }`}>
                  {action.icon}
                </div>
                <span className="text-[10px] font-medium text-foreground leading-tight text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="px-3">
          <AnnouncementsCarousel announcements={announcements} />
        </div>


        {/* Recent Activity */}
        <div className="px-3 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-foreground">Recent Activity</h2>
            <button 
              onClick={() => navigate("/app-legacy/wallet/history")}
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors duration-[120ms]"
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
