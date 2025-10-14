import * as React from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { Coins, Gift, Zap, Crown } from "lucide-react"

export default function PurchasePage() {
  const offers = [
    {
      id: "offer-100",
      title: "₹100 Pack",
      subtitle: "+50% bonus",
      icon: <Coins className="h-5 w-5" />,
      badge: "DAILY" as const,
      footer: "Get 150 BSK",
      onPress: () => console.log("₹100 pack")
    },
    {
      id: "offer-250",
      title: "₹250 Pack",
      subtitle: "+50% bonus",
      icon: <Gift className="h-5 w-5" />,
      badge: "HOT" as const,
      footer: "Get 375 BSK",
      onPress: () => console.log("₹250 pack")
    },
    {
      id: "offer-500",
      title: "₹500 Pack",
      subtitle: "+50% bonus",
      icon: <Zap className="h-5 w-5" />,
      footer: "Get 750 BSK",
      onPress: () => console.log("₹500 pack")
    },
    {
      id: "offer-1000",
      title: "₹1,000 Pack",
      subtitle: "+50% bonus",
      icon: <Crown className="h-5 w-5" />,
      badge: "NEW" as const,
      footer: "Get 1,500 BSK",
      onPress: () => console.log("₹1000 pack")
    }
  ]

  return (
    <ProgramPageTemplate
      title="Purchase BSK"
      subtitle="Buy BSK tokens with 50% bonus"
    >
      <div className="space-y-6" data-testid="promo-grid">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm font-semibold text-primary mb-2">🎉 Limited Time Offer!</p>
          <p className="text-sm text-muted-foreground">
            Get 50% extra BSK on every purchase. Offer valid for all tiers.
          </p>
        </div>

        <ProgramGrid>
          {offers.map((offer) => (
            <ProgramTileUltra key={offer.id} {...offer} />
          ))}
        </ProgramGrid>
      </div>
    </ProgramPageTemplate>
  )
}
