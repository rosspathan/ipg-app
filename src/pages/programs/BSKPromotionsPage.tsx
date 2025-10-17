import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Gift, Clock } from "lucide-react"

export default function BSKPromotionsPage() {
  return (
    <ProgramAccessGate programKey="one_time_bsk" title="BSK Promotions">
      <BSKPromotionsContent />
    </ProgramAccessGate>
  )
}

function BSKPromotionsContent() {
  const promotions = [
    {
      id: 1,
      title: "Welcome Bonus",
      description: "Get 100 BSK on your first deposit",
      reward: 100,
      requirement: "Deposit minimum 1000 BSK",
      expiry: "7 days remaining",
      claimed: false
    },
    {
      id: 2,
      title: "Trading Milestone",
      description: "Complete 10 trades and get bonus",
      reward: 50,
      requirement: "Make 10 successful trades",
      expiry: "30 days remaining",
      claimed: false
    },
    {
      id: 3,
      title: "Referral Bonus",
      description: "Refer 5 friends and earn",
      reward: 200,
      requirement: "5 active referrals",
      expiry: "No expiry",
      claimed: false
    }
  ]

  return (
    <ProgramPageTemplate
      title="BSK Promotions"
      subtitle="Claim exclusive BSK bonuses"
    >
      <div className="space-y-6">
        <div className="rounded-lg bg-success/5 border border-success/20 p-4">
          <p className="text-sm text-muted-foreground">
            Complete tasks and claim one-time BSK bonuses. Limited time offers!
          </p>
        </div>

        {promotions.map((promo) => (
          <Card key={promo.id} className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10 flex-shrink-0">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg mb-1">{promo.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {promo.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{promo.reward} BSK Reward</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{promo.expiry}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 mb-4">
                  <p className="text-xs text-muted-foreground">Requirement:</p>
                  <p className="text-sm font-medium">{promo.requirement}</p>
                </div>

                <Button className="w-full" disabled={promo.claimed}>
                  {promo.claimed ? "Claimed" : "Claim Bonus"}
                </Button>
              </div>
            </div>
          </Card>
        ))}

        <Card className="p-6 text-center bg-muted/50">
          <Gift className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold mb-1">More Promotions Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            Check back regularly for new bonus opportunities
          </p>
        </Card>
      </div>
    </ProgramPageTemplate>
  )
}
