import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Zap, Shield, AlertTriangle, Check, ExternalLink, Loader2, Wallet, CheckCircle2, Info, ArrowRight, History, Clock, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useBSKMigration, MigrationHistoryItem } from "@/hooks/useBSKMigration"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

type MigrationStep = 'check' | 'input' | 'confirm' | 'processing' | 'success'

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  validating: { label: 'Validating', variant: 'secondary', icon: Loader2 },
  debiting: { label: 'Debiting', variant: 'secondary', icon: Loader2 },
  signing: { label: 'Signing', variant: 'secondary', icon: Loader2 },
  broadcasting: { label: 'Broadcasting', variant: 'secondary', icon: Loader2 },
  confirming: { label: 'Confirming', variant: 'secondary', icon: Loader2 },
  completed: { label: 'Completed', variant: 'default', icon: CheckCircle2 },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
  rolled_back: { label: 'Refunded', variant: 'outline', icon: ArrowLeft },
}

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
    history,
    historyLoading,
    checkEligibility, 
    initiateMigration,
    fetchHistory,
    setResult
  } = useBSKMigration()

  const [step, setStep] = useState<MigrationStep>('check')
  const [amount, setAmount] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [understands, setUnderstands] = useState(false)
  const [activeTab, setActiveTab] = useState('migrate')

  useEffect(() => {
    checkEligibility()
    fetchHistory()
  }, [checkEligibility, fetchHistory])

  useEffect(() => {
    if (eligibility) {
      // Check for in-progress migration and resume stepper
      if (eligibility.has_pending_migration && eligibility.pending_migration) {
        const pendingStatus = eligibility.pending_migration.status;
        if (['validating', 'debiting', 'signing', 'broadcasting', 'confirming'].includes(pendingStatus)) {
          setStep('processing');
        }
      } else if (eligibility.eligible || eligibility.system_available) {
        setStep('input');
      }
    }
  }, [eligibility])

  // Check if system is unavailable
  const systemUnavailable = eligibility && !eligibility.system_available;

  const gasEstimate = eligibility?.gas_estimate_bsk || 5
  const migrationFeePercent = eligibility?.migration_fee_percent || 5
  const amountNum = parseFloat(amount) || 0
  // Use same calculation as server for consistency
  const migrationFee = Math.ceil(amountNum * migrationFeePercent / 100)
  const netAmount = Math.max(0, amountNum - gasEstimate - migrationFee)
  const minAmount = eligibility?.min_amount || 100
  const maxAmount = eligibility?.max_amount || eligibility?.withdrawable_balance || 0
  const isValidAmount = amountNum >= minAmount && amountNum <= maxAmount && netAmount > 0

  const handleMaxAmount = () => {
    if (eligibility) {
      // Use the max_amount which accounts for fees
      setAmount(eligibility.max_amount?.toString() || eligibility.withdrawable_balance.toString())
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
            onClick={() => navigate('/app/home')}
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

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="migrate" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Migrate
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Migrate Tab */}
          <TabsContent value="migrate" className="space-y-6 mt-4">
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

            {/* System Unavailable Alert */}
            {systemUnavailable && (
              <Alert className="border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Migration Temporarily Unavailable</AlertTitle>
                <AlertDescription>
                  <p className="text-sm text-muted-foreground mt-1">
                    The migration service is currently undergoing maintenance. Please try again later.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Not Eligible Alert (only show if system is available) */}
            {eligibility && !eligibility.eligible && !systemUnavailable && (
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
            {step === 'input' && eligibility && !systemUnavailable && (
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
                        <span className="text-muted-foreground">Migration Fee ({migrationFeePercent}%)</span>
                        <span className="text-destructive">-{migrationFee.toLocaleString()} BSK</span>
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
                    disabled={!isValidAmount || !eligibility?.eligible}
                    className="w-full h-12"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  {!eligibility?.eligible && eligibility?.reasons && eligibility.reasons.length > 0 && (
                    <p className="text-sm text-destructive text-center mt-2">
                      {eligibility.reasons[0]}
                    </p>
                  )}
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
                      <span className="text-muted-foreground">Migration Fee ({migrationFeePercent}%)</span>
                      <span>-{migrationFee.toLocaleString()} BSK</span>
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
                        onClick={() => {
                          setActiveTab('history')
                          fetchHistory()
                        }}
                        className="flex-1"
                      >
                        View History
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
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Migration History
                    </CardTitle>
                    <CardDescription>
                      All your on-chain migration transactions
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchHistory}
                    disabled={historyLoading}
                  >
                    {historyLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 rotate-45" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading && history.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner label="Loading history..." />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No migrations yet</p>
                    <Button 
                      variant="link" 
                      onClick={() => setActiveTab('migrate')}
                      className="mt-2"
                    >
                      Start your first migration
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {history.map((item) => (
                        <MigrationHistoryCard key={item.id} item={item} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

function MigrationHistoryCard({ item }: { item: MigrationHistoryItem }) {
  const config = statusConfig[item.status] || statusConfig.pending
  const StatusIcon = config.icon

  const handleViewTx = () => {
    if (item.tx_hash) {
      window.open(`https://bscscan.com/tx/${item.tx_hash}`, '_blank')
    }
  }

  return (
    <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className="flex items-center gap-1">
            <StatusIcon className={cn("h-3 w-3", item.status !== 'completed' && item.status !== 'failed' && item.status !== 'rolled_back' && "animate-spin")} />
            {config.label}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Amount Requested</span>
          <span className="font-semibold">{Number(item.amount_requested).toLocaleString()} BSK</span>
        </div>
        
        {item.net_amount_migrated && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Net Received</span>
            <span className="font-semibold text-success">{Number(item.net_amount_migrated).toLocaleString()} BSK</span>
          </div>
        )}

        {item.migration_fee_bsk != null && item.migration_fee_bsk > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Migration Fee ({item.migration_fee_percent || 5}%)</span>
            <span className="text-sm text-destructive">-{Number(item.migration_fee_bsk).toFixed(2)} BSK</span>
          </div>
        )}

        {item.gas_deduction_bsk && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Gas Fee</span>
            <span className="text-sm text-destructive">-{Number(item.gas_deduction_bsk).toFixed(2)} BSK</span>
          </div>
        )}

        <Separator className="my-2" />

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Wallet</span>
          <span className="font-mono text-xs text-muted-foreground">
            {item.wallet_address.slice(0, 8)}...{item.wallet_address.slice(-6)}
          </span>
        </div>

        {item.tx_hash && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">TX Hash</span>
            <button
              onClick={handleViewTx}
              className="text-primary hover:underline flex items-center gap-1 font-mono text-xs"
            >
              {item.tx_hash.slice(0, 8)}...{item.tx_hash.slice(-6)}
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}

        {item.block_number && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Block</span>
            <span className="font-mono text-xs">{item.block_number}</span>
          </div>
        )}

        {item.error_message && (
          <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive">{item.error_message}</p>
          </div>
        )}

        {(item as any).refunded_at && (
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-muted-foreground">Refunded</span>
            <span className="text-xs text-success">
              {format(new Date((item as any).refunded_at), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
        )}

        {item.completed_at && (
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-muted-foreground">Completed</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(item.completed_at), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
