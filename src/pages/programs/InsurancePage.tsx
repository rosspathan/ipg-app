import * as React from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { Shield, Activity, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function InsurancePage() {
  const plans = [
    {
      id: "accident",
      title: "Accident Cover",
      subtitle: "₹299/month",
      icon: <Shield className="h-5 w-5" />,
      badge: "DAILY" as const,
      footer: "Up to ₹5L coverage",
      onPress: () => console.log("Accident")
    },
    {
      id: "trading",
      title: "Trading Loss",
      subtitle: "₹499/month",
      icon: <Activity className="h-5 w-5" />,
      badge: "HOT" as const,
      footer: "50% loss recovery",
      onPress: () => console.log("Trading")
    },
    {
      id: "life",
      title: "Life Insurance",
      subtitle: "₹999/month",
      icon: <Heart className="h-5 w-5" />,
      badge: "NEW" as const,
      footer: "Up to ₹10L coverage",
      onPress: () => console.log("Life")
    }
  ]

  return (
    <ProgramPageTemplate
      title="Insurance"
      subtitle="Protect your assets and life"
      headerActions={
        <Button size="sm" variant="outline">
          My Policies
        </Button>
      }
    >
      <div className="space-y-6" data-testid="ins-grid">
        <div className="rounded-lg bg-success/5 border border-success/20 p-4">
          <p className="text-sm text-muted-foreground">
            Choose a plan to secure yourself and your investments
          </p>
        </div>

        <ProgramGrid>
          {plans.map((plan) => (
            <ProgramTileUltra key={plan.id} {...plan} />
          ))}
        </ProgramGrid>
      </div>
    </ProgramPageTemplate>
  )
}
