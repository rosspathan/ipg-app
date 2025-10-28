import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BalanceReconciliationAlertProps {
  assetSymbol: string
  appBalance: number
  onchainBalance: number
  onSync: () => void
  isSyncing?: boolean
}

/**
 * Alert component that warns users when on-chain balance differs from app balance
 * Used to detect and fix balance discrepancies
 */
export function BalanceReconciliationAlert({
  assetSymbol,
  appBalance,
  onchainBalance,
  onSync,
  isSyncing = false
}: BalanceReconciliationAlertProps) {
  const difference = Math.abs(onchainBalance - appBalance)
  const percentDiff = appBalance > 0 ? (difference / appBalance) * 100 : 100
  
  // Only show alert if difference is significant (>10% or >1 token)
  const shouldShow = difference > 1 || percentDiff > 10
  
  if (!shouldShow) return null

  const isAppHigher = appBalance > onchainBalance
  
  return (
    <Alert variant="destructive" className="border-warning bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning-foreground">Balance Mismatch Detected</AlertTitle>
      <AlertDescription className="space-y-3">
        <div className="text-sm text-warning-foreground/90">
          <p className="font-medium mb-1">
            Your {assetSymbol} balance doesn't match on-chain records:
          </p>
          <div className="space-y-1 font-mono text-xs">
            <p>App Balance: {appBalance.toFixed(6)} {assetSymbol}</p>
            <p>On-Chain: {onchainBalance.toFixed(6)} {assetSymbol}</p>
            <p className="text-warning font-semibold">
              Difference: {isAppHigher ? '+' : '-'}{difference.toFixed(6)} {assetSymbol}
            </p>
          </div>
        </div>
        
        {isAppHigher && (
          <p className="text-xs text-warning-foreground/80">
            ⚠️ Your app shows more {assetSymbol} than you actually have on-chain. 
            This may be due to completed withdrawals that weren't properly deducted.
          </p>
        )}
        
        {!isAppHigher && (
          <p className="text-xs text-warning-foreground/80">
            You have uncredited {assetSymbol} on-chain. Click sync to credit your balance.
          </p>
        )}
        
        <Button
          onClick={onSync}
          disabled={isSyncing}
          size="sm"
          variant="outline"
          className="w-full border-warning hover:bg-warning/20"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Sync Balance
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
