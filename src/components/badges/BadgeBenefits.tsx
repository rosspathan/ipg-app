import { motion } from "framer-motion";
import { 
  ChevronDown, 
  Users, 
  Percent, 
  Coins, 
  Shield, 
  Star, 
  Crown,
  Zap,
  Gift,
  TrendingUp
} from "lucide-react";
import { useState } from "react";
import { badgeTokens, getTierTokens } from "@/design-system/badge-tokens";
import { cn } from "@/lib/utils";

interface Benefit {
  icon: typeof Users;
  title: string;
  description: string;
}

interface TierBenefits {
  tier: string;
  benefits: Benefit[];
}

interface BadgeBenefitsProps {
  tierBenefits: TierBenefits[];
  currentBadge: string;
  className?: string;
}

const getTierKey = (badge: string): keyof typeof badgeTokens.tiers => {
  const key = badge.toLowerCase() as keyof typeof badgeTokens.tiers;
  return badgeTokens.tiers[key] ? key : 'none';
};

export function BadgeBenefits({ tierBenefits, currentBadge, className }: BadgeBenefitsProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(
    tierBenefits.find(t => t.tier.toUpperCase() === currentBadge.toUpperCase())?.tier || null
  );

  return (
    <div className={cn("space-y-3", className)}>
      {tierBenefits.map((tierBenefit) => {
        const isExpanded = expandedTier === tierBenefit.tier;
        const isCurrent = tierBenefit.tier.toUpperCase() === currentBadge.toUpperCase();
        const tierKey = getTierKey(tierBenefit.tier);
        const tokens = getTierTokens(tierKey);

        return (
          <div
            key={tierBenefit.tier}
            className={cn(
              "rounded-xl border-2 overflow-hidden transition-all",
              isCurrent && "ring-2"
            )}
            style={{
              borderColor: `hsl(${tokens.primary} / 0.3)`,
              ...(isCurrent && {
                ringColor: `hsl(${tokens.glow})`
              })
            }}
          >
            {/* Header */}
            <button
              onClick={() => setExpandedTier(isExpanded ? null : tierBenefit.tier)}
              className="w-full p-4 flex items-center justify-between bg-card hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: badgeTokens.gradients[tierKey].card }}
                >
                  <Star 
                    className="w-5 h-5"
                    style={{ color: `hsl(${tokens.primary})` }}
                  />
                </div>
                <div className="text-left">
                  <h3 
                    className="font-bold text-lg"
                    style={{ color: `hsl(${tokens.primary})` }}
                  >
                    {tierBenefit.tier} Benefits
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {tierBenefit.benefits.length} exclusive benefits
                  </p>
                </div>
                {isCurrent && (
                  <span 
                    className="ml-2 text-xs px-2 py-1 rounded-full"
                    style={{ 
                      background: `hsl(${tokens.primary} / 0.2)`,
                      color: `hsl(${tokens.primary})`
                    }}
                  >
                    Current
                  </span>
                )}
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            </button>

            {/* Benefits List */}
            <motion.div
              initial={false}
              animate={{
                height: isExpanded ? "auto" : 0,
                opacity: isExpanded ? 1 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-3">
                {tierBenefit.benefits.map((benefit, index) => {
                  const BenefitIcon = benefit.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `hsl(${tokens.primary} / 0.1)` }}
                      >
                        <BenefitIcon 
                          className="w-5 h-5"
                          style={{ color: `hsl(${tokens.primary})` }}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">
                          {benefit.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {benefit.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

// Helper function to generate tier benefits
export const generateTierBenefits = (
  badgeThresholds: Array<{
    badge_name: string;
    unlock_levels: number;
    bonus_bsk_holding: number;
  }>
): TierBenefits[] => {
  return badgeThresholds.map((badge) => {
    const baseBenefits = [
      {
        icon: Users,
        title: `${badge.unlock_levels} Referral Levels`,
        description: `Earn commissions from ${badge.unlock_levels} levels deep in your referral network`
      },
      {
        icon: Percent,
        title: 'Progressive Commissions',
        description: 'Earn higher commission rates on all trading activities in your network'
      }
    ];
    
    // Only add BSK bonus if > 0
    if (badge.bonus_bsk_holding > 0) {
      baseBenefits.push({
        icon: Coins,
        title: `${badge.bonus_bsk_holding.toLocaleString()} BSK Bonus`,
        description: `Receive ${badge.bonus_bsk_holding.toLocaleString()} BSK as bonus holding balance when you upgrade`
      });
    }
    
    // Add standard benefits
    baseBenefits.push(
      {
        icon: Shield,
        title: 'Priority Support',
        description: 'Get faster response times and dedicated assistance from our support team'
      },
      {
        icon: Zap,
        title: 'Early Access',
        description: 'Be the first to access new features and exclusive platform updates'
      }
    );
    
    // Add VIP-specific benefits
    const allBenefits = badge.badge_name.toUpperCase() === 'VIP' 
      ? [
          ...baseBenefits,
          {
            icon: Crown,
            title: 'VIP Physical Card',
            description: 'Receive an exclusive physical VIP membership card'
          },
          {
            icon: Gift,
            title: 'Exclusive Rewards',
            description: 'Access VIP-only airdrops, contests, and special events'
          },
          {
            icon: TrendingUp,
            title: 'Maximum Earnings',
            description: 'Unlock the highest commission rates and deepest referral network'
          }
        ]
      : baseBenefits;
    
    return {
      tier: badge.badge_name,
      benefits: allBenefits
    };
  });
};
