import * as React from "react"
import { useState } from "react"
import { ChevronDown, ChevronUp, Search } from "lucide-react"
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

interface BalanceClusterProps {
  className?: string
}

export function BalanceCluster({ className }: BalanceClusterProps) {
  const [isCryptoExpanded, setIsCryptoExpanded] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch real crypto balances
  const { data: cryptoBalances, isLoading: cryptoLoading } = useUserBalance(undefined, true);

  // Fetch BSK balances
  const { data: bskBalance } = useQuery({
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

  // Filter crypto assets (exclude BSK and INR)
  const cryptoAssets = (cryptoBalances || []).filter(asset => 
    asset.symbol !== 'BSK' && 
    asset.symbol !== 'INR' &&
    asset.network !== 'fiat' &&
    asset.network !== 'FIAT'
  );

  const filteredCryptoAssets = cryptoAssets.filter(asset =>
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
    cryptoCount: cryptoAssets.length,
    cryptoBalances: cryptoAssets.map(a => ({ symbol: a.symbol, balance: a.balance }))
  });
  return (
    <div className={cn("space-y-4", className)} data-testid="balance-cluster">
      {/* Crypto Assets Grid - FIRST per spec */}
      <AstraCard variant="glass" className="p-4" data-testid="crypto-assets-grid">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-sm text-accent">Crypto Assets</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCryptoExpanded(!isCryptoExpanded)}
            className="h-6 w-6 p-0"
          >
            {isCryptoExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
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
                  {filteredCryptoAssets.map((asset) => (
                    <div key={asset.symbol} className="flex items-center justify-between p-3 bg-card-secondary/40 rounded-xl hover:bg-card-secondary/60 transition-colors duration-[120ms] cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm font-heading">{asset.symbol}</div>
                          <div className="text-xs text-muted-foreground">{asset.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm tabular-nums">
                          {Number(asset.balance).toFixed(6)} {asset.symbol}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="text-success">Available: {Number(asset.available).toFixed(6)}</span>
                          {Number(asset.locked) > 0 && (
                            <span className="ml-2 text-warning">Locked: {Number(asset.locked).toFixed(6)}</span>
                          )}
                        </div>
                      </div>
                    </div>
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