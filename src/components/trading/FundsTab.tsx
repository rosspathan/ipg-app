import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Loader2, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AssetBalance {
  symbol: string;
  name?: string;
  balance: number;
  available: number;
  locked: number;
  logo_url?: string;
  usd_value?: number;
  // Trading balance (actual funds in hot wallet)
  appBalance?: number;
  appAvailable?: number;
  appLocked?: number;
  // On-chain balance (display only)
  onchainBalance?: number;
}

interface FundsTabProps {
  balances: AssetBalance[];
  loading?: boolean;
}

export const FundsTab: React.FC<FundsTabProps> = ({ balances, loading }) => {
  const navigate = useNavigate();
  // Only show assets with actual TRADING balance (funds in hot wallet)
  // NOT on-chain balances which are just for display
  const assetsWithTradingBalance = balances?.filter(b => {
    const tradingBalance = (b.appAvailable || 0) + (b.appLocked || 0);
    return tradingBalance > 0.000001;
  }) || [];
  
  // Calculate total USD value from trading balances only
  const totalUsdValue = assetsWithTradingBalance.reduce((sum, b) => {
    const tradingBalance = (b.appAvailable || 0) + (b.appLocked || 0);
    // Stablecoins are always $1
    const isStablecoin = ['USDT', 'USDC', 'DAI', 'BUSD'].includes(b.symbol);
    const pricePerUnit = isStablecoin ? 1 : (b.usd_value && b.balance > 0 ? b.usd_value / b.balance : 0);
    return sum + (tradingBalance * pricePerUnit);
  }, 0);


  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
        Loading trading balances...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Trading Balance Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Trading Balance</span>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] font-medium text-emerald-400">Custodial</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-foreground">
          ${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Funds held in platform wallet for trading
        </p>
      </div>

      {/* Transfer Action */}
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-full"
        onClick={() => navigate('/app/wallet/transfer')}
      >
        <ArrowLeftRight className="h-4 w-4 mr-1.5" />
        Transfer
      </Button>

      {/* Asset List - Trading balances only */}
      {assetsWithTradingBalance.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-xl">
          <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm font-medium text-muted-foreground mb-1">No Trading Balance</p>
          <p className="text-xs text-muted-foreground mb-4">
            Deposit funds to start trading
          </p>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => navigate('/app/wallet/transfer')}
          >
            <ArrowLeftRight className="h-4 w-4 mr-1.5" />
            Transfer Funds
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground px-1">Your Assets</h4>
          {assetsWithTradingBalance.map((asset) => {
            const tradingAvailable = asset.appAvailable ?? 0;
            const tradingLocked = asset.appLocked ?? 0;
            const tradingTotal = tradingAvailable + tradingLocked;
            
            // Stablecoins are always $1
            const isStablecoin = ['USDT', 'USDC', 'DAI', 'BUSD'].includes(asset.symbol);
            const pricePerUnit = isStablecoin ? 1 : (asset.usd_value && asset.balance > 0 ? asset.usd_value / asset.balance : 0);
            const usdValue = tradingTotal * pricePerUnit;

            return (
              <div 
                key={asset.symbol}
                className="bg-card border border-border rounded-lg p-3"
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
                    <div className="font-mono text-sm font-medium text-foreground">
                      {tradingTotal.toFixed(tradingTotal < 1 ? 6 : 4)}
                    </div>
                    {usdValue > 0 && (
                      <div className="text-xs text-muted-foreground">
                        ≈ ${usdValue.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Show available vs locked breakdown */}
                {(tradingAvailable > 0 || tradingLocked > 0) && (
                  <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Available</span>
                      <div className="font-mono text-foreground">
                        {tradingAvailable.toFixed(tradingAvailable < 1 ? 6 : 4)}
                      </div>
                    </div>
                    {tradingLocked > 0 && (
                      <div>
                        <span className="text-muted-foreground">In Orders</span>
                        <div className="font-mono text-amber-400">
                          {tradingLocked.toFixed(4)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
