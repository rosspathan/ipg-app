import * as React from "react"
import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Search, RefreshCw, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuthUser } from "@/hooks/useAuthUser"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AstraCard } from "../AstraCard"
import { BSKWithdrawableCard } from "./BSKWithdrawableCard"
import { BSKHoldingCard } from "./BSKHoldingCard"
import { useUserBalance } from "@/hooks/useUserBalance"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import AssetLogo from "@/components/AssetLogo"
import { useErc20OnchainBalance } from "@/hooks/useErc20OnchainBalance"

interface BalanceClusterProps {
  className?: string
}

export function BalanceCluster({ className }: BalanceClusterProps) {
  const [isCryptoExpanded, setIsCryptoExpanded] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [syncingAsset, setSyncingAsset] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuthUser()

  // Fetch USDT on-chain balance
  const usdtOnchain = useErc20OnchainBalance('USDT', 'bsc')

  // Fetch real crypto balances
  const { data: cryptoBalances, isLoading: cryptoLoading, refetch: refetchCrypto } = useUserBalance(undefined, true);

  // Fetch BSK balances
  const { data: bskBalance, refetch: refetchBsk } = useQuery({
    queryKey: ['user-bsk-balance'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_bsk_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Subscribe to real-time balance updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('wallet-balance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_balances',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[BalanceCluster] Balance updated:', payload);
          refetchCrypto();
          toast({
            title: "Balance Updated",
            description: "Your crypto balance has been updated",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchCrypto, toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchCrypto(), refetchBsk(), usdtOnchain.refetch()]);
      toast({
        title: "Balances Refreshed",
        description: "Your balances have been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh balances",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncFromBscScan = async (symbol: string) => {
    setSyncingAsset(symbol);
    try {
      // Step 1: Call discover-deposits
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const discoverResponse = await supabase.functions.invoke('discover-deposits', {
        body: { symbol, network: 'bsc', lookbackHours: 168 }
      })

      if (discoverResponse.error) throw discoverResponse.error

      const discoveryData = discoverResponse.data
      console.log('[BalanceCluster] Discovery result:', discoveryData)

      // Step 2: For each discovered deposit, call monitor-deposit
      if (discoveryData.deposits && discoveryData.deposits.length > 0) {
        for (const deposit of discoveryData.deposits) {
          try {
            await supabase.functions.invoke('monitor-deposit', {
              body: { deposit_id: deposit.id }
            })
          } catch (monitorError) {
            console.error('[BalanceCluster] Monitor deposit failed:', monitorError)
          }
        }
        
        toast({
          title: "Sync Complete",
          description: `Found ${discoveryData.created} new ${symbol} deposit(s). Processing confirmations...`,
        })
      } else {
        toast({
          title: "No New Deposits",
          description: `No new ${symbol} deposits found on BscScan`,
        })
      }

      // Refresh balances
      await refetchCrypto()
    } catch (error) {
      console.error('[BalanceCluster] Sync error:', error)
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync from BscScan",
        variant: "destructive",
      })
    } finally {
      setSyncingAsset(null)
    }
  };

  // Filter crypto assets (exclude BSK and INR)
  const baseCryptoAssets = (cryptoBalances || []).filter(asset => 
    asset.symbol !== 'BSK' && 
    asset.symbol !== 'INR' &&
    asset.network !== 'fiat' &&
    asset.network !== 'FIAT'
  );

  // Inject USDT placeholder if missing but on-chain balance exists
  const usdtPresent = baseCryptoAssets.some(a => a.symbol === 'USDT')
  const augmentedCryptoAssets = [...baseCryptoAssets]
  const usdtOnchainAmount = parseFloat(usdtOnchain.balance || '0')
  if (!usdtPresent && usdtOnchainAmount > 0) {
    augmentedCryptoAssets.unshift({
      symbol: 'USDT',
      name: 'Tether USD',
      balance: usdtOnchainAmount,
      available: 0,
      locked: 0,
      logo_url: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
      network: 'bsc'
    } as any)
  }

  const filteredCryptoAssets = augmentedCryptoAssets.filter(asset =>
    searchTerm ? 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) 
      : true
  );

  const withdrawable = Number(bskBalance?.withdrawable_balance || 0);
  const holding = Number(bskBalance?.holding_balance || 0);

  // Debug: verify which GRID BalanceCluster renders and values
  console.info('[BALANCE_CLUSTER_RENDER]', {
    variant: 'grid',
    withdrawable,
    holding,
    cryptoCount: augmentedCryptoAssets.length,
    cryptoBalances: augmentedCryptoAssets.map(a => ({ symbol: a.symbol, balance: a.balance }))
  });
  return (
    <div className={cn("space-y-4", className)} data-testid="balance-cluster">
      {/* Crypto Assets Grid - FIRST per spec */}
      <AstraCard variant="glass" className="p-4" data-testid="crypto-assets-grid">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-sm text-accent">Crypto Assets</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 w-6 p-0"
              title="Refresh balances"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsCryptoExpanded(!isCryptoExpanded)}
              className="h-6 w-6 p-0"
            >
              {isCryptoExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        
        {isCryptoExpanded && (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-background/50 border-border/40"
              />
            </div>

            {/* Grid of crypto assets */}
            {cryptoLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Loading balances...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {filteredCryptoAssets.map((asset) => {
                    const onchainBalance = asset.symbol === 'USDT' ? parseFloat(usdtOnchain.balance) : 0
                    const dbAvailable = Number(asset.available)
                    const needsSync = onchainBalance > dbAvailable + 0.000001
                    
                    return (
                      <div key={asset.symbol} className="flex items-center justify-between p-3 bg-card-secondary/40 rounded-xl hover:bg-card-secondary/60 transition-colors duration-[120ms]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm font-heading">{asset.symbol}</div>
                            <div className="text-xs text-muted-foreground">{asset.name}</div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-mono text-sm tabular-nums">
                            {Number(asset.balance).toFixed(6)} {asset.symbol}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>
                              <span className="text-success">Available: {dbAvailable.toFixed(6)}</span>
                              {Number(asset.locked) > 0 && (
                                <span className="ml-2 text-warning">Locked: {Number(asset.locked).toFixed(6)}</span>
                              )}
                            </div>
                            {asset.symbol === 'USDT' && !usdtOnchain.isLoading && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">On-chain: {onchainBalance.toFixed(6)}</span>
                              </div>
                            )}
                          </div>
                          {needsSync && asset.symbol === 'USDT' && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning/20 text-warning rounded text-xs">
                                <AlertCircle className="h-3 w-3" />
                                <span>Sync pending</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSyncFromBscScan('USDT')}
                                disabled={syncingAsset === 'USDT'}
                                className="h-6 text-xs px-2"
                              >
                                {syncingAsset === 'USDT' ? 'Syncing...' : 'Sync now'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {filteredCryptoAssets.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {searchTerm ? "No assets found matching your search" : "No crypto assets yet. Deposit to get started!"}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </AstraCard>

      {/* BSK Withdrawable - New Design */}
      <BSKWithdrawableCard balance={withdrawable} />

      {/* BSK Holding - New Design */}
      <BSKHoldingCard balance={holding} />
    </div>
  )
}