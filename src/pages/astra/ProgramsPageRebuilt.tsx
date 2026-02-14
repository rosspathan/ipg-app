import * as React from "react"
import { 
  Gift, Star, Zap, Users, TrendingUp, Shield, Coins, Target, 
  Award, ChevronRight, Archive, CreditCard
} from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"

const bg = '#0B1020'
const surface = 'hsla(220, 25%, 11%, 0.8)'
const teal = '#16F2C6'
const violet = '#7C3AED'
const borderSub = 'hsla(160, 50%, 50%, 0.08)'

interface ProgramItem {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  route: string
  badge?: { text: string; color: string }
}

interface CategorySection {
  title: string
  emoji: string
  programs: ProgramItem[]
}

function ProgramTileCompact({ program, onPress }: { program: ProgramItem; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="relative w-full text-left rounded-xl p-4 transition-all duration-200"
      style={{
        background: '#121826',
        border: `1px solid ${borderSub}`,
        height: '116px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'hsla(160, 50%, 50%, 0.2)'
        e.currentTarget.style.boxShadow = `0 0 24px hsla(160, 80%, 50%, 0.08)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = borderSub
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {program.badge && (
        <span
          className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
          style={{
            background: `${program.badge.color}18`,
            color: program.badge.color,
            border: `1px solid ${program.badge.color}30`,
          }}
        >
          {program.badge.text}
        </span>
      )}

      <div className="flex flex-col items-center justify-center h-full gap-2.5">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: 'hsla(220, 30%, 18%, 0.8)',
            border: `1px solid hsla(160, 50%, 50%, 0.1)`,
          }}
        >
          {program.icon}
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold" style={{ color: 'hsl(0, 0%, 90%)' }}>
            {program.title}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'hsl(220, 10%, 55%)' }}>
            {program.subtitle}
          </p>
        </div>
      </div>
    </button>
  )
}

export function ProgramsPageRebuilt() {
  const { navigate } = useNavigation()

  const categories: CategorySection[] = [
    {
      title: "Earn",
      emoji: "💰",
      programs: [
        {
          id: "staking",
          title: "Staking",
          subtitle: "Earn monthly yield",
          icon: <Star className="h-5 w-5" style={{ color: teal }} />,
          route: "/app/programs/staking",
        },
        {
          id: "ad-mining",
          title: "Ad Mining",
          subtitle: "Watch ads, earn BSK",
          icon: <Gift className="h-5 w-5" style={{ color: teal }} />,
          route: "/app/programs/ads",
          badge: { text: "DAILY", color: teal },
        },
        {
          id: "lucky-draw",
          title: "Lucky Draw",
          subtitle: "Win big prizes",
          icon: <Target className="h-5 w-5" style={{ color: '#F59E0B' }} />,
          route: "/app/programs/lucky-draw",
          badge: { text: "HOT", color: '#EF4444' },
        },
        {
          id: "spin-wheel",
          title: "Spin Wheel",
          subtitle: "Provably fair spins",
          icon: <Zap className="h-5 w-5" style={{ color: violet }} />,
          route: "/app/programs/spin",
          badge: { text: "LIVE", color: '#22C55E' },
        },
      ],
    },
    {
      title: "Growth",
      emoji: "👥",
      programs: [
        {
          id: "referrals",
          title: "Team Referrals",
          subtitle: "Invite & earn together",
          icon: <Users className="h-5 w-5" style={{ color: teal }} />,
          route: "/app/programs/referrals",
          badge: { text: "NEW", color: teal },
        },
        {
          id: "badges",
          title: "Badge System",
          subtitle: "Unlock tiers & perks",
          icon: <Award className="h-5 w-5" style={{ color: '#F59E0B' }} />,
          route: "/app/programs/achievements",
        },
        {
          id: "subscriptions",
          title: "Subscriptions",
          subtitle: "Premium benefits",
          icon: <CreditCard className="h-5 w-5" style={{ color: violet }} />,
          route: "/app/programs/subscriptions",
        },
      ],
    },
    {
      title: "Protection",
      emoji: "🛡",
      programs: [
        {
          id: "insurance",
          title: "Insurance",
          subtitle: "Protect your assets",
          icon: <Shield className="h-5 w-5" style={{ color: teal }} />,
          route: "/app/programs/insurance",
        },
        {
          id: "loans",
          title: "Loans",
          subtitle: "USDI collateral loans",
          icon: <Coins className="h-5 w-5" style={{ color: 'hsl(220, 10%, 50%)' }} />,
          route: "/app/programs/loans",
          badge: { text: "ARCHIVED", color: '#CA8A04' },
        },
      ],
    },
    {
      title: "Trading",
      emoji: "📈",
      programs: [
        {
          id: "trading",
          title: "Trading",
          subtitle: "Real-time exchange",
          icon: <TrendingUp className="h-5 w-5" style={{ color: teal }} />,
          route: "/app/trade",
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen pb-32" style={{ background: bg }} data-testid="page-programs">
      <div className="px-4 pt-5 pb-4 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(0, 0%, 95%)' }}>Programs</h1>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(220, 10%, 50%)' }}>
            Explore the IPG ecosystem
          </p>
        </div>

        {/* Promo Banner */}
        <button
          onClick={() => navigate("/app/programs/bsk-bonus")}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200"
          style={{
            background: `linear-gradient(135deg, hsla(160, 80%, 40%, 0.12) 0%, hsla(260, 60%, 50%, 0.08) 100%)`,
            border: `1px solid hsla(160, 50%, 50%, 0.15)`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${teal}20`, color: teal }}>
              NEW
            </span>
            <span className="text-xs font-medium" style={{ color: 'hsl(0, 0%, 85%)' }}>
              BSK Purchase Bonus — Get 50% extra
            </span>
          </div>
          <ChevronRight className="h-3.5 w-3.5" style={{ color: 'hsl(220, 10%, 45%)' }} />
        </button>

        {/* Categories */}
        {categories.map((cat) => (
          <div key={cat.title} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">{cat.emoji}</span>
              <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'hsl(220, 10%, 45%)' }}>
                {cat.title}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {cat.programs.map((program) => (
                <ProgramTileCompact
                  key={program.id}
                  program={program}
                  onPress={() => navigate(program.route)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
