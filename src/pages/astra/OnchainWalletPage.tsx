import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { ExternalLink, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useAuthUser } from "@/hooks/useAuthUser"
import { getStoredEvmAddress, getExplorerUrl, formatAddress, storeEvmAddress } from "@/lib/wallet/evmAddress"
import { useBep20Balances } from "@/hooks/useBep20Balances"
import { supabase } from "@/integrations/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { OnchainTokenCard, OnchainTokenCardSkeleton } from "@/components/wallet/OnchainTokenCard"
import { Skeleton } from "@/components/ui/skeleton"

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function OnchainWalletPage() {
  const { user } = useAuthUser()
  const [deposits, setDeposits] = useState<any[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const autoSyncTriggered = useRef(false)

  // Use new hook for all BEP20 balances
  const { balances, isLoading: balancesLoading, refetch: refetchBalances, walletAddress } = useBep20Balances()

  // Auto-sync on page load if last sync was > 5 minutes ago
  useEffect(() => {
    if (!user?.id || !walletAddress || autoSyncTriggered.current) return

    const lastSyncKey = `last_deposit_sync_${user.id}`
    const lastSync = localStorage.getItem(lastSyncKey)
    const now = Date.now()

    if (!lastSync || now - parseInt(lastSync) > AUTO_SYNC_INTERVAL_MS) {
      autoSyncTriggered.current = true
      // Auto-sync in background without blocking UI
      handleDiscoverAndCredit(true).then(() => {
        localStorage.setItem(lastSyncKey, now.toString())
      })
    }
  }, [user?.id, walletAddress])

  // Persist wallet address to profile on load
  useEffect(() => {
    const persistAddress = async () => {
      if (!user?.id || !walletAddress) return
      try {
        await storeEvmAddress(user.id, walletAddress)
      } catch (err) {
        console.warn('[OnchainWalletPage] Failed to persist wallet address:', err)
      }
    }
    persistAddress()
  }, [user?.id, walletAddress])

  // Fetch recent deposits (all BEP20 tokens)
  const fetchDeposits = async () => {
    if (!user?.id) return
    try {
      const { data } = await supabase
        .from('deposits')
        .select(`
          id,
          amount,
          tx_hash,
          status,
          confirmations,
          required_confirmations,
          created_at,
          assets(symbol, name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setDeposits(data)
      }
    } catch (error) {
      console.error('Error fetching deposits:', error)
    }
  }

  useEffect(() => {
    fetchDeposits()
  }, [user?.id])

  // Discover and credit deposits for all BEP20 tokens
  const handleDiscoverAndCredit = async (silent = false) => {
    if (!user?.id) {
      if (!silent) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to sync deposits",
          variant: "destructive"
        })
      }
      return
    }

    setDiscovering(true)
    try {
      // Ensure wallet address is persisted
      if (walletAddress) {
        try {
          await storeEvmAddress(user.id, walletAddress)
        } catch (persistErr) {
          console.warn('[OnchainWalletPage] Persist-before-discover failed:', persistErr)
        }
      }

      // Discover deposits for all tokens (USDT, IPG, BNB)
      const tokensToSync = ['USDT', 'IPG']
      let totalDiscovered = 0
      let totalCreated = 0

      for (const symbol of tokensToSync) {
        try {
          const { data: discoverData, error: discoverError } = await supabase.functions.invoke('discover-deposits', {
            body: {
              symbol,
              network: 'bsc',
              lookbackHours: 168
            }
          })

          if (discoverError) {
            console.warn(`Error discovering ${symbol}:`, discoverError)
            continue
          }

          const discovered = discoverData?.deposits || []
          totalDiscovered += discoverData?.discovered || 0
          totalCreated += discovered.length

          // Monitor each new deposit
          for (const dep of discovered) {
            try {
              const id = dep.deposit_id || dep.id
              if (id) {
                await supabase.functions.invoke('monitor-deposit', { body: { deposit_id: id } })
              }
            } catch (err) {
              console.error('monitor-deposit error:', err)
            }
          }
        } catch (err) {
          console.warn(`Failed to discover ${symbol}:`, err)
        }
      }

      await Promise.all([fetchDeposits(), refetchBalances()])

      if (!silent) {
        toast({
          title: "Sync Complete",
          description: `Found ${totalDiscovered} transfers, processed ${totalCreated} deposits`,
        })
      }
    } catch (error: any) {
      console.error('Error discovering deposits:', error)
      setDebugInfo((prev: any) => ({ ...prev, lastError: error.message || String(error) }))
      if (!silent) {
        toast({ title: "Sync Failed", description: error.message || 'Failed to discover deposits', variant: 'destructive' })
      }
    } finally {
      setDiscovering(false)
    }
  }

  const totalOnchain = balances.reduce((sum, b) => sum + b.onchainBalance, 0)
  const totalApp = balances.reduce((sum, b) => sum + b.appBalance, 0)
  const syncNeeded = balances.some(b => b.onchainBalance > b.appBalance + 0.01)

  return (
    <div className="space-y-6 p-4" data-testid="onchain-wallet-page">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">On-chain Wallet (BSC)</h1>
        <p className="text-sm text-muted-foreground">
          View live balances and sync deposits from the Binance Smart Chain
        </p>
      </div>

      {/* Address Panel */}
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Your BSC Address</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(getExplorerUrl(walletAddress || '', 'bsc'), '_blank')}
            disabled={!walletAddress}
            className="h-7 px-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
        {walletAddress ? (
          <div className="bg-muted/40 rounded-lg p-3 border border-border/40">
            <p className="font-mono text-xs break-all text-foreground/90">
              {walletAddress}
            </p>
          </div>
        ) : (
          <Skeleton className="h-12 w-full" />
        )}
      </div>

      {/* Sync Alert */}
      {syncNeeded && (
        <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-warning-foreground">
              Sync Required
            </p>
            <p className="text-xs text-warning-foreground/80">
              Some on-chain balances are higher than your app balances. Click below to discover and credit pending deposits.
            </p>
          </div>
        </div>
      )}

      {/* Sync Button */}
      <Button
        onClick={() => handleDiscoverAndCredit(false)}
        disabled={discovering || !walletAddress}
        className="w-full"
        size="lg"
      >
        {discovering ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Syncing All Tokens...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync / Discover & Credit All
          </>
        )}
      </Button>

      {/* Token Balances */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Token Balances</h2>
        {balancesLoading ? (
          <>
            <OnchainTokenCardSkeleton />
            <OnchainTokenCardSkeleton />
            <OnchainTokenCardSkeleton />
          </>
        ) : balances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No BEP20 tokens configured</p>
          </div>
        ) : (
          balances.map((token) => (
            <OnchainTokenCard
              key={token.assetId}
              symbol={token.symbol}
              name={token.name}
              logoUrl={token.logoUrl || undefined}
              onchainBalance={token.onchainBalance}
              appBalance={token.appBalance}
              isLoading={false}
              onRefresh={refetchBalances}
            />
          ))
        )}
      </div>

      {/* Recent Deposits */}
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Recent Deposits</h3>
        {deposits.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-muted-foreground">No deposits found</p>
            <p className="text-xs text-muted-foreground">
              Run discovery to scan the blockchain for your deposits
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border/40"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-foreground">
                      {formatAddress(deposit.tx_hash, 8, 6)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://bscscan.com/tx/${deposit.tx_hash}`, '_blank')}
                      className="h-5 w-5 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      deposit.status === 'completed' ? 'default' :
                      deposit.status === 'pending' ? 'secondary' :
                      'destructive'
                    }>
                      {deposit.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {deposit.assets?.symbol || 'Unknown'}
                    </span>
                    {deposit.status === 'pending' && (
                      <span className="text-xs text-muted-foreground">
                        {deposit.confirmations}/{deposit.required_confirmations} confirms
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold text-foreground">+{deposit.amount}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(deposit.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Panel */}
      <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            {debugOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            Debug Info
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-4">
            <pre className="text-xs font-mono overflow-auto">
              {JSON.stringify({
                address: walletAddress,
                tokensTracked: balances.length,
                totalOnchain,
                totalApp,
                syncNeeded,
                lastError: debugInfo.lastError
              }, null, 2)}
            </pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
