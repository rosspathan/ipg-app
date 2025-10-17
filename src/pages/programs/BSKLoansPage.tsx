import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Info } from "lucide-react"

export default function BSKLoansPage() {
  return (
    <ProgramAccessGate programKey="bsk_loans" title="BSK Loans">
      <BSKLoansContent />
    </ProgramAccessGate>
  )
}

function BSKLoansContent() {
  const loanOptions = [
    {
      amount: 1000,
      collateral: 1200,
      duration: 4,
      weeklyPayment: 262.5,
      interestRate: 5
    },
    {
      amount: 5000,
      collateral: 6000,
      duration: 8,
      weeklyPayment: 656.25,
      interestRate: 5
    },
    {
      amount: 10000,
      collateral: 12000,
      duration: 12,
      weeklyPayment: 875,
      interestRate: 5
    }
  ]

  return (
    <ProgramPageTemplate
      title="BSK Loans"
      subtitle="Get instant BSK loans with collateral"
    >
      <div className="space-y-6">
        <div className="rounded-lg bg-info/5 border border-info/20 p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-info mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Lock BSK as collateral (120% of loan amount)</li>
                <li>Get instant loan in BSK</li>
                <li>Repay weekly over chosen duration</li>
                <li>Get your collateral back after full repayment</li>
              </ul>
            </div>
          </div>
        </div>

        {loanOptions.map((loan) => (
          <Card key={loan.amount} className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">{loan.amount.toLocaleString()} BSK</h3>
                <p className="text-sm text-muted-foreground">Loan Amount</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Collateral Required</p>
                <p className="font-semibold">{loan.collateral.toLocaleString()} BSK</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold">{loan.duration} weeks</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Weekly Payment</p>
                <p className="font-semibold">{loan.weeklyPayment.toLocaleString()} BSK</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Interest Rate</p>
                <p className="font-semibold">{loan.interestRate}%</p>
              </div>
            </div>

            <Button className="w-full">Apply for Loan</Button>
          </Card>
        ))}
      </div>
    </ProgramPageTemplate>
  )
}
