import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"
import { Banknote, Calendar, Percent, Clock } from "lucide-react"

export default function BSKLoansPageNew() {
  const navigate = useNavigate()

  const loanOptions = [
    {
      amount: "1,000 BSK",
      duration: "4 weeks",
      interest: "5%",
      weekly: "262.5 BSK"
    },
    {
      amount: "5,000 BSK",
      duration: "8 weeks",
      interest: "8%",
      weekly: "675 BSK"
    },
    {
      amount: "10,000 BSK",
      duration: "12 weeks",
      interest: "10%",
      weekly: "916.7 BSK"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Banknote className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">BSK Loans</h1>
          <p className="text-muted-foreground">Get instant BSK loans with flexible repayment</p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="mb-2">Coming Soon</Badge>
              <h3 className="text-xl font-bold">Loan Program Launching Soon</h3>
              <p className="text-muted-foreground">
                Access instant liquidity with our BSK lending platform
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Loan Options */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Available Loan Options</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {loanOptions.map((option, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-2xl text-primary">{option.amount}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Duration
                      </div>
                      <span className="font-medium">{option.duration}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Percent className="w-4 h-4" />
                        Interest
                      </div>
                      <span className="font-medium">{option.interest}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Weekly Payment
                      </div>
                      <span className="font-medium">{option.weekly}</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Instant Approval</h4>
                  <p className="text-sm text-muted-foreground">
                    Get approved and receive funds within minutes
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Percent className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Low Interest Rates</h4>
                  <p className="text-sm text-muted-foreground">
                    Competitive rates starting from 5% per term
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Flexible Terms</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose repayment periods from 4 to 12 weeks
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Auto-Deduction</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatic weekly payments from your balance
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How Loans Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  1
                </div>
                <div>
                  <h4 className="font-medium mb-1">Choose Loan Amount</h4>
                  <p className="text-sm text-muted-foreground">
                    Select the amount and repayment period that suits you
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">Instant Approval</h4>
                  <p className="text-sm text-muted-foreground">
                    Get approved instantly based on your account standing
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">Receive Funds</h4>
                  <p className="text-sm text-muted-foreground">
                    BSK is credited to your withdrawable balance immediately
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                  4
                </div>
                <div>
                  <h4 className="font-medium mb-1">Auto-Repayment</h4>
                  <p className="text-sm text-muted-foreground">
                    Weekly payments are automatically deducted from your balance
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
