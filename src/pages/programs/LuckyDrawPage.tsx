import * as React from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { Target, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LuckyDrawPage() {
  const pools = [
    {
      id: "pool-1",
      title: "₹100 Pool",
      subtitle: "100 tickets",
      icon: <Target className="h-5 w-5" />,
      badge: "LIVE" as const,
      progress: { value: 67, label: "67/100" },
      footer: "Prize: 5,000 BSK",
      onPress: () => console.log("Pool 1")
    },
    {
      id: "pool-2",
      title: "₹250 Pool",
      subtitle: "50 tickets",
      icon: <Trophy className="h-5 w-5" />,
      badge: "HOT" as const,
      progress: { value: 34, label: "17/50" },
      footer: "Prize: 7,500 BSK",
      onPress: () => console.log("Pool 2")
    },
    {
      id: "pool-3",
      title: "₹500 Pool",
      subtitle: "25 tickets",
      icon: <Users className="h-5 w-5" />,
      progress: { value: 12, label: "3/25" },
      footer: "Prize: 10,000 BSK",
      onPress: () => console.log("Pool 3")
    }
  ]

  return (
    <ProgramPageTemplate
      title="Lucky Draw"
      subtitle="Enter pools and win BSK prizes"
      headerActions={
        <Button size="sm" variant="outline">
          My Tickets
        </Button>
      }
    >
      <div className="space-y-6" data-testid="draws-grid">
        <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
          <p className="text-sm text-muted-foreground">
            Buy tickets to enter pools. Winners drawn when pools fill up!
          </p>
        </div>

        <ProgramGrid>
          {pools.map((pool) => (
            <ProgramTileUltra key={pool.id} {...pool} />
          ))}
        </ProgramGrid>
      </div>
    </ProgramPageTemplate>
  )
}
