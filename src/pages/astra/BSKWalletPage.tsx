import { BSKBalanceViewer } from "@/components/bsk/BSKBalanceViewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Wallet, TrendingUp, Clock, Gift, History } from "lucide-react"
import { useNavigate } from "react-router-dom"

/**
 * BSKWalletPage - Dedicated BSK balance and management page
 * Phase 3: Astra BSK integration
 */
export function BSKWalletPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          BSK Wallet
        </h1>
        <p className="text-muted-foreground">
          Manage your Bonos Stellar Krypto rewards and transactions
        </p>
      </div>

      {/* Balance Viewer */}
      <BSKBalanceViewer />

      {/* View History Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate("/app/programs/bsk/history")}
      >
        <History className="w-4 h-4 mr-2" />
        View Complete Transaction History
      </Button>

      {/* Quick Actions */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4 gap-2"
            onClick={() => navigate("/app/programs/staking")}
          >
            <Gift className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-semibold">Earn BSK</p>
              <p className="text-xs text-muted-foreground">Staking</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4 gap-2"
            onClick={() => navigate("/app/programs/bsk-bonus")}
          >
            <TrendingUp className="h-5 w-5 text-accent" />
            <div className="text-left">
              <p className="font-semibold">Bonuses</p>
              <p className="text-xs text-muted-foreground">Purchase BSK</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4 gap-2"
            onClick={() => navigate("/app/programs/staking")}
          >
            <Clock className="h-5 w-5 text-success" />
            <div className="text-left">
              <p className="font-semibold">Staking</p>
              <p className="text-xs text-muted-foreground">Earn APY</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4 gap-2"
            onClick={() => navigate("/app/programs")}
          >
            <ArrowRight className="h-5 w-5 text-secondary" />
            <div className="text-left">
              <p className="font-semibold">More</p>
              <p className="text-xs text-muted-foreground">All Programs</p>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              About BSK
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              BSK (Bonos Stellar Krypto) is our platform's reward token used across all programs.
            </p>
            <p>
              Earn BSK through referrals, staking, and other activities. Use it for trading fees, insurance premiums, and more.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Balance Types
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Withdrawable:</strong> Available for immediate use or withdrawal
            </p>
            <p>
              <strong>Holding:</strong> Locked BSK from promotions with vesting schedules
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
