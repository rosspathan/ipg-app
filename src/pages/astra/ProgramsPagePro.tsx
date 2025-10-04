import * as React from "react"
import { useState, useEffect } from "react"
import { Gift, Star, Target, Coins, TrendingUp, Users, Shield, Zap } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { DockNav } from "@/components/navigation/DockNav"
import { ProgramsHeaderPro } from "@/components/programs-pro/ProgramsHeaderPro"
import { ProgramGridCompact } from "@/components/programs-pro/ProgramGridCompact"
import { ProgramTileCompact } from "@/components/programs-pro/ProgramTileCompact"
import { QuickActionsSheet, type QuickAction } from "@/components/programs-pro/QuickActionsSheet"
import { AnnouncementsBar } from "@/components/programs-pro/AnnouncementsBar"
import { QuickSwitch } from "@/components/astra/QuickSwitch"

interface Program {
  id: string
  title: string
  icon: React.ReactNode
  category: "earn" | "games" | "finance" | "network" | "trading"
  badge?: "NEW" | "HOT" | "DAILY" | "LIVE"
  progress?: number // 0-100 for micro progress line
  route: string
  actions: QuickAction[]
  rulesLink?: string
}

const allPrograms: Program[] = [
  {
    id: "advertise-mining",
    title: "Advertise Mining",
    icon: <Gift className="h-5 w-5" />,
    category: "earn",
    badge: "DAILY",
    route: "/app/programs/advertising",
    actions: [
      { id: "watch", label: "Watch Now", variant: "default", onPress: () => {} },
      { id: "subscribe", label: "Subscribe", variant: "secondary", onPress: () => {} },
      { id: "plan", label: "View Plan", variant: "outline", onPress: () => {} }
    ],
    rulesLink: "#"
  },
  {
    id: "staking-rewards",
    title: "Staking Rewards",
    icon: <Star className="h-5 w-5" />,
    category: "earn",
    route: "/app/programs/staking",
    actions: [
      { id: "stake", label: "Stake", variant: "default", onPress: () => {} },
      { id: "unstake", label: "Unstake", variant: "secondary", onPress: () => {} },
      { id: "portfolio", label: "Portfolio", variant: "outline", onPress: () => {} }
    ],
    rulesLink: "#"
  },
  {
    id: "bsk-purchase",
    title: "BSK Purchase Bonus",
    icon: <Coins className="h-5 w-5" />,
    category: "earn",
    badge: "NEW",
    route: "/app/programs/bsk-bonus",
    actions: [
      { id: "buy1k", label: "Buy 1k BSK", variant: "default", onPress: () => {} },
      { id: "buy10k", label: "Buy 10k BSK", variant: "default", onPress: () => {} },
      { id: "rules", label: "Offer Rules", variant: "outline", onPress: () => {} }
    ],
    rulesLink: "#"
  },
  {
    id: "lucky-draw",
    title: "Lucky Draw",
    icon: <Target className="h-5 w-5" />,
    category: "games",
    badge: "HOT",
    progress: 78,
    route: "/app/programs/lucky-draw",
    actions: [
      { id: "buy", label: "Buy Ticket", variant: "default", onPress: () => {} },
      { id: "tickets", label: "My Tickets", variant: "secondary", onPress: () => {} },
      { id: "results", label: "Results", variant: "outline", onPress: () => {} }
    ],
    rulesLink: "#"
  },
  {
    id: "spin-wheel",
    title: "i-SMART Spin",
    icon: <Zap className="h-5 w-5" />,
    category: "games",
    badge: "LIVE",
    route: "/app/programs/spin",
    actions: [
      { id: "spin", label: "Spin Now", variant: "default", onPress: () => {} },
      { id: "buy", label: "Buy Spins", variant: "secondary", onPress: () => {} },
      { id: "verify", label: "Verify", variant: "outline", onPress: () => {} }
    ],
    rulesLink: "#"
  },
  {
    id: "bsk-loans",
    title: "BSK Loans",
    icon: <Coins className="h-5 w-5" />,
    category: "finance",
    route: "/app/programs/loans",
    actions: [
      { id: "apply", label: "Apply", variant: "default", onPress: () => {} },
      { id: "emi", label: "Pay EMI", variant: "secondary", onPress: () => {} },
      { id: "schedule", label: "Schedule", variant: "outline", onPress: () => {} }
    ],
    rulesLink: "#"
  },
  {
    id: "insurance",
    title: "Insurance Plans",
    icon: <Shield className="h-5 w-5" />,
    category: "finance",
    route: "/app/programs/insurance",
    actions: [
      { id: "plan", label: "Get Plan", variant: "default", onPress: () => {} },
      { id: "claim", label: "Claim", variant: "secondary", onPress: () => {} },
      { id: "policies", label: "My Policies", variant: "outline", onPress: () => {} }
    ],
    rulesLink: "#"
  },
  {
    id: "referrals",
    title: "Referral Program",
    icon: <Users className="h-5 w-5" />,
    category: "network",
    badge: "NEW",
    route: "/app/programs/referrals",
    actions: [
      { id: "invite", label: "Invite", variant: "default", onPress: () => {} },
      { id: "earnings", label: "My Earnings", variant: "secondary", onPress: () => {} },
      { id: "rules", label: "Rules", variant: "outline", onPress: () => {} }
    ],
    rulesLink: "#"
  },
  {
    id: "trading",
    title: "Trading",
    icon: <TrendingUp className="h-5 w-5" />,
    category: "trading",
    route: "/app/trade",
    actions: [
      { id: "markets", label: "Open Markets", variant: "default", onPress: () => {} },
      { id: "favorites", label: "Favorites", variant: "secondary", onPress: () => {} },
      { id: "fees", label: "Fees", variant: "outline", onPress: () => {} }
    ],
    rulesLink: "#"
  }
]

