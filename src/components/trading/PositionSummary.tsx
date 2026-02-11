import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Lock } from 'lucide-react';

interface PositionSummaryProps {
  baseCurrency: string;
  quoteCurrency: string;
  baseAvailable: number;
  baseTotal: number;
  baseLocked: number;
  quoteAvailable: number;
  quoteTotal: number;
  quoteLocked: number;
  currentPrice: number;
  avgEntryPrice?: number; // If we can compute from trade history
}

export const PositionSummary: React.FC<PositionSummaryProps> = ({
  baseCurrency,
  quoteCurrency,
  baseAvailable,
  baseTotal,
  baseLocked,
  quoteAvailable,
  quoteTotal,
  quoteLocked,
  currentPrice,
  avgEntryPrice,
}) => {
  const portfolioValue = baseTotal * currentPrice + quoteTotal;
  const baseValue = baseTotal * currentPrice;

  // PnL calculation (only if avgEntryPrice available)
  const hasPnl = avgEntryPrice && avgEntryPrice > 0 && baseTotal > 0;
  const unrealizedPnl = hasPnl ? (currentPrice - avgEntryPrice) * baseTotal : 0;
  const unrealizedPnlPercent = hasPnl && avgEntryPrice ? ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100 : 0;
  const isPnlPositive = unrealizedPnl >= 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Position</span>
        </div>
        <span className="text-xs font-mono font-semibold text-foreground">
          ${portfolioValue.toFixed(2)}
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Base Asset */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-foreground block">{baseCurrency}</span>
            <span className="text-xs font-mono font-medium text-foreground">
              {baseTotal.toFixed(6)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">Value</span>
            <span className="text-xs font-mono text-foreground">
              ${baseValue.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Quote Asset */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-foreground block">{quoteCurrency}</span>
            <span className="text-xs font-mono font-medium text-foreground">
              {quoteTotal.toFixed(4)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">Available</span>
            <span className="text-xs font-mono text-foreground">
              {quoteAvailable.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Locked funds indicator */}
        {(baseLocked > 0 || quoteLocked > 0) && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-500/5 border border-amber-500/15 rounded-lg">
            <Lock className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] text-amber-400">
              {baseLocked > 0 && `${baseLocked.toFixed(6)} ${baseCurrency}`}
              {baseLocked > 0 && quoteLocked > 0 && ' · '}
              {quoteLocked > 0 && `${quoteLocked.toFixed(4)} ${quoteCurrency}`}
              {' in orders'}
            </span>
          </div>
        )}

        {/* Unrealized PnL */}
        {hasPnl && (
          <div className={cn(
            "flex items-center justify-between px-2 py-1.5 rounded-lg border",
            isPnlPositive
              ? "bg-emerald-500/5 border-emerald-500/15"
              : "bg-red-500/5 border-red-500/15"
          )}>
            <div className="flex items-center gap-1.5">
              {isPnlPositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className="text-[10px] text-muted-foreground">Unrealized PnL</span>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-xs font-mono font-semibold",
                isPnlPositive ? "text-emerald-400" : "text-red-400"
              )}>
                {isPnlPositive ? '+' : ''}{unrealizedPnl.toFixed(4)} {quoteCurrency}
              </span>
              <span className={cn(
                "text-[10px] font-mono ml-1",
                isPnlPositive ? "text-emerald-400/70" : "text-red-400/70"
              )}>
                ({isPnlPositive ? '+' : ''}{unrealizedPnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
