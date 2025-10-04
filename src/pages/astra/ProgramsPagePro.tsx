import * as React from "react"
import { useState, useEffect } from "react"
import { Gift, Star, Target, Coins, TrendingUp, Users, Shield, Zap } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { DockNav } from "@/components/navigation/DockNav"
import { ProgramsHeaderPro } from "@/components/programs-pro/ProgramsHeaderPro"
import { FilterToolbarPro, type CategoryFilter, type SortOption } from "@/components/programs-pro/FilterToolbarPro"
import { ProgramGridPro } from "@/components/programs-pro/ProgramGridPro"
import { ProgramTilePro } from "@/components/programs-pro/ProgramTilePro"
import { QuickActionsSheet, type QuickAction } from "@/components/programs-pro/QuickActionsSheet"
import { ProgramsHeroCarousel } from "@/components/programs-pro/ProgramsHeroCarousel"
import { AnnouncementsBar } from "@/components/programs-pro/AnnouncementsBar"
import { EmptyStatePro } from "@/components/programs-pro/EmptyStatePro"
import { FilterSheetPro } from "@/components/programs-pro/FilterSheetPro"
import { QuickSwitch } from "@/components/astra/QuickSwitch"

interface Program {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  category: CategoryFilter
  badge?: "NEW" | "HOT" | "DAILY" | "LIVE"
  sparkline?: number[]
  progress?: number
  footer?: string
  route: string
  actions: QuickAction[]
  rulesLink?: string
}

const allPrograms: Program[] = [
  {
    id: "advertise-mining",
    title: "Advertise Mining",
    subtitle: "Watch ads • Earn BSK",
    icon: <Gift className="h-5 w-5" />,
    category: "earn",
    badge: "DAILY",
    sparkline: [100, 120, 115, 140, 135, 160, 155],
    footer: "Streak: 5 days",
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
    subtitle: "12.4% APY • Flexible",
    icon: <Star className="h-5 w-5" />,
    category: "earn",
    sparkline: [50, 55, 52, 58, 62, 59, 65],
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
    subtitle: "50% extra BSK • Limited",
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
    subtitle: "100 seats • Win big",
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
    subtitle: "5 free spins • Provably fair",
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
    subtitle: "0% interest • 16 weeks",
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
    subtitle: "Accident • Trading • Life",
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
    subtitle: "Badges unlock 50 levels",
    icon: <Users className="h-5 w-5" />,
    category: "network",
    badge: "NEW",
    footer: "Badge: Silver",
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
    subtitle: "Spot • Pro tools (Candles on-demand)",
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
  const [searchValue, setSearchValue] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all")
  const [sortBy, setSortBy] = useState<SortOption>("most-used")
  const [showFilters, setShowFilters] = useState(false)
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
  
  // Filter and sort programs
  const filteredPrograms = allPrograms
    .filter(program => {
      if (selectedCategory !== "all" && program.category !== selectedCategory) return false
      if (searchValue && !program.title.toLowerCase().includes(searchValue.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "a-z": return a.title.localeCompare(b.title)
        case "new": return (b.badge === "NEW" ? 1 : 0) - (a.badge === "NEW" ? 1 : 0)
        case "most-used":
        default: return 0
      }
    })
  
  const handleProgramPress = (program: Program) => {
    setScrollPosition(window.scrollY)
    navigate(program.route)
  }
  
  const handleKebabPress = (program: Program) => {
    setSelectedProgram(program)
  }
  
  const handleClearFilters = () => {
    setSearchValue("")
    setSelectedCategory("all")
    setSortBy("most-used")
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
      
      {/* Hero Carousel */}
      <ProgramsHeroCarousel />
      
      {/* Toolbar */}
      <FilterToolbarPro
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onOpenFilters={() => setShowFilters(true)}
      />
      
      {/* Grid */}
      <div className="px-4 pt-6 pb-8">
        {filteredPrograms.length > 0 ? (
          <ProgramGridPro>
            {filteredPrograms.map((program) => (
              <ProgramTilePro
                key={program.id}
                icon={program.icon}
                title={program.title}
                subtitle={program.subtitle}
                badge={program.badge}
                sparkline={program.sparkline}
                progress={program.progress}
                footer={program.footer}
                onPress={() => handleProgramPress(program)}
                onKebabPress={() => handleKebabPress(program)}
              />
            ))}
          </ProgramGridPro>
        ) : (
          <EmptyStatePro onClearFilters={handleClearFilters} />
        )}
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
      
      {/* Filter Sheet */}
      <FilterSheetPro
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onReset={handleClearFilters}
      />
      
      {/* Quick Switch */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />
    </div>
  )
}