export function ProgramsPagePro() {
  const { navigate } = useNavigation()
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  
  // Save scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])
  
  // Restore scroll position
  useEffect(() => {
    if (scrollPosition > 0) {
      window.scrollTo(0, scrollPosition)
    }
  }, [])
  
  const handleProgramPress = (program: Program) => {
    setScrollPosition(window.scrollY)
    navigate(program.route)
  }
  
  const handleKebabPress = (program: Program) => {
    setSelectedProgram(program)
  }
  
  const handleQuickSwitchAction = (action: string) => {
    switch (action) {
      case "deposit": navigate("/app/deposit"); break
      case "convert": navigate("/app/swap"); break
      case "trade": navigate("/app/trade"); break
      case "programs": navigate("/app/programs"); break
    }
  }
  
  return (
    <div 
      data-testid="page-programs"
      className="min-h-screen bg-background pb-28"
    >
      {/* Header */}
      <ProgramsHeaderPro />
      
      {/* Announcements */}
      <AnnouncementsBar />
      
      {/* Grid */}
      <div className="px-4 pt-4 pb-8">
        <ProgramGridCompact>
          {allPrograms.map((program) => (
            <ProgramTileCompact
              key={program.id}
              icon={program.icon}
              title={program.title}
              badge={program.badge}
              progress={program.progress}
              onPress={() => handleProgramPress(program)}
              onKebabPress={() => handleKebabPress(program)}
            />
          ))}
        </ProgramGridCompact>
      </div>
      
      {/* Bottom Navigation */}
      <DockNav
        onNavigate={navigate}
        onCenterPress={() => setShowQuickSwitch(true)}
      />
      
      {/* Quick Actions Sheet */}
      {selectedProgram && (
        <QuickActionsSheet
          isOpen={!!selectedProgram}
          onClose={() => setSelectedProgram(null)}
          programTitle={selectedProgram.title}
          actions={selectedProgram.actions}
          rulesLink={selectedProgram.rulesLink}
        />
      )}
      
      {/* Quick Switch */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />
    </div>
  )
}
