import * as React from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { Star, TrendingUp, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function StakingPage() {
  const pools = [
    {
      id: "bsk-flexible",
      title: "BSK Flexible",
      subtitle: "Flexible staking",
      icon: <Star className="h-5 w-5" />,
      badge: "DAILY" as const,
      sparkline: [10, 12, 15, 13, 18, 20, 22],
      footer: "APY: 12%",
      onPress: () => console.log("BSK Flexible")
    },
    {
      id: "bsk-30day",
      title: "BSK 30-Day",
      subtitle: "Locked for 30d",
      icon: <TrendingUp className="h-5 w-5" />,
      sparkline: [15, 17, 20, 18, 25, 28, 30],
      footer: "APY: 18%",
      onPress: () => console.log("BSK 30-Day")
    },
    {
      id: "bsk-90day",
      title: "BSK 90-Day",
      subtitle: "Locked for 90d",
      icon: <Zap className="h-5 w-5" />,
      badge: "HOT" as const,
      sparkline: [20, 22, 28, 25, 35, 38, 40],
      footer: "APY: 25%",
      onPress: () => console.log("BSK 90-Day")
    }
  ]

  return (
    <ProgramPageTemplate
      title="Staking"
      subtitle="Stake BSK and earn passive rewards"
      headerActions={
        <Button size="sm" variant="outline">
          My Stakes
        </Button>
      }
    >
      <div className="space-y-6" data-testid="staking-grid">
        <div className="rounded-lg bg-success/5 border border-success/20 p-4">
          <p className="text-sm text-muted-foreground">
            Choose a pool to start earning rewards on your BSK
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
