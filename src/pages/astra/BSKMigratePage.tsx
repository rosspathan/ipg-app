import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Zap, Shield, AlertTriangle, Check, ExternalLink, Loader2, Wallet, CheckCircle2, Info, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useBSKMigration } from "@/hooks/useBSKMigration"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"

type MigrationStep = 'check' | 'input' | 'confirm' | 'processing' | 'success'

/**
 * BSKMigratePage - Premium on-chain migration flow
 * Converts internal BSK balance to real BEP-20 tokens
 */
export function BSKMigratePage() {
  const navigate = useNavigate()
  const { 
    loading, 
    eligibility, 
    migrating, 
    result,
    checkEligibility, 
    initiateMigration,
    setResult
  } = useBSKMigration()

  const [step, setStep] = useState<MigrationStep>('check')
  const [amount, setAmount] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [understands, setUnderstands] = useState(false)

  useEffect(() => {
    checkEligibility()
  }, [checkEligibility])

  useEffect(() => {
    if (eligibility && !eligibility.has_pending_migration) {
      setStep('input')
    }
  }, [eligibility])

  const gasEstimate = eligibility?.gas_estimate_bsk || 5
  const amountNum = parseFloat(amount) || 0
  const netAmount = Math.max(0, amountNum - gasEstimate)
  const isValidAmount = amountNum >= (eligibility?.min_amount || 100) && amountNum <= (eligibility?.withdrawable_balance || 0)

  const handleMaxAmount = () => {
    if (eligibility) {
      setAmount(eligibility.withdrawable_balance.toString())
    }
  }

  const handleProceed = () => {
    if (isValidAmount && eligibility?.eligible) {
      setStep('confirm')
    }
  }

  const handleMigrate = async () => {
    if (!confirmed || !understands) return
    setStep('processing')
    const res = await initiateMigration(amountNum)
    if (res) {
      setStep('success')
    } else {
      setStep('input')
    }
  }

  const handleViewTx = () => {
    if (result?.tx_hash) {
      window.open(`https://bscscan.com/tx/${result.tx_hash}`, '_blank')
    }
  }

  if (loading && !eligibility) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <LoadingSpinner label="Checking eligibility..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Migrate to On-Chain</h1>
            <p className="text-sm text-muted-foreground">Convert BSK to real blockchain tokens</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Premium Header Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardContent className="pt-6 relative">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-1">Upgrade to Real Crypto</h2>
                <p className="text-sm text-muted-foreground">
                  Convert your internal BSK balance to actual BEP-20 tokens on Binance Smart Chain
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Not Eligible Alert */}
        {eligibility && !eligibility.eligible && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Not Eligible</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {eligibility.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
              {!eligibility.wallet_linked && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => navigate('/app/settings/wallet')}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Link Wallet
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Migration */}
        {eligibility?.has_pending_migration && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="text-warning flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Migration In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You have a pending migration of{' '}
                <strong>{eligibility.pending_migration?.amount_requested} BSK</strong>
              </p>
              <Badge variant="outline">{eligibility.pending_migration?.status}</Badge>
            </CardContent>
          </Card>
        )}

        {/* Step: Input Amount */}
        {step === 'input' && eligibility?.eligible && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Amount</CardTitle>
              <CardDescription>
                How much BSK would you like to migrate?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Balance Display */}
              <div className="p-4 rounded-xl bg-muted/50 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Available Balance</span>
                  <span className="font-bold text-lg">{eligibility.withdrawable_balance.toLocaleString()} BSK</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label>Migration Amount</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min ${eligibility.min_amount} BSK`}
                    className="pr-20 text-lg h-14"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxAmount}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary"
                  >
                    MAX
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum: {eligibility.min_amount} BSK
                </p>
              </div>

              {/* Fee Breakdown */}
              {amountNum > 0 && (
                <div className="space-y-3 p-4 rounded-xl bg-muted/30 border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Migration Amount</span>
                    <span>{amountNum.toLocaleString()} BSK</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gas Fee (estimated)</span>
                    <span className="text-destructive">-{gasEstimate} BSK</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>You'll Receive</span>
                    <span className="text-primary">{netAmount.toLocaleString()} BSK</span>
                  </div>
                </div>
              )}

              {/* Destination */}
              <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Destination Wallet</p>
                    <p className="text-xs text-muted-foreground font-mono break-all mt-1">
                      {eligibility.wallet_address}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleProceed}
                disabled={!isValidAmount}
                className="w-full h-12"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <Card className="border-warning/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-warning" />
                Confirm Migration
              </CardTitle>
              <CardDescription>
                Please review carefully before proceeding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="space-y-4 p-4 rounded-xl bg-muted/50">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">{amountNum.toLocaleString()} BSK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gas Fee</span>
                  <span>~{gasEstimate} BSK</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>You'll Receive</span>
                  <span className="text-primary">{netAmount.toLocaleString()} BSK</span>
                </div>
              </div>

              {/* Warning */}
              <Alert variant="destructive" className="bg-destructive/5 border-destructive/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>This Action is Irreversible</AlertTitle>
                <AlertDescription className="text-sm">
                  Once migrated, BSK becomes real crypto on the blockchain. 
                  It cannot be converted back to internal balance.
                </AlertDescription>
              </Alert>

              {/* Confirmations */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="understand"
                    checked={understands}
                    onCheckedChange={(c) => setUnderstands(c === true)}
                  />
                  <label htmlFor="understand" className="text-sm leading-tight cursor-pointer">
                    I understand this migration is <strong>one-way and irreversible</strong>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="confirm"
                    checked={confirmed}
                    onCheckedChange={(c) => setConfirmed(c === true)}
                  />
                  <label htmlFor="confirm" className="text-sm leading-tight cursor-pointer">
                    I confirm the destination wallet <strong className="font-mono text-xs">{eligibility?.wallet_address?.slice(0, 10)}...{eligibility?.wallet_address?.slice(-8)}</strong> is correct
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('input')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleMigrate}
                  disabled={!confirmed || !understands}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Migrate Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Processing Migration</h3>
                  <p className="text-muted-foreground">
                    Your BSK is being transferred to the blockchain...
                  </p>
                </div>
                <div className="w-full max-w-xs space-y-2">
                  <MigrationProgressStep label="Validating" done />
                  <MigrationProgressStep label="Debiting Internal Balance" done={migrating} />
                  <MigrationProgressStep label="Signing Transaction" active={migrating} />
                  <MigrationProgressStep label="Broadcasting to BSC" />
                  <MigrationProgressStep label="Confirming" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Success */}
        {step === 'success' && result && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-success" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-success">Migration Complete!</h3>
                  <p className="text-muted-foreground">
                    Your BSK has been successfully transferred to your wallet
                  </p>
                </div>

                <div className="w-full space-y-3 p-4 rounded-xl bg-background border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Received</span>
                    <span className="font-bold text-success">{result.net_amount.toLocaleString()} BSK</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Block Number</span>
                    <span className="font-mono">{result.block_number}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Transaction</span>
                    <button
                      onClick={handleViewTx}
                      className="text-primary hover:underline flex items-center gap-1 font-mono text-xs"
                    >
                      {result.tx_hash.slice(0, 10)}...{result.tx_hash.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <Button
                    variant="outline"
                    onClick={handleViewTx}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on BSCScan
                  </Button>
                  <Button
                    onClick={() => navigate('/app')}
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        {(step === 'input' || step === 'check') && (
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">1</div>
                <div>
                  <p className="font-medium text-sm">Enter Amount</p>
                  <p className="text-xs text-muted-foreground">Choose how much BSK to convert</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">2</div>
                <div>
                  <p className="font-medium text-sm">Confirm & Migrate</p>
                  <p className="text-xs text-muted-foreground">Your internal balance is locked</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">3</div>
                <div>
                  <p className="font-medium text-sm">Receive On-Chain BSK</p>
                  <p className="text-xs text-muted-foreground">Real BEP-20 tokens in your wallet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Migrations */}
        {eligibility?.recent_migrations && eligibility.recent_migrations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Migrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {eligibility.recent_migrations.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{Number(m.net_amount_migrated || m.amount_requested).toLocaleString()} BSK</p>
                    <p className="text-xs text-muted-foreground">
                      {m.completed_at ? new Date(m.completed_at).toLocaleDateString() : 'Pending'}
                    </p>
                  </div>
                  <Badge 
                    variant={m.status === 'completed' ? 'default' : m.status === 'failed' ? 'destructive' : 'secondary'}
                  >
                    {m.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function MigrationProgressStep({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg transition-colors",
      done && "bg-success/10",
      active && "bg-primary/10"
    )}>
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center",
        done && "bg-success text-success-foreground",
        active && "bg-primary text-primary-foreground",
        !done && !active && "bg-muted"
      )}>
        {done ? (
          <Check className="h-3 w-3" />
        ) : active ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <span className={cn(
        "text-sm",
        done && "text-success",
        active && "text-primary font-medium",
        !done && !active && "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  )
}
