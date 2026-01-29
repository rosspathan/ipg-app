import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { TrendingUp, Calendar, CreditCard, Archive } from "lucide-react"

export default function LoansPage() {
  const navigate = useNavigate()

  // Loan program is ARCHIVED - only management actions, no new applications
  const actions = [
    {
      id: "pay-emi",
      title: "Pay EMI",
      subtitle: "Weekly payments",
      icon: <CreditCard className="h-5 w-5" />,
      footer: "Pay your installment",
      onPress: () => navigate("/app/loans")
    },
    {
      id: "schedule",
      title: "Schedule",
      subtitle: "View plan",
      icon: <Calendar className="h-5 w-5" />,
      footer: "Check repayment plan",
      onPress: () => navigate("/app/loans")
    },
    {
      id: "history",
      title: "History",
      subtitle: "Past loans",
      icon: <TrendingUp className="h-5 w-5" />,
      footer: "View all transactions",
      onPress: () => navigate("/app/loans/history")
    }
  ]

  return (
    <ProgramPageTemplate
      title="Loans"
      subtitle="Manage your existing loans"
    >
      <div className="space-y-6" data-testid="loans-grid">
        {/* Archived Notice */}
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-4 flex items-start gap-3">
          <Archive className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Program Archived</p>
            <p className="text-xs text-muted-foreground mt-1">
              The BSK Loan program is no longer accepting new applications. 
              Existing loans will continue to be serviced normally with weekly EMI deductions.
            </p>
          </div>
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
