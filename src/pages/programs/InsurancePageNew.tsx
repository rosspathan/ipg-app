import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"
import { Shield, CheckCircle2, XCircle } from "lucide-react"

export default function InsurancePageNew() {
  const navigate = useNavigate()

  const plans = [
    {
      name: "Basic",
      price: "50 BSK/month",
      coverage: "50%",
      maxClaim: "500 BSK",
      features: ["Trade loss coverage", "3 claims per month", "24h support"]
    },
    {
      name: "Premium",
      price: "100 BSK/month",
      coverage: "75%",
      maxClaim: "2,000 BSK",
      features: ["Trade loss coverage", "5 claims per month", "Priority support", "Bonus rewards"],
      popular: true
    },
    {
      name: "VIP",
      price: "200 BSK/month",
      coverage: "90%",
      maxClaim: "5,000 BSK",
      features: ["Full trade protection", "Unlimited claims", "24/7 VIP support", "Premium rewards"]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Trade Insurance</h1>
          <p className="text-muted-foreground">Protect your trading capital with insurance coverage</p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="mb-2">Coming Soon</Badge>
              <h3 className="text-xl font-bold">Insurance Program Launching Soon</h3>
              <p className="text-muted-foreground">
                Get protection against trading losses with our insurance plans
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Plans */}
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary/50 relative" : ""}>
              {plan.popular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-2xl font-bold text-primary">{plan.price}</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coverage</span>
                    <span className="font-medium">{plan.coverage}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max Claim</span>
                    <span className="font-medium">{plan.maxClaim}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full" variant={plan.popular ? "default" : "outline"} disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How Trade Insurance Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  1
                </div>
                <div>
                  <h4 className="font-medium mb-1">Subscribe to a Plan</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose an insurance plan that fits your trading volume
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">Trade with Protection</h4>
                  <p className="text-sm text-muted-foreground">
                    Your trades are automatically covered under the policy
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">File a Claim</h4>
                  <p className="text-sm text-muted-foreground">
                    Submit claims for eligible losses within 24 hours
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  4
                </div>
                <div>
                  <h4 className="font-medium mb-1">Get Reimbursed</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive coverage amount directly to your wallet
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
