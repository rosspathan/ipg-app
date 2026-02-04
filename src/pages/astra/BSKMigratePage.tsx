import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Zap, Shield, AlertTriangle, Check, ExternalLink, Loader2, Wallet, CheckCircle2, Info, ArrowRight, History, Clock, XCircle, RefreshCw } from "lucide-react"
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
import { useBSKMigration, MigrationHistoryItem, ReasonCode } from "@/hooks/useBSKMigration"
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

// Alert variant based on reason code
function getAlertVariant(reasonCode: ReasonCode): 'default' | 'destructive' {
  switch (reasonCode) {
    case 'MIGRATION_DISABLED':
    case 'WALLET_NOT_CONFIGURED':
    case 'PRIVATE_KEY_MISSING':
      return 'destructive';
    default:
      return 'default';
  }
}

// Whether to hide the amount input based on reason code
function shouldHideAmountInput(reasonCode: ReasonCode): boolean {
  return reasonCode === 'MIGRATION_DISABLED' || reasonCode === 'MAINTENANCE_MODE';
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
  const [refreshing, setRefreshing] = useState(false)

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
      } else {
        // Always go to input step - availability is checked separately
        setStep('input');
      }
    }
  }, [eligibility])

  const handleRetryCheck = async () => {
    setRefreshing(true)
    await checkEligibility()
    setRefreshing(false)
  }

  // Derived state
  const systemUnavailable = eligibility && !eligibility.system_available;
  const reasonCode = eligibility?.system_reason_code || 'OK';
  const systemMessage = eligibility?.system_message || 'Migration temporarily unavailable.';
  const hideAmountInput = systemUnavailable && shouldHideAmountInput(reasonCode);

  const gasEstimate = eligibility?.gas_estimate_bsk || 5
  const migrationFeePercent = eligibility?.migration_fee_percent || 5
  const amountNum = parseFloat(amount) || 0
  const migrationFee = Math.ceil(amountNum * migrationFeePercent / 100)
  const netAmount = Math.max(0, amountNum - gasEstimate - migrationFee)
  const minAmount = eligibility?.min_amount || 100
  const maxAmount = eligibility?.max_amount || eligibility?.withdrawable_balance || 0
  const isValidAmount = amountNum >= minAmount && amountNum <= maxAmount && netAmount > 0

  // Check if user has user-specific blockers (wallet, balance, etc)
  const userBlockers = eligibility?.reasons?.filter(r => r !== systemMessage) || [];
  const hasUserBlockers = userBlockers.length > 0;

  const handleMaxAmount = () => {
    if (eligibility) {
      setAmount(eligibility.max_amount?.toString() || eligibility.withdrawable_balance.toString())
    }
  }

  const handleProceed = () => {
    if (isValidAmount && !hasUserBlockers && !systemUnavailable) {
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

            {/* System Unavailable Alert with specific reason */}
            {systemUnavailable && (
              <Alert variant={getAlertVariant(reasonCode)} className="border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>
                    {reasonCode === 'MIGRATION_DISABLED' && 'Migration Disabled'}
                    {reasonCode === 'MAINTENANCE_MODE' && 'Maintenance Mode'}
                    {reasonCode === 'WALLET_NOT_CONFIGURED' && 'System Issue'}
                    {reasonCode === 'PRIVATE_KEY_MISSING' && 'System Issue'}
                    {reasonCode === 'RPC_DOWN' && 'Network Issue'}
                    {reasonCode === 'INSUFFICIENT_BSK' && 'Liquidity Issue'}
                    {reasonCode === 'INSUFFICIENT_BNB' && 'Gas Issue'}
                    {!['MIGRATION_DISABLED', 'MAINTENANCE_MODE', 'WALLET_NOT_CONFIGURED', 'PRIVATE_KEY_MISSING', 'RPC_DOWN', 'INSUFFICIENT_BSK', 'INSUFFICIENT_BNB'].includes(reasonCode) && 'Temporarily Unavailable'}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRetryCheck}
                    disabled={refreshing}
                    className="h-8 px-2"
                  >
                    <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                    <span className="ml-1">Retry</span>
                  </Button>
                </AlertTitle>
                <AlertDescription>
                  <p className="text-sm text-muted-foreground mt-1">
                    {systemMessage}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* User-specific Not Eligible Alert (show even if system unavailable for user to fix) */}
            {eligibility && hasUserBlockers && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cannot Migrate</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {userBlockers.map((reason, i) => (
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

            {/* Step: Input Amount - Show unless migration is globally disabled/maintenance */}
            {step === 'input' && eligibility && !hideAmountInput && (
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
                        disabled={systemUnavailable || hasUserBlockers}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMaxAmount}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-primary"
                        disabled={systemUnavailable || hasUserBlockers}
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
                  {eligibility.wallet_address && (
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
                  )}

                  <Button
                    onClick={handleProceed}
                    disabled={!isValidAmount || systemUnavailable || hasUserBlockers}
                    className="w-full h-12"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  {/* Show specific blocker message */}
                  {(systemUnavailable || hasUserBlockers) && !eligibility.has_pending_migration && (
                    <p className="text-sm text-destructive text-center mt-2">
                      {systemUnavailable ? systemMessage : userBlockers[0]}
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
                      disabled={!confirmed || !understands || migrating}
                      className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                    >
                      {migrating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Migrating...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Migrate Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step: Processing */}
            {step === 'processing' && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                      <div className="relative p-4 rounded-full bg-primary/10 border border-primary/20">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold">Processing Migration</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Your BSK is being migrated to the blockchain. This may take a few moments...
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      <Badge variant="secondary">Validating</Badge>
                      <Badge variant="secondary">Signing</Badge>
                      <Badge variant="secondary">Broadcasting</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step: Success */}
            {step === 'success' && result && (
              <Card className="border-success/30 bg-success/5">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 rounded-full bg-success/20 border border-success/30">
                      <CheckCircle2 className="h-10 w-10 text-success" />
                    </div>
                    <h3 className="text-xl font-bold text-success">Migration Successful!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your BSK has been migrated to the blockchain
                    </p>

                    <div className="w-full space-y-3 p-4 rounded-xl bg-background/50 text-left">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount Migrated</span>
                        <span className="font-bold">{result.net_amount.toLocaleString()} BSK</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Block Number</span>
                        <span className="font-mono">{result.block_number}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confirmations</span>
                        <span>{result.confirmations}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 w-full">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setStep('input')
                          setAmount('')
                          setConfirmed(false)
                          setUnderstands(false)
                          setResult(null)
                          checkEligibility()
                        }}
                        className="flex-1"
                      >
                        New Migration
                      </Button>
                      <Button 
                        onClick={handleViewTx}
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on BSCScan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Box */}
            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>What is On-Chain Migration?</strong></p>
                    <p>This feature converts your internal BSK balance to real BEP-20 tokens on Binance Smart Chain that you can hold in any wallet, trade on DEXs, or transfer freely.</p>
                    <p>A {migrationFeePercent}% fee and gas costs apply. This is a one-way process.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            {historyLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner label="Loading history..." />
              </div>
            ) : history.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Migration History</h3>
                  <p className="text-sm text-muted-foreground">
                    Your migration transactions will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {history.map((item) => (
                    <MigrationHistoryCard key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function MigrationHistoryCard({ item }: { item: MigrationHistoryItem }) {
  const config = statusConfig[item.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-lg">{item.amount_requested.toLocaleString()} BSK</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
          <Badge variant={config.variant} className="flex items-center gap-1">
            <StatusIcon className={cn("h-3 w-3", config.icon === Loader2 && "animate-spin")} />
            {config.label}
          </Badge>
        </div>

        {item.net_amount_migrated !== null && (
          <div className="text-sm space-y-1 mb-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Amount</span>
              <span className="font-medium">{item.net_amount_migrated.toLocaleString()} BSK</span>
            </div>
            {item.migration_fee_bsk !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee ({item.migration_fee_percent}%)</span>
                <span>{item.migration_fee_bsk.toLocaleString()} BSK</span>
              </div>
            )}
            {item.gas_deduction_bsk !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gas</span>
                <span>{item.gas_deduction_bsk} BSK</span>
              </div>
            )}
          </div>
        )}

        {item.error_message && (
          <p className="text-xs text-destructive mb-2">{item.error_message}</p>
        )}

        {item.tx_hash && (
          <a
            href={`https://bscscan.com/tx/${item.tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View Transaction
          </a>
        )}
      </CardContent>
    </Card>
  )
}

export default BSKMigratePage;
