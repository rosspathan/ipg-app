import * as React from "react"
import { Shield, Heart, TrendingDown, FileText, Plus, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AstraCard } from "@/components/astra/AstraCard"
import { KPIChip } from "@/components/astra/KPIChip"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

// Mock insurance plans
const INSURANCE_PLANS = [
  {
    id: "accident",
    title: "Accident Insurance",
    icon: Shield,
    premium: 10000, // INR
    benefit: 1000000, // INR
    color: "accent",
    description: "Comprehensive accident coverage",
    features: [
      "24/7 Coverage",
      "Global Protection",
      "Quick Claims",
      "Family Benefits"
    ]
  },
  {
    id: "trading",
    title: "Trading Insurance",
    icon: TrendingDown,
    premium: 10000,
    benefit: 50000, // Max 50% loss coverage
    color: "warning",
    description: "Trading loss protection",
    features: [
      "50% Loss Coverage",
      "Up to ₹50,000",
      "Monthly Claims",
      "Auto Settlement"
    ]
  },
  {
    id: "life",
    title: "Life Insurance",
    icon: Heart,
    premium: 10000,
    benefit: 500000,
    color: "success",
    description: "Life protection and maturity",
    features: [
      "₹5 Lakh Maturity",
      "Term Coverage",
      "Nominee Protection",
      "Tax Benefits"
    ]
  }
] as const

export function InsurancePage() {
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null)

  const handlePurchase = (planId: string) => {
    // Mock purchase flow
    console.log("Purchasing plan:", planId)
  }

  return (
    <div className="space-y-6 p-4" data-testid="page-insurance">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/app/home")}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Insurance Plans</h2>
          <p className="text-sm text-muted-foreground mt-1">Protect your investments and lifestyle</p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="space-y-4">
        {INSURANCE_PLANS.map((plan) => {
          const Icon = plan.icon
          const isSelected = selectedPlan === plan.id
          
          return (
            <AstraCard 
              key={plan.id}
              variant={isSelected ? "neon" : "elevated"}
              className={cn(
                "transition-all duration-standard cursor-pointer",
                isSelected && "ring-2 ring-accent/50"
              )}
              onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
            >
              <div className="p-6">
                {/* Plan Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-3 rounded-xl",
                      plan.color === "accent" && "bg-accent/10 text-accent",
                      plan.color === "warning" && "bg-warning/10 text-warning",
                      plan.color === "success" && "bg-success/10 text-success"
                    )}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{plan.title}</h3>
                      <p className="text-sm text-text-secondary">{plan.description}</p>
                    </div>
                  </div>
                  
                  <KPIChip
                    variant={plan.color}
                    value={`₹${(plan.premium / 1000).toFixed(0)}k`}
                    label="Premium"
                    size="sm"
                  />
                </div>

                {/* Plan Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-background-secondary/30 rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-1">Premium</div>
                    <div className="font-semibold text-lg">₹{plan.premium.toLocaleString()}</div>
                  </div>
                  
                  <div className="bg-background-secondary/30 rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-1">Benefit</div>
                    <div className="font-semibold text-lg">₹{plan.benefit.toLocaleString()}</div>
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        plan.color === "accent" && "bg-accent",
                        plan.color === "warning" && "bg-warning",
                        plan.color === "success" && "bg-success"
                      )} />
                      <span className="text-xs text-text-secondary">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePurchase(plan.id)
                  }}
                  className={cn(
                    "w-full h-10",
                    plan.color === "accent" && "bg-accent hover:bg-accent/90 text-accent-foreground",
                    plan.color === "warning" && "bg-warning hover:bg-warning/90 text-warning-foreground",
                    plan.color === "success" && "bg-success hover:bg-success/90 text-success-foreground"
                  )}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Buy Plan
                </Button>
              </div>
            </AstraCard>
          )
        })}
      </div>

      {/* Claims Center */}
      <AstraCard variant="glass">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">Claims Center</h3>
            <p className="text-sm text-muted-foreground mt-1">File and track your insurance claims</p>
          </div>
          
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-12 border-accent/30 hover:bg-accent/10"
            >
              <FileText className="h-5 w-5 mr-3 text-accent" />
              <div className="text-left">
                <div className="font-medium">File New Claim</div>
                <div className="text-xs text-text-secondary">Submit your insurance claim</div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start h-12 border-border-subtle hover:bg-background-secondary/50"
            >
              <Shield className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">Track Claims</div>
                <div className="text-xs text-text-secondary">View your claim status</div>
              </div>
            </Button>
          </div>
        </div>
      </AstraCard>

      {/* Disclaimers */}
      <div className="text-xs text-text-secondary bg-border-subtle/10 border border-border-subtle rounded-lg p-4 space-y-2">
        <div><strong>Important:</strong> All insurance plans are subject to terms and conditions.</div>
        <div>Claims are processed within 7-14 business days after document verification.</div>
        <div>Premium payments are final and non-refundable after the cooling-off period.</div>
      </div>
    </div>
  )
}