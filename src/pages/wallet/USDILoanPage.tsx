import { useState, useMemo } from "react"
import { ArrowLeft, Lock, Unlock, Info, AlertTriangle, CheckCircle2, Wallet, TrendingUp, Shield, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

/**
 * USDI Collateral Loan Page
 * - Lock 200% BSK collateral → receive 100% USDI
 * - 2% fee on loan creation, 2% fee on unlock/close
 * - Unlock anytime
 */
export function USDILoanPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"borrow" | "manage">("borrow")
  
  // Form state
  const [usdiAmount, setUsdiAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Mock data - will be replaced with real hooks
  const bskBalance = 50000 // User's BSK balance
  const bskPrice = 0.10 // BSK price in USDI
  const collateralRatio = 2.0 // 200%
  const loanFeePercent = 2 // 2%
  const unlockFeePercent = 2 // 2%
  
  // Mock active loan
  const [hasActiveLoan] = useState(false)
  const activeLoan = hasActiveLoan ? {
    id: "loan-001",
    lockedBsk: 20000,
    issuedUsdi: 1000,
    createdAt: "2024-01-15",
    status: "active"
  } : null

  // Calculations
  const calculations = useMemo(() => {
    const usdiValue = parseFloat(usdiAmount) || 0
    const requiredBsk = usdiValue / bskPrice * collateralRatio
    const loanFee = usdiValue * (loanFeePercent / 100)
    const netUsdi = usdiValue - loanFee
    const hasEnoughBsk = requiredBsk <= bskBalance
    
    return {
      usdiValue,
      requiredBsk,
      loanFee,
      netUsdi,
      hasEnoughBsk,
      bskValueUsd: requiredBsk * bskPrice
    }
  }, [usdiAmount, bskBalance, bskPrice, collateralRatio, loanFeePercent])

  const handleCreateLoan = async () => {
    if (!calculations.hasEnoughBsk || calculations.usdiValue <= 0) {
      toast.error("Invalid loan amount or insufficient BSK balance")
      return
    }
    
    setIsProcessing(true)
    
    // Simulate API call - replace with actual edge function
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    toast.success(`Loan created! ${calculations.netUsdi.toFixed(2)} USDI credited to your account`)
    setUsdiAmount("")
    setIsProcessing(false)
  }

  const handleUnlockLoan = async () => {
    if (!activeLoan) return
    
    setIsProcessing(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const unlockFee = activeLoan.issuedUsdi * (unlockFeePercent / 100)
    toast.success(`Loan closed! ${activeLoan.lockedBsk.toLocaleString()} BSK unlocked (${unlockFee.toFixed(2)} USDI fee deducted)`)
    setIsProcessing(false)
  }

  const setMaxBsk = () => {
    const maxUsdi = (bskBalance * bskPrice) / collateralRatio
    setUsdiAmount(maxUsdi.toFixed(2))
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">USDI Loan</h1>
            <p className="text-xs text-muted-foreground">Collateral-backed crypto loan</p>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
            Pool Active
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Info Banner */}
        <Card className="bg-gradient-to-br from-primary/10 via-card to-accent/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">How it works</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Lock <span className="text-primary font-medium">200% worth of BSK</span> as collateral 
                  and receive <span className="text-accent font-medium">100% equivalent USDI</span> instantly. 
                  A 2% fee applies when creating and closing your loan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 text-center">
              <Wallet className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{bskBalance.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Your BSK</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-accent" />
              <p className="text-lg font-bold">${bskPrice.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">BSK Price</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 text-center">
              <Lock className="w-4 h-4 mx-auto mb-1 text-warning" />
              <p className="text-lg font-bold">200%</p>
              <p className="text-[10px] text-muted-foreground">Collateral</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "borrow" | "manage")}>
          <TabsList className="w-full grid grid-cols-2 bg-muted/50">
            <TabsTrigger value="borrow" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Lock className="w-4 h-4 mr-2" />
              Borrow USDI
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Unlock className="w-4 h-4 mr-2" />
              Manage Loan
            </TabsTrigger>
          </TabsList>

          {/* Borrow Tab */}
          <TabsContent value="borrow" className="mt-4 space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Create New Loan</CardTitle>
                <CardDescription>Enter the USDI amount you want to borrow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="usdi-amount">USDI Amount</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={setMaxBsk}
                      className="h-6 px-2 text-xs text-primary"
                    >
                      MAX
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="usdi-amount"
                      type="number"
                      placeholder="0.00"
                      value={usdiAmount}
                      onChange={(e) => setUsdiAmount(e.target.value)}
                      className="pr-16 text-lg font-semibold h-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      USDI
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Calculation Preview */}
                <AnimatePresence mode="wait">
                  {calculations.usdiValue > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5" />
                          Required Collateral (200%)
                        </span>
                        <span className={`font-semibold ${calculations.hasEnoughBsk ? 'text-foreground' : 'text-destructive'}`}>
                          {calculations.requiredBsk.toLocaleString(undefined, { maximumFractionDigits: 2 })} BSK
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Coins className="w-3.5 h-3.5" />
                          Collateral Value
                        </span>
                        <span className="font-medium">
                          ${calculations.bskValueUsd.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" />
                          Loan Fee (2%)
                        </span>
                        <span className="text-warning font-medium">
                          -{calculations.loanFee.toFixed(2)} USDI
                        </span>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <span className="font-semibold">You Receive</span>
                        <span className="text-xl font-bold text-accent">
                          {calculations.netUsdi.toFixed(2)} USDI
                        </span>
                      </div>

                      {!calculations.hasEnoughBsk && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="text-xs text-destructive">
                            Insufficient BSK balance. You need {(calculations.requiredBsk - bskBalance).toLocaleString()} more BSK.
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  onClick={handleCreateLoan}
                  disabled={isProcessing || !calculations.hasEnoughBsk || calculations.usdiValue <= 0}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Lock className="w-4 h-4" />
                      </motion.div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Lock BSK & Get USDI
                    </span>
                  )}
                </Button>

                {/* Warning */}
                <p className="text-[10px] text-center text-muted-foreground">
                  By proceeding, you agree to lock your BSK as collateral. A 2% fee will be deducted from your USDI.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Tab */}
          <TabsContent value="manage" className="mt-4 space-y-4">
            {activeLoan ? (
              <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Active Loan</CardTitle>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Locked BSK</p>
                      <p className="text-lg font-bold text-primary">{activeLoan.lockedBsk.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Issued USDI</p>
                      <p className="text-lg font-bold text-accent">{activeLoan.issuedUsdi.toLocaleString()}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span>{activeLoan.createdAt}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Unlock Fee (2%)</span>
                      <span className="text-warning">{(activeLoan.issuedUsdi * 0.02).toFixed(2)} USDI</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">USDI to Repay</span>
                      <span className="font-semibold">{(activeLoan.issuedUsdi * 1.02).toFixed(2)} USDI</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleUnlockLoan}
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full h-12 border-primary/50 hover:bg-primary/10"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Unlock className="w-4 h-4" />
                        </motion.div>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Unlock className="w-4 h-4" />
                        Repay & Unlock Collateral
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-muted-foreground/30">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No Active Loans</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You don't have any active loans. Create a new loan to get started.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("borrow")}
                  >
                    Create Your First Loan
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Loan History Placeholder */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Loan History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground text-center py-4">
                  No previous loans found
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Terms & Info */}
        <Card className="bg-muted/20 border-border/30">
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Important Information
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Collateral Ratio: 200% - Lock 2x the value of USDI you borrow</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Loan Fee: 2% deducted from the USDI amount at creation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Unlock Fee: 2% of the original USDI amount when closing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>You can unlock and close your loan at any time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Your BSK collateral is securely locked until loan closure</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
