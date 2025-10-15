import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"
import { Gift, Sparkles, Award, TrendingUp } from "lucide-react"

export default function BSKPromotionsPageNew() {
  const navigate = useNavigate()

  const promotions = [
    {
      title: "Welcome Bonus",
      description: "Get 100 BSK when you complete your first trade",
      reward: "100 BSK",
      icon: Gift,
      status: "Active"
    },
    {
      title: "Referral Bonus",
      description: "Earn 50 BSK for each friend you refer",
      reward: "50 BSK per referral",
      icon: Award,
      status: "Active"
    },
    {
      title: "Trading Volume Bonus",
      description: "Get bonus BSK based on your monthly trading volume",
      reward: "Up to 1,000 BSK",
      icon: TrendingUp,
      status: "Coming Soon"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">BSK Promotions</h1>
          <p className="text-muted-foreground">Earn bonus BSK through special promotions</p>
        </div>

        {/* Active Promotions */}
        <div className="space-y-4">
          {promotions.map((promo, idx) => {
            const Icon = promo.icon
            return (
              <Card key={idx} className={promo.status === "Coming Soon" ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{promo.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {promo.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant={promo.status === "Active" ? "default" : "outline"}>
                      {promo.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary">
                      {promo.reward}
                    </div>
                    <Button 
                      variant={promo.status === "Active" ? "default" : "outline"}
                      disabled={promo.status !== "Active"}
                    >
                      {promo.status === "Active" ? "Claim Now" : "Coming Soon"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* How to Participate */}
        <Card>
          <CardHeader>
            <CardTitle>How to Participate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  1
                </div>
                <div>
                  <h4 className="font-medium mb-1">Check Active Promotions</h4>
                  <p className="text-sm text-muted-foreground">
                    Browse available promotions and their requirements
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">Complete Requirements</h4>
                  <p className="text-sm text-muted-foreground">
                    Fulfill the promotion criteria to qualify
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">Claim Your Reward</h4>
                  <p className="text-sm text-muted-foreground">
                    Click claim to receive BSK directly to your balance
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Promotions are subject to availability and may expire</li>
              <li>• Each promotion can only be claimed once per user</li>
              <li>• Bonus BSK may have vesting or withdrawal restrictions</li>
              <li>• IPG reserves the right to modify or cancel promotions</li>
              <li>• Fraudulent activity will result in account suspension</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
