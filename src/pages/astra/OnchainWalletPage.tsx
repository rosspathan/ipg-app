import * as React from "react"
import { useState, useEffect } from "react"
import { ExternalLink, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useAuthUser } from "@/hooks/useAuthUser"
import { getStoredEvmAddress, getExplorerUrl, formatAddress } from "@/lib/wallet/evmAddress"
import { useErc20OnchainBalance } from "@/hooks/useErc20OnchainBalance"
import { supabase } from "@/integrations/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function OnchainWalletPage() {
  const { user } = useAuthUser()
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [deposits, setDeposits] = useState<any[]>([])
  const [appBalance, setAppBalance] = useState<number>(0)
  const [assetId, setAssetId] = useState<string | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})

  // Fetch on-chain USDT balance
  const { balance: onchainBalance, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useErc20OnchainBalance('USDT', 'bsc')

  // Fetch wallet address
  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (!user?.id) return
      try {
        const addr = await getStoredEvmAddress(user.id)
        if (addr) {
          setWalletAddress(addr)
          setDebugInfo((prev: any) => ({ ...prev, address: addr }))
        }
      } catch (error) {
        console.error('Error fetching wallet address:', error)
      }
    }
    fetchWalletAddress()
  }, [user?.id])

  // Fetch app balance from wallet_balances
  useEffect(() => {
    const fetchAppBalance = async () => {
      if (!user?.id) return
      try {
        const { data: asset } = await supabase
          .from('assets')
          .select('id')
          .ilike('symbol', 'USDT')
          .or('network.ilike.%bep20%,network.ilike.%bsc%')
          .maybeSingle()

        if (asset) {
          setAssetId(asset.id)
          const { data: balance } = await supabase
            .from('wallet_balances')
            .select('available, locked')
            .eq('user_id', user.id)
            .eq('asset_id', asset.id)
            .maybeSingle()

          if (balance) {
            setAppBalance((balance.available || 0) + (balance.locked || 0))
          }
        }
      } catch (error) {
        console.error('Error fetching app balance:', error)
      }
    }
    fetchAppBalance()
  }, [user?.id])

  // Realtime: update app balance when wallet_balances changes
  useEffect(() => {
    if (!user?.id || !assetId) return
    const channel = supabase
      .channel('wallet-balances-usdt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallet_balances',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const row: any = payload.new
        if (row?.asset_id === assetId) {
          setAppBalance((row.available || 0) + (row.locked || 0))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, assetId])

  // Discover and credit USDT deposits
  const handleDiscoverAndCredit = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to sync deposits",
        variant: "destructive"
      })
      return
    }

    setDiscovering(true)
    try {
      const { data: discoverData, error: discoverError } = await supabase.functions.invoke('discover-deposits', {
        body: {
          symbol: 'USDT',
          network: 'bsc',
          lookbackHours: 168
        }
      })
      if (discoverError) throw discoverError

      const discovered = discoverData?.deposits || []
      toast({
        title: "Discovery Complete",
        description: `Found ${discoverData?.discovered || 0} transfers, created ${discovered.length} new deposits`,
      })

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

      await Promise.all([fetchDeposits(), refetchBalance()])

      // Refresh app balance if we know assetId
      if (assetId) {
        const { data: balance } = await supabase
          .from('wallet_balances')
          .select('available, locked')
          .eq('user_id', user.id)
          .eq('asset_id', assetId)
          .maybeSingle()
        if (balance) setAppBalance((balance.available || 0) + (balance.locked || 0))
      }

      if (discovered.length > 0) {
        toast({ title: "Sync Complete", description: `Processed ${discovered.length} deposits. Balances updated.` })
      }
    } catch (error: any) {
      console.error('Error discovering deposits:', error)
      setDebugInfo((prev: any) => ({ ...prev, lastError: error.message || String(error) }))
      toast({ title: "Sync Failed", description: error.message || 'Failed to discover deposits', variant: 'destructive' })
    } finally {
      setDiscovering(false)
    }
  }

  const onchainAmount = parseFloat(onchainBalance || '0')
  const syncNeeded = onchainAmount > appBalance + 0.01 // Small threshold

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
            onClick={() => window.open(getExplorerUrl(walletAddress, 'bsc'), '_blank')}
            disabled={!walletAddress}
            className="h-7 px-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="bg-muted/40 rounded-lg p-3 border border-border/40">
          <p className="font-mono text-xs break-all text-foreground/90">
            {walletAddress || 'No wallet connected'}
          </p>
        </div>
      </div>

      {/* USDT Balance Card */}
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://assets.coingecko.com/coins/images/325/large/Tether.png"
              alt="USDT"
              className="w-8 h-8 rounded-full"
            />
            <div>
              <h3 className="font-semibold text-foreground">USDT (BEP20)</h3>
              <p className="text-xs text-muted-foreground">Tether USD</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetchBalance}
            disabled={balanceLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${balanceLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">On-chain Balance</p>
            <p className="text-2xl font-bold text-foreground">
              {balanceLoading ? '...' : onchainAmount.toFixed(4)}
            </p>
            {balanceError && (
              <p className="text-xs text-destructive">Error loading</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">App Balance</p>
            <p className="text-2xl font-bold text-green-600">
              {appBalance.toFixed(4)}
            </p>
          </div>
        </div>

        {syncNeeded && (
          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-warning-foreground">
                Sync Required
              </p>
              <p className="text-xs text-warning-foreground/80">
                Your on-chain balance is higher than your app balance. Click below to discover and credit pending deposits.
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={handleDiscoverAndCredit}
          disabled={discovering || !walletAddress}
          className="w-full"
          size="lg"
        >
          {discovering ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync / Discover & Credit
            </>
          )}
        </Button>
      </div>

      {/* Recent Deposits */}
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Recent USDT Deposits</h3>
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
                contract: '0x55d398326f99059fF775485246999027B3197955',
                decimals: 18,
                onchainBalance,
                appBalance,
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
