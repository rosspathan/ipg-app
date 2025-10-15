import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"
import { Coins, Lock, TrendingUp, Calendar } from "lucide-react"

export default function StakingPageNew() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Coins className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">BSK Staking</h1>
          <p className="text-muted-foreground">Stake your BSK and earn passive rewards</p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="mb-2">Coming Soon</Badge>
              <h3 className="text-xl font-bold">Staking Program Launching Soon</h3>
              <p className="text-muted-foreground">
                Stake your BSK tokens and earn attractive APY rewards
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Staking Plans Preview */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                Flexible
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">5%</div>
                <div className="text-sm text-muted-foreground">APY</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lock Period</span>
                  <span className="font-medium">None</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Stake</span>
                  <span className="font-medium">100 BSK</span>
                </div>
              </div>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5" />
                30 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">12%</div>
                <div className="text-sm text-muted-foreground">APY</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lock Period</span>
                  <span className="font-medium">30 Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Stake</span>
                  <span className="font-medium">500 BSK</span>
                </div>
              </div>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" />
                90 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">20%</div>
                <div className="text-sm text-muted-foreground">APY</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lock Period</span>
                  <span className="font-medium">90 Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Stake</span>
                  <span className="font-medium">1,000 BSK</span>
                </div>
              </div>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Staking Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Daily Rewards</h4>
                  <p className="text-sm text-muted-foreground">
                    Earn rewards distributed daily to your wallet
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Flexible Terms</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose lock periods that suit your strategy
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Compound Returns</h4>
                  <p className="text-sm text-muted-foreground">
                    Auto-compound your rewards for maximum growth
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Early Unstaking</h4>
                  <p className="text-sm text-muted-foreground">
                    Unstake anytime with minimal penalty fees
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
