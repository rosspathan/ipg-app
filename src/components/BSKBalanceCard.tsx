import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Coins, Lock, ArrowUpCircle, Send, History, Info, Eye, EyeOff } from 'lucide-react';
import { useAdMining } from '@/hooks/useAdMining';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BSKBalanceCardProps {
  balanceType: 'withdrawable' | 'holding';
  className?: string;
  style?: React.CSSProperties;
}

export const BSKBalanceCard: React.FC<BSKBalanceCardProps> = ({
  balanceType,
  className,
  style
}) => {
  const navigate = useNavigate();
  const { bskBalances, getCurrentBSKRate, loading } = useAdMining();
  const [showBalance, setShowBalance] = React.useState(true);

  if (loading || !bskBalances) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-6">
          <div className="h-20 bg-muted/30 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const balance = balanceType === 'withdrawable' 
    ? bskBalances.withdrawable_balance 
    : bskBalances.holding_balance;

  const totalEarned = balanceType === 'withdrawable'
    ? bskBalances.lifetime_withdrawable_earned
    : bskBalances.lifetime_holding_earned;

  const currentRate = getCurrentBSKRate();
  const inrValue = balance * currentRate;

  const isWithdrawable = balanceType === 'withdrawable';

  return (
    <Card 
      className={cn(
        "overflow-hidden border-l-4",
        isWithdrawable 
          ? "border-l-success bg-gradient-to-r from-success/5 to-transparent"
          : "border-l-warning bg-gradient-to-r from-warning/5 to-transparent",
        className
      )}
      style={style}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isWithdrawable ? (
              <Coins className="h-5 w-5 text-success" />
            ) : (
              <Lock className="h-5 w-5 text-warning" />
            )}
            <CardTitle className="text-base font-semibold">
              BSK — {isWithdrawable ? 'Withdrawable' : 'Holding'}
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>
                    {isWithdrawable 
                      ? "Earned from subscriptions. Can be withdrawn, transferred, or used for purchases."
                      : "Earned from free daily views. Non-withdrawable rewards for promotional activities."
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBalance(!showBalance)}
            className="h-8 w-8 p-0"
          >
            {showBalance ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {showBalance ? balance.toFixed(2) : "••••"}
            </span>
            <span className="text-lg font-medium text-muted-foreground">BSK</span>
          </div>
          <div className="text-sm text-muted-foreground">
            ≈ ₹{showBalance ? inrValue.toFixed(2) : "••••"} 
            <span className="text-xs ml-1">(Rate: 1 BSK = ₹{currentRate})</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="text-sm">
            <span className="text-muted-foreground">Total Earned:</span>
            <br />
            <span className="font-semibold">
              {showBalance ? totalEarned.toFixed(2) : "••••"} BSK
            </span>
          </div>
          <Badge variant={isWithdrawable ? "default" : "secondary"}>
            {isWithdrawable ? "Tradable" : "Locked"}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {isWithdrawable ? (
            <>
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => navigate('/app/programs/bsk-withdraw')}
                disabled={balance <= 0}
              >
                <ArrowUpCircle className="h-4 w-4 mr-1" />
                Withdraw
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate('/app/programs/bsk-transfer')}
                disabled={balance <= 0}
              >
                <Send className="h-4 w-4 mr-1" />
                Transfer
              </Button>
            </>
          ) : (
            <div className="text-center w-full py-2">
              <p className="text-sm text-muted-foreground">
                Non-withdrawable balance
              </p>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/wallet/history')}
          >
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          <strong>Disclaimer:</strong> BSK is an in-app promotional token. 
          Values are admin-defined and may change. Ledger entries preserve snapshot rates.
        </div>
      </CardContent>
    </Card>
  );
};