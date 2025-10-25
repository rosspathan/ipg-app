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
import { CryptoAssetCard } from "@/components/wallet/CryptoAssetCard"
import { PendingDepositsAlert } from "@/components/wallet/PendingDepositsAlert"
import { ManualDepositVerification } from "@/components/wallet/ManualDepositVerification"

interface BalanceClusterProps {
  className?: string
}

export function BalanceCluster({ className }: BalanceClusterProps) {
  const [isCryptoExpanded, setIsCryptoExpanded] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()
  const { user } = useAuthUser()

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
      await Promise.all([refetchCrypto(), refetchBsk()]);
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


  // Filter crypto assets (exclude BSK and INR, and show only non-zero balances)
  const filteredCryptoAssets = (cryptoBalances || [])
    .filter(asset => 
      asset.symbol !== 'BSK' && 
      asset.symbol !== 'INR' &&
      asset.network !== 'fiat' &&
      asset.network !== 'FIAT' &&
      asset.balance > 0  // Only show assets with balance
    )
    .filter(asset =>
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
    cryptoCount: filteredCryptoAssets.length,
    cryptoBalances: filteredCryptoAssets.map(a => ({ symbol: a.symbol, balance: a.balance }))
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
            {/* Pending Deposits Alert */}
            <PendingDepositsAlert />

            {/* Manual Deposit Verification */}
            <ManualDepositVerification />

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

            {/* Grid of crypto assets using CryptoAssetCard */}
            {cryptoLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Loading balances...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3">
                  {filteredCryptoAssets.map((asset) => (
                    <CryptoAssetCard
                      key={asset.symbol}
                      symbol={asset.symbol}
                      name={asset.name}
                      balance={Number(asset.balance)}
                      available={Number(asset.available)}
                      locked={Number(asset.locked)}
                      logoUrl={asset.logo_url}
                      network={asset.network || 'bsc'}
                      onSync={refetchCrypto}
                    />
                  ))}
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