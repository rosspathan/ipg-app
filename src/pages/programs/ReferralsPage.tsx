import * as React from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { Users, Award, Crown, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ReferralsPage() {
  const milestones = [
    {
      id: "silver",
      title: "Silver",
      subtitle: "5 referrals",
      icon: <Award className="h-5 w-5" />,
      progress: { value: 60, label: "3/5" },
      footer: "Unlock 2% bonus",
      onPress: () => console.log("Silver")
    },
    {
      id: "gold",
      title: "Gold",
      subtitle: "10 referrals",
      icon: <Award className="h-5 w-5" />,
      badge: "HOT" as const,
      progress: { value: 30, label: "3/10" },
      footer: "Unlock 5% bonus",
      onPress: () => console.log("Gold")
    },
    {
      id: "platinum",
      title: "Platinum",
      subtitle: "25 referrals",
      icon: <Crown className="h-5 w-5" />,
      progress: { value: 12, label: "3/25" },
      footer: "Unlock 10% bonus",
      onPress: () => console.log("Platinum")
    },
    {
      id: "diamond",
      title: "Diamond",
      subtitle: "50 referrals",
      icon: <Crown className="h-5 w-5" />,
      badge: "NEW" as const,
      progress: { value: 6, label: "3/50" },
      footer: "Unlock 20% bonus",
      onPress: () => console.log("Diamond")
    }
  ]

  return (
    <ProgramPageTemplate
      title="Referrals"
      subtitle="Invite friends and earn commissions"
      headerActions={
        <Button size="sm" variant="default">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      }
    >
      <div className="space-y-6" data-testid="referrals-grids">
        {/* Referral Code Card */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
              <p className="font-mono font-bold text-lg text-foreground">ABC123</p>
            </div>
            <Button size="sm" variant="outline">
              Copy
            </Button>
          </div>
        </div>

        {/* VIP Milestones */}
        <div>
          <h3 className="font-semibold text-base mb-4 text-foreground">VIP Milestones</h3>
          <ProgramGrid>
            {milestones.map((milestone) => (
              <ProgramTileUltra key={milestone.id} {...milestone} />
            ))}
          </ProgramGrid>
        </div>
      </div>
    </ProgramPageTemplate>
  )
}
