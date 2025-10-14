import * as React from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { TrendingUp, Calendar, FileText, CreditCard } from "lucide-react"

export default function LoansPage() {
  const actions = [
    {
      id: "apply",
      title: "Apply Loan",
      subtitle: "0% interest",
      icon: <FileText className="h-5 w-5" />,
      badge: "NEW" as const,
      footer: "Get instant approval",
      onPress: () => console.log("Apply loan")
    },
    {
      id: "pay-emi",
      title: "Pay EMI",
      subtitle: "Weekly payments",
      icon: <CreditCard className="h-5 w-5" />,
      footer: "Pay your installment",
      onPress: () => console.log("Pay EMI")
    },
    {
      id: "schedule",
      title: "Schedule",
      subtitle: "View plan",
      icon: <Calendar className="h-5 w-5" />,
      footer: "Check repayment plan",
      onPress: () => console.log("Schedule")
    },
    {
      id: "history",
      title: "History",
      subtitle: "Past loans",
      icon: <TrendingUp className="h-5 w-5" />,
      footer: "View all transactions",
      onPress: () => console.log("History")
    }
  ]

  return (
    <ProgramPageTemplate
      title="Loans"
      subtitle="Get 0% interest loans on your BSK"
    >
      <div className="space-y-6" data-testid="loans-grid">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm text-muted-foreground">
            Collateralize your BSK holdings to get instant 0% interest loans
          </p>
        </div>

        <ProgramGrid>
          {actions.map((action) => (
            <ProgramTileUltra key={action.id} {...action} />
          ))}
        </ProgramGrid>
      </div>
    </ProgramPageTemplate>
  )
}
