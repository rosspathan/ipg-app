import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Sparkles } from 'lucide-react';
import { useActiveBonusRule, calculateBonusAmount } from '@/hooks/usePurchaseBonuses';
import { cn } from '@/lib/utils';

interface PurchaseBonusBannerProps {
  baseSymbol: string;
  className?: string;
  amount?: number;
  tierMultiplier?: number;
}

export default function PurchaseBonusBanner({ 
  baseSymbol, 
  className,
  amount = 0,
  tierMultiplier = 1.0
}: PurchaseBonusBannerProps) {
  const { data: rule, isLoading } = useActiveBonusRule(baseSymbol);

  if (isLoading || !rule) return null;

  const estimatedBonus = amount > 0 ? calculateBonusAmount(amount, rule, tierMultiplier) : 0;
  const exampleAmount = rule.ratio_base_per_bonus * 5; // Show example for 5x the ratio
  const exampleBonus = calculateBonusAmount(exampleAmount, rule, tierMultiplier);

  return (
    <Card className={cn(
      "bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20",
      "animate-pulse-subtle hover:from-primary/15 hover:to-accent/15 transition-all duration-300",
      className
    )}>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-full bg-primary/20">
              <Gift className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm font-medium">Buy-to-Earn Bonus</span>
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          </div>
          <Sparkles className="w-4 h-4 text-accent opacity-60" />
        </div>
        
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            Buy <span className="font-medium text-foreground">{rule.base_symbol}</span> and earn{' '}
            <span className="font-medium text-primary">{rule.bonus_symbol}</span> rewards
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <div className="space-x-4">
              <span className="text-muted-foreground">
                Ratio: <span className="font-medium">1 {rule.bonus_symbol} per {rule.ratio_base_per_bonus} {rule.base_symbol}</span>
              </span>
              {tierMultiplier > 1 && (
                <Badge variant="outline" className="text-xs">
                  VIP ×{tierMultiplier}
                </Badge>
              )}
            </div>
          </div>
          
          {amount > 0 && estimatedBonus > 0 && (
            <div className="flex items-center justify-between p-2 bg-primary/5 rounded-md border border-primary/10">
              <span className="text-xs text-muted-foreground">You'll earn:</span>
              <span className="text-sm font-semibold text-primary">
                ≈ {estimatedBonus} {rule.bonus_symbol}
              </span>
            </div>
          )}
          
          {amount > 0 && estimatedBonus === 0 && rule.min_fill_amount > 0 && amount < rule.min_fill_amount && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
              Minimum {rule.min_fill_amount} {rule.base_symbol} required for bonus
            </div>
          )}
          
          {amount === 0 && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
              Example: Buy {exampleAmount} {rule.base_symbol} → Get {exampleBonus} {rule.bonus_symbol}
            </div>
          )}
        </div>
        
        {rule.end_at && (
          <div className="text-xs text-amber-600">
            Offer expires: {new Date(rule.end_at).toLocaleDateString()}
          </div>
        )}
        
        {rule.notes && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            {rule.notes}
          </div>
        )}
      </div>
    </Card>
  );
}