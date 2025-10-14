import * as React from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { Trophy, Coins, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SpinWheelPage() {
  const betChips = [
    {
      id: "bet-100",
      title: "₹100 Spin",
      subtitle: "5x max win",
      icon: <Coins className="h-5 w-5" />,
      badge: "DAILY" as const,
      footer: "Win up to 500",
      onPress: () => console.log("₹100 spin")
    },
    {
      id: "bet-250",
      title: "₹250 Spin",
      subtitle: "8x max win",
      icon: <Trophy className="h-5 w-5" />,
      badge: "HOT" as const,
      footer: "Win up to 2,000",
      onPress: () => console.log("₹250 spin")
    },
    {
      id: "bet-500",
      title: "₹500 Spin",
      subtitle: "10x max win",
      icon: <Crown className="h-5 w-5" />,
      footer: "Win up to 5,000",
      onPress: () => console.log("₹500 spin")
    },
    {
      id: "bet-1000",
      title: "₹1,000 Spin",
      subtitle: "15x max win",
      icon: <Crown className="h-5 w-5" />,
      badge: "NEW" as const,
      footer: "Win up to 15,000",
      onPress: () => console.log("₹1000 spin")
    }
  ]

  return (
    <ProgramPageTemplate
      title="Spin Wheel"
      subtitle="Try your luck and win BSK"
      headerActions={
        <Button size="sm" variant="outline">
          History
        </Button>
      }
    >
      <div className="space-y-6" data-testid="spin-presets-grid">
        <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
          <p className="text-sm text-muted-foreground">
            Choose your bet amount and spin the wheel for a chance to win
          </p>
        </div>

        <ProgramGrid>
          {betChips.map((chip) => (
            <ProgramTileUltra key={chip.id} {...chip} />
          ))}
        </ProgramGrid>
      </div>
    </ProgramPageTemplate>
  )
}
