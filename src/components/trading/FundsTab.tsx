import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Loader2, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { SyncStatusBadge, BalanceExplainer } from '@/components/wallet/SyncStatusBadge';

interface AssetBalance {
  symbol: string;
  name?: string;
  balance: number;
  available: number;
  locked: number;
  logo_url?: string;
  usd_value?: number;
  onchainBalance?: number;
  appBalance?: number;
  appAvailable?: number;
  appLocked?: number;
}

interface FundsTabProps {
  balances: AssetBalance[];
  loading?: boolean;
}

export const FundsTab: React.FC<FundsTabProps> = ({ balances, loading }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  // Filter to show assets with either on-chain or trading balance
  const assetsWithBalance = balances?.filter(b => {
    const network = (b as any).network?.toLowerCase();
    const hasOnchain = (b.onchainBalance || 0) > 0;
    const hasTrading = (b.appAvailable || b.available || 0) > 0 || (b.appLocked || b.locked || 0) > 0;
    return (hasOnchain || hasTrading) && network !== 'fiat';
  }) || [];
  
  // Calculate total portfolio USD value
  const totalUsdValue = assetsWithBalance.reduce((sum, b) => sum + (b.usd_value || 0), 0);

  // Check if any asset has unsynced on-chain balance
  const hasUnsyncedBalance = assetsWithBalance.some(b => {
    const onchain = b.onchainBalance || 0;
    const trading = b.appAvailable ?? b.available ?? 0;
    return onchain > 0 && trading < onchain;
  });

  const handleSyncToTrading = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-onchain-to-trading', {
        body: {}
      });

      if (error) {
        toast.error('Sync failed', { description: error.message });
        return;
      }

      if (!data?.success) {
        toast.error('Sync failed', { description: data?.error || 'Unknown error' });
        return;
      }

      // Show results
      const synced = data.results?.filter((r: any) => r.synced && r.message.includes('Added')) || [];
      if (synced.length > 0) {
        const summary = synced.map((r: any) => `${r.symbol}: ${r.message}`).join('\n');
        toast.success(`Synced ${synced.length} asset(s)`, { description: summary });
      } else {
        toast.info('Balances already synced');
      }

      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ['bep20-balances'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
    } catch (err: any) {
      toast.error('Sync failed', { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Loading balances...
      </div>
    );
  }

  if (assetsWithBalance.length === 0) {
    return (
      <div className="text-center py-8">
        <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm mb-4">No crypto holdings yet</p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/app/wallet/deposit')}
        >
          Deposit Crypto
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sync Banner - Show when on-chain > trading */}
      {hasUnsyncedBalance && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SyncStatusBadge status="needs_sync" showTooltip={false} />
              <span className="text-xs text-muted-foreground">
                New deposits detected
              </span>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={handleSyncToTrading}
              disabled={syncing}
              className="h-7 text-xs"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Total Portfolio Value */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span>Your Balance</span>
          <BalanceExplainer />
        </div>
        <div className="text-xl font-semibold text-foreground">
          ${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Verified on-chain
        </div>
      </div>

      {/* Asset List */}
      <div className="space-y-2">
        {assetsWithBalance.map((asset) => {
          const tradingAvailable = asset.appAvailable ?? asset.available ?? 0;
          const tradingLocked = asset.appLocked ?? asset.locked ?? 0;
          const onchain = asset.onchainBalance ?? 0;
          const needsSync = onchain > 0 && tradingAvailable < onchain - 0.000001;
          const isSynced = !needsSync && tradingAvailable > 0;

          return (
            <div 
              key={asset.symbol}
              className={cn(
                "bg-card border rounded-lg p-3",
                needsSync ? "border-amber-500/30" : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {asset.logo_url ? (
                    <img 
                      src={asset.logo_url} 
                      alt={asset.symbol}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {asset.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-foreground text-sm">{asset.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {asset.name || asset.symbol}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {/* Primary balance (source of truth) */}
                  <div className="font-mono text-sm text-foreground">
                    {Math.max(onchain, tradingAvailable + tradingLocked).toFixed(
                      Math.max(onchain, tradingAvailable + tradingLocked) < 1 ? 6 : 4
                    )}
                  </div>
                  
                  {/* Sync status */}
                  <div className="mt-0.5">
                    {needsSync ? (
                      <SyncStatusBadge status="needs_sync" />
                    ) : isSynced ? (
                      <SyncStatusBadge status="synced" />
                    ) : null}
                  </div>
                </div>
              </div>
              
              {/* Trading breakdown */}
              {(tradingAvailable > 0 || tradingLocked > 0) && (
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Available for trading</span>
                    <span className="font-mono text-foreground">
                      {tradingAvailable.toFixed(tradingAvailable < 1 ? 6 : 4)}
                    </span>
                  </div>
                  {tradingLocked > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Locked in orders</span>
                      <span className="font-mono text-amber-400">
                        {tradingLocked.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* USD value */}
              {asset.usd_value !== undefined && asset.usd_value > 0 && (
                <div className="mt-1 text-xs text-muted-foreground text-right">
                  ≈ ${asset.usd_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => navigate('/app/wallet/deposit')}
        >
          <ArrowDownLeft className="h-4 w-4 mr-1" />
          Deposit
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => {
            // Pre-select first asset with balance for transfer
            const firstAsset = assetsWithBalance[0]?.symbol;
            navigate(firstAsset ? `/app/wallet/transfer?asset=${firstAsset}` : '/app/wallet/transfer');
          }}
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" />
          Transfer
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => navigate('/app/wallet/withdraw')}
        >
          <ArrowUpRight className="h-4 w-4 mr-1" />
          Withdraw
        </Button>
      </div>
    </div>
  );
};