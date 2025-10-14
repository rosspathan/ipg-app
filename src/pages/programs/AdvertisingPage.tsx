import * as React from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { Monitor, Clock, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/hooks/useNavigation"

export default function AdvertisingPage() {
  const { navigate } = useNavigation()

  const tiers = [
    {
      id: "free",
      title: "Free Daily",
      subtitle: "Watch & Earn",
      icon: <Monitor className="h-5 w-5" />,
      badge: "DAILY" as const,
      footer: "5 ads/day • 0.5 BSK",
      onPress: () => console.log("Free tier")
    },
    {
      id: "tier-100",
      title: "₹100 Plan",
      subtitle: "100 days",
      icon: <Gift className="h-5 w-5" />,
      footer: "10 BSK/day",
      onPress: () => console.log("₹100 tier")
    },
    {
      id: "tier-250",
      title: "₹250 Plan",
      subtitle: "100 days",
      icon: <Gift className="h-5 w-5" />,
      badge: "HOT" as const,
      footer: "25 BSK/day",
      onPress: () => console.log("₹250 tier")
    },
    {
      id: "tier-500",
      title: "₹500 Plan",
      subtitle: "100 days",
      icon: <Gift className="h-5 w-5" />,
      footer: "50 BSK/day",
      onPress: () => console.log("₹500 tier")
    },
    {
      id: "tier-1000",
      title: "₹1,000 Plan",
      subtitle: "100 days",
      icon: <Gift className="h-5 w-5" />,
      badge: "NEW" as const,
      footer: "100 BSK/day",
      onPress: () => console.log("₹1000 tier")
    }
  ]

  return (
    <ProgramPageTemplate
      title="Ad Mining"
      subtitle="Watch ads and earn BSK tokens daily"
      headerActions={
        <Button size="sm" variant="outline">
          <Clock className="h-4 w-4 mr-2" />
          History
        </Button>
      }
    >
      <div className="space-y-6" data-testid="advert-grid">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm text-muted-foreground">
            Choose a tier to start earning BSK by watching advertisements
          </p>
        </div>

        <ProgramGrid>
          {tiers.map((tier) => (
            <ProgramTileUltra key={tier.id} {...tier} />
          ))}
        </ProgramGrid>
      </div>
    </ProgramPageTemplate>
  )
}
