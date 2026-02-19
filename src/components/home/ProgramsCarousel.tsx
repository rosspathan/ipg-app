import * as React from "react"
import { 
  Coins, 
  Zap, 
  Target, 
  Shield, 
  TrendingUp, 
  Users,
  Sparkles 
} from "lucide-react"
import { ProgramTile } from "@/components/ui/program-tile"
import { useNavigation } from "@/hooks/useNavigation"

const programs = [
  {
    id: "spin-wheel",
    title: "Spin Wheel",
    description: "5 free spins, win up to 2x",
    icon: <Zap className="h-6 w-6" />,
    category: "games" as const,
    route: "/app/programs/spin",
    badge: { type: "hot" as const, text: "HOT" }
  },
  {
    id: "lucky-draws",
    title: "Lucky Draws",
    description: "Join pools, win big prizes",
    icon: <Target className="h-6 w-6" />,
    category: "games" as const,
    route: "/app-legacy/lucky"
  },
  {
    id: "trading",
    title: "Trading",
    description: "Buy & sell crypto assets",
    icon: <TrendingUp className="h-6 w-6" />,
    category: "trading" as const,
    route: "/app/trade",
    badge: { type: "live" as const, text: "LIVE" }
  },
  {
    id: "staking",
    title: "Staking",
    description: "Stake tokens, earn rewards",
    icon: <Sparkles className="h-6 w-6" />,
    category: "finance" as const,
    route: "/app/programs/staking"
  },
  {
    id: "insurance",
    title: "Insurance",
    description: "Protect your investments",
    icon: <Shield className="h-6 w-6" />,
    category: "finance" as const,
    route: "/app/programs/insurance"
  },
  {
    id: "referrals",
    title: "Referrals",
    description: "Invite friends, earn together",
    icon: <Users className="h-6 w-6" />,
    category: "earn" as const,
    route: "/app/programs/referrals"
  }
]

export function ProgramsCarousel() {
  const { navigate } = useNavigation()

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-semibold">My Programs</h2>
        <button
          onClick={() => navigate("/app/programs")}
          className="text-sm text-text-secondary"
        >
          View All
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {programs.map((program) => (
          <ProgramTile
            key={program.id}
            title={program.title}
            description={program.description}
            icon={program.icon}
            category={program.category}
            badge={program.badge}
            onPress={() => navigate(program.route)}
          />
        ))}
      </div>
    </div>
  )
}