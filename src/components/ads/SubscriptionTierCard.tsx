import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, TrendingUp, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionTierCardProps {
  tier: {
    id: string;
    tier_bsk: number;
    tier_bsk_legacy: number;
    daily_bsk: number;
    duration_days: number;
    is_active: boolean;
  };
  isPopular?: boolean;
  isPremium?: boolean;
  onPurchase: (tierId: string) => void;
  isPurchasing?: boolean;
  className?: string;
}

export function SubscriptionTierCard({
  tier,
  isPopular = false,
  isPremium = false,
  onPurchase,
  isPurchasing = false,
  className,
}: SubscriptionTierCardProps) {
  const totalReward = tier.daily_bsk * tier.duration_days;
  const valueMultiplier = (totalReward / tier.tier_bsk).toFixed(1);

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-elevated hover:scale-[1.02]",
        isPopular && "border-primary shadow-neon",
        isPremium && "border-accent shadow-elevated",
        className
      )}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
          🔥 Popular
        </div>
      )}

      {/* Premium Badge */}
      {isPremium && (
        <div className="absolute top-0 left-0 bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold rounded-br-lg flex items-center gap-1">
          <Crown className="w-3 h-3" />
          Premium
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Tier Name */}
        <div className="text-center">
          <h3 className="text-2xl font-heading font-bold text-foreground">
            {tier.duration_days} Days
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Ad Mining Subscription</p>
        </div>

        {/* Price */}
        <div className="text-center py-4 border-y border-border">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-3xl font-heading font-bold text-primary">
              {tier.tier_bsk}
            </span>
            <span className="text-lg text-muted-foreground">BSK</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">One-time payment</p>
        </div>

        {/* Value Proposition */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Daily Reward:</span>
            <span className="text-sm font-semibold text-primary">
              {tier.daily_bsk} BSK/day
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Total Rewards:</span>
            <span className="text-sm font-semibold text-success">
              {totalReward} BSK
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-primary/20">
            <span className="text-sm font-semibold text-foreground">Value:</span>
            <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
              <TrendingUp className="w-3 h-3 mr-1" />
              {valueMultiplier}x Return
            </Badge>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground">
              Watch up to 50+ ads daily
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground">
              Earn to withdrawable balance
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground">
              {tier.duration_days} days validity
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground">
              Instant activation
            </span>
          </div>
        </div>

        {/* Purchase Button */}
        <Button
          onClick={() => onPurchase(tier.id)}
          disabled={isPurchasing || !tier.is_active}
          className="w-full h-12 text-base font-semibold"
          variant={isPopular ? "default" : isPremium ? "outline" : "secondary"}
        >
          {isPurchasing ? 'Processing...' : `Subscribe Now`}
        </Button>

        {!tier.is_active && (
          <p className="text-xs text-center text-muted-foreground">
            Currently unavailable
          </p>
        )}
      </div>
    </Card>
  );
}
