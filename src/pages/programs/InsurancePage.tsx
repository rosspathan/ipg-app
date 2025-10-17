import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Check } from "lucide-react"

export default function InsurancePage() {
  return (
    <ProgramAccessGate programKey="insurance" title="Insurance">
      <InsuranceContent />
    </ProgramAccessGate>
  )
}

function InsuranceContent() {
  const plans = [
    {
      name: "Basic Protection",
      price: 50,
      coverage: "50%",
      maxClaim: 500,
      features: [
        "Up to 50% loss coverage",
        "Max ₹500 per claim",
        "3 claims per month",
        "24/7 support"
      ]
    },
    {
      name: "Premium Protection",
      price: 200,
      coverage: "75%",
      maxClaim: 2000,
      features: [
        "Up to 75% loss coverage",
        "Max ₹2,000 per claim",
        "5 claims per month",
        "Priority support",
        "Bonus rewards"
      ]
    },
    {
      name: "Elite Protection",
      price: 500,
      coverage: "90%",
      maxClaim: 5000,
      features: [
        "Up to 90% loss coverage",
        "Max ₹5,000 per claim",
        "Unlimited claims",
        "VIP support",
        "Premium rewards",
        "Exclusive benefits"
      ]
    }
  ]

  return (
    <ProgramPageTemplate
      title="Insurance"
      subtitle="Protect your trading losses"
    >
      <div className="space-y-6">
        <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
          <p className="text-sm text-muted-foreground">
            Get compensated for trading losses with our insurance plans
          </p>
        </div>

        {plans.map((plan) => (
          <Card key={plan.name} className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.coverage} coverage</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-2xl font-bold">{plan.price} BSK</p>
                <p className="text-xs text-muted-foreground">per month</p>
              </div>
              <Button>Subscribe</Button>
            </div>
          </Card>
        ))}
      </div>
    </ProgramPageTemplate>
  )
}
