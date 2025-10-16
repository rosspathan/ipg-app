import { motion } from "framer-motion";
import { Shield, Star, Crown, Gem, Sparkles, ArrowUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { badgeTokens, getTierTokens, getTierGradients } from "@/design-system/badge-tokens";
import { cn } from "@/lib/utils";

export interface BadgeGridItem {
  id: string;
  name: string;
  description: string;
  fullPrice: number;
  upgradeCost?: number;
  unlockLevels: number;
  bonusBSK: number;
  isCurrent: boolean;
  isUpgrade: boolean;
  isLowerTier: boolean;
  canPurchase: boolean;
}

interface BadgeGridProps {
  badges: BadgeGridItem[];
  onPurchase: (badge: BadgeGridItem) => void;
  isProcessing: boolean;
  className?: string;
}

const getBadgeIcon = (badgeName: string) => {
  switch (badgeName.toUpperCase()) {
    case 'SILVER': return Shield;
    case 'GOLD': return Star;
    case 'PLATINUM': return Gem;
    case 'DIAMOND': return Sparkles;
    case 'VIP': return Crown;
    default: return Shield;
  }
};

const getTierKey = (badge: string): keyof typeof badgeTokens.tiers => {
  const key = badge.toLowerCase() as keyof typeof badgeTokens.tiers;
  return badgeTokens.tiers[key] ? key : 'none';
};

export function BadgeGrid({ badges, onPurchase, isProcessing, className }: BadgeGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
      {badges.map((badge, index) => {
        const tierKey = getTierKey(badge.name);
        const tokens = getTierTokens(tierKey);
        const gradients = getTierGradients(tierKey);
        const Icon = getBadgeIcon(badge.name);
        const displayCost = badge.isUpgrade && badge.upgradeCost ? badge.upgradeCost : badge.fullPrice;

        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={badge.canPurchase && !badge.isCurrent ? { y: -8 } : {}}
            className="relative group"
          >
            {/* Card Container */}
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border-2 transition-all duration-300",
                badge.isCurrent && "ring-4"
              )}
              style={{
                borderColor: badge.isCurrent 
                  ? `hsl(${tokens.primary})` 
                  : `hsl(${tokens.primary} / 0.2)`,
                background: badge.isLowerTier 
                  ? 'hsl(var(--muted) / 0.5)' 
                  : 'hsl(var(--card))',
                ...(badge.isCurrent && {
                  ringColor: `hsl(${tokens.glow})`
                })
              }}
            >
              {/* Background Gradient */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{ background: gradients.radial }}
              />

              {/* Content */}
              <div className="relative z-10 p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center relative"
                      style={{ 
                        background: gradients.card,
                        boxShadow: `0 8px 24px hsl(${tokens.glow})`
                      }}
                    >
                      <Icon 
                        className="w-8 h-8"
                        style={{ color: `hsl(${tokens.primary})` }}
                      />
                    </div>

                    {/* Name */}
                    <div>
                      <h3 
                        className="text-xl font-bold"
                        style={{ 
                          color: `hsl(${tokens.primary})`,
                          fontFamily: badgeTokens.typography.fontFamily.heading
                        }}
                      >
                        {badge.name}
                      </h3>
                      {badge.isCurrent && (
                        <Badge 
                          variant="secondary" 
                          className="mt-1"
                          style={{ 
                            background: `hsl(${tokens.primary} / 0.2)`,
                            color: `hsl(${tokens.primary})`
                          }}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {badge.description}
                </p>

                {/* Key Benefits */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                    <p className="text-muted-foreground text-xs mb-1">Levels</p>
                    <p className="font-bold" style={{ color: `hsl(${tokens.primary})` }}>
                      {badge.unlockLevels}
                    </p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                    <p className="text-muted-foreground text-xs mb-1">Bonus BSK</p>
                    <p className="font-bold" style={{ color: `hsl(${tokens.primary})` }}>
                      {badge.bonusBSK}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-2">
                  {badge.isUpgrade && badge.upgradeCost && badge.upgradeCost !== badge.fullPrice ? (
                    <div 
                      className="rounded-lg p-3 border"
                      style={{ 
                        background: `hsl(152 64% 48% / 0.1)`,
                        borderColor: `hsl(152 64% 48% / 0.2)`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Upgrade Price</p>
                          <p className="text-2xl font-bold text-green-500">
                            {badge.upgradeCost} BSK
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground line-through">
                            {badge.fullPrice} BSK
                          </p>
                          <p className="text-xs font-semibold text-green-500">
                            Save {badge.fullPrice - badge.upgradeCost} BSK
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="text-3xl font-bold" style={{ color: `hsl(${tokens.primary})` }}>
                        {displayCost} BSK
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {badge.isCurrent ? (
                  <Button disabled className="w-full" variant="outline">
                    Current Badge
                  </Button>
                ) : badge.isLowerTier ? (
                  <Button disabled variant="ghost" className="w-full">
                    Lower Tier
                  </Button>
                ) : (
                  <Button
                    onClick={() => onPurchase(badge)}
                    disabled={isProcessing}
                    className="w-full group-hover:scale-105 transition-transform"
                    style={{
                      background: gradients.card,
                      color: `hsl(${tokens.text})`
                    }}
                  >
                    {badge.isUpgrade && <ArrowUp className="w-4 h-4 mr-2" />}
                    {badge.isUpgrade ? 'Upgrade' : 'Purchase'}
                  </Button>
                )}

                {/* Referrer Commission Notice */}
                {displayCost > 0 && !badge.isCurrent && (
                  <p className="text-xs text-center text-muted-foreground">
                    ✨ Your referrer earns 10% commission
                  </p>
                )}
              </div>

              {/* Shimmer Effect on Hover */}
              {badge.canPurchase && !badge.isCurrent && tierKey !== 'none' && 'shimmer' in gradients && (
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: gradients.shimmer,
                    backgroundSize: '200% 100%',
                  }}
                  animate={{
                    backgroundPosition: ['200% 0', '-200% 0'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
