import * as React from "react"
import { useState } from "react"
import { Bell, User, Gift, Target, Star, TrendingUp, Users, Coins, Shield, Zap, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/hooks/useNavigation"
import { AppShellGlass } from "@/components/astra/AppShellGlass"
import { KPIChipRow } from "@/components/astra/KPIChipRow"
import { AnnouncementsCarousel } from "@/components/astra/grid/AnnouncementsCarousel"
import { Marquee } from "@/components/astra/grid/Marquee"
import { ProgramGrid } from "@/components/astra/grid/ProgramGrid"
import { ProgramTile } from "@/components/astra/grid/ProgramTile"
import { GroupHeader } from "@/components/astra/grid/GroupHeader"
import { ActivityGrid } from "@/components/astra/grid/ActivityGrid"
import { BalanceCluster } from "@/components/astra/grid/BalanceCluster"
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp"
import { DockNav } from "@/components/navigation/DockNav"

// Enhanced KPI data with trends
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
    icon: "🚀", 
    value: "+12.4%", 
    label: "24h Change", 
    variant: "primary" as const, 
    trend: "up" as const 
  },
  { 
    icon: "⭐", 
    value: "VIP", 
    label: "Status", 
    variant: "warning" as const, 
    trend: "neutral" as const 
  }
]

const announcements = [
  {
    id: "1",
    title: "New Staking Rewards Available",
    message: "Earn up to 15% APY on your BSK holdings with our enhanced staking program.",
    type: "promotion" as const,
    actionLabel: "Stake Now",
    actionUrl: "/app/staking",
    region: ["global"],
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000 * 7)
  },
  {
    id: "2", 
    title: "Lucky Draw Pool #127 Live",
    message: "₹50,000 prize pool now open! Get your tickets before it fills up.",
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

const myPrograms = [
  {
    title: "Advertise Mining",
    subtitle: "Watch ads daily\nEarn BSK rewards",
    icon: <Gift className="h-6 w-6" />,
    badge: "DAILY" as const,
    sparkline: [100, 120, 115, 140, 135, 160, 155],
    onPress: () => console.log("Navigate to advertising")
  },
  {
    title: "Lucky Draw",
    subtitle: "Pool-based lottery\nWin big prizes",
    icon: <Target className="h-6 w-6" />,
    badge: "HOT" as const,
    progress: 78,
    onPress: () => console.log("Navigate to lucky")
  },
  {
    title: "BSK Fortune Wheel",
    subtitle: "Daily spins\nProvably fair",
    icon: <Zap className="h-6 w-6" />,
    badge: "LIVE" as const,
    onPress: () => console.log("Navigate to spin")
  },
  {
    title: "Staking Rewards",
    subtitle: "12.4% APY\nFlexible terms",
    icon: <Star className="h-6 w-6" />,
    sparkline: [50, 55, 52, 58, 62, 59, 65],
    onPress: () => console.log("Navigate to staking")
  }
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

export function HomePage() {
  const { navigate } = useNavigation()
  const [showAllPrograms, setShowAllPrograms] = useState(false)

  // Premium glass top bar
  const topBar = (
    <div className="flex items-center justify-between p-4">
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-10 w-10 p-0 rounded-full hover:bg-primary/10"
        onClick={() => navigate("/app/profile")}
      >
        <User className="h-5 w-5" />
      </Button>
      
      <div className="text-center">
        <h1 className="font-bold text-lg text-foreground font-heading">Dashboard</h1>
        <p className="text-xs text-muted-foreground">Welcome back</p>
      </div>
      
      <div className="flex items-center gap-2">
        <SupportLinkWhatsApp 
          className="h-10 w-10 p-0 rounded-full hover:bg-success/10"
        >
          <MessageCircle className="h-5 w-5 text-success" />
        </SupportLinkWhatsApp>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-10 w-10 p-0 rounded-full relative hover:bg-accent/10"
          onClick={() => navigate("/app/notifications")}
        >
          <Bell className="h-5 w-5" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-[10px] flex items-center justify-center text-white font-bold">
            2
          </div>
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <AppShellGlass topBar={topBar} data-testid="page-home">
      <div className="space-y-6 pb-24">
        {/* KPI Row - New Component */}
        <div className="px-4 pt-4">
          <KPIChipRow data={kpiData} />
        </div>

        {/* Balance Cluster - Updated */}
        <div className="px-4">
          <BalanceCluster />
        </div>

        {/* Announcements Carousel */}
        <div className="px-4" data-testid="announcements">
          <AnnouncementsCarousel announcements={announcements} />
        </div>

        {/* Marquee */}
        <Marquee items={marqueeItems} />

        {/* My Programs Section */}
        <div className="space-y-4">
          <div className="px-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground font-heading">My Programs</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/app/programs")}
                className="text-text-secondary hover:text-text-primary"
              >
                View All →
              </Button>
            </div>
          </div>
          
          {/* Horizontal Carousel */}
          <div className="overflow-x-auto scrollbar-hide" data-testid="programs-carousel">
            <div className="flex gap-4 px-4 pb-2">
              {myPrograms.map((program) => (
                <div key={program.title} className="flex-shrink-0 w-40">
                  <ProgramTile
                    title={program.title}
                    subtitle={program.subtitle}
                    icon={program.icon}
                    badge={program.badge}
                    sparkline={program.sparkline}
                    progress={program.progress}
                    onPress={program.onPress}
                    className="h-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="px-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground font-heading">Recent Activity</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/app-legacy/wallet/history")}
                className="text-text-secondary hover:text-text-primary"
              >
                View All →
              </Button>
            </div>
          </div>
          
          <div className="px-4">
            <ActivityGrid activities={recentActivities} />
          </div>
        </div>
      </div>
    </AppShellGlass>

    {/* Bottom Navigation */}
    <DockNav onNavigate={navigate} />
  </>
)
}