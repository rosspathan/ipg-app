import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AssetBalance {
  symbol: string;
  name?: string;
  balance: number;
  available: number;
  locked: number;
  logo_url?: string;
  usd_value?: number;
}

interface FundsTabProps {
  balances: AssetBalance[];
  loading?: boolean;
}

export const FundsTab: React.FC<FundsTabProps> = ({ balances, loading }) => {
  const navigate = useNavigate();

  // Filter to only show assets with balance > 0
  const assetsWithBalance = balances?.filter(b => b.balance > 0) || [];
  
  // Calculate total portfolio USD value
  const totalUsdValue = assetsWithBalance.reduce((sum, b) => sum + (b.usd_value || 0), 0);

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
      {/* Total Portfolio Value */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="text-xs text-muted-foreground mb-1">Total Portfolio Value</div>
        <div className="text-xl font-semibold text-foreground">
          ${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Asset List */}
      <div className="space-y-2">
        {assetsWithBalance.map((asset) => (
          <div 
            key={asset.symbol}
            className="flex items-center justify-between bg-card border border-border rounded-lg p-3"
          >
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
              <div className="font-mono text-sm text-foreground">
                {asset.available.toFixed(asset.available < 1 ? 6 : 4)}
              </div>
              {asset.usd_value !== undefined && (
                <div className="text-xs text-muted-foreground">
                  ≈ ${asset.usd_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>
        ))}
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
          onClick={() => navigate('/app/wallet/withdraw')}
        >
          <ArrowUpRight className="h-4 w-4 mr-1" />
          Withdraw
        </Button>
      </div>
    </div>
  );
};
