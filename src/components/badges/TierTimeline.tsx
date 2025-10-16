import { motion } from "framer-motion";
import { Shield, Star, Crown, Gem, Sparkles, Check, Lock } from "lucide-react";
import { badgeTokens, getTierTokens } from "@/design-system/badge-tokens";
import { cn } from "@/lib/utils";

interface TierTimelineProps {
  currentBadge: string;
  tiers: Array<{
    name: string;
    unlockLevels: number;
    cost: number;
  }>;
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

export function TierTimeline({ currentBadge, tiers, className }: TierTimelineProps) {
  const currentTierIndex = tiers.findIndex(t => t.name.toUpperCase() === currentBadge.toUpperCase());

  return (
    <div className={cn("relative", className)}>
      {/* Timeline Container */}
      <div className="relative flex items-center justify-between gap-4 overflow-x-auto pb-4">
        {/* Progress Line */}
        <div className="absolute top-12 left-0 right-0 h-1 bg-border" style={{ zIndex: 0 }}>
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ 
              width: currentTierIndex >= 0 
                ? `${((currentTierIndex + 1) / tiers.length) * 100}%` 
                : '0%' 
            }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>

        {/* Tier Nodes */}
        {tiers.map((tier, index) => {
          const tierKey = getTierKey(tier.name);
          const tokens = getTierTokens(tierKey);
          const Icon = getBadgeIcon(tier.name);
          const isUnlocked = index <= currentTierIndex;
          const isCurrent = tier.name.toUpperCase() === currentBadge.toUpperCase();

          return (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex flex-col items-center flex-1 min-w-[100px]"
              style={{ zIndex: 1 }}
            >
              {/* Node Circle */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                className={cn(
                  "relative w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all",
                  isUnlocked ? "cursor-pointer" : "cursor-default"
                )}
                style={{
                  background: isUnlocked 
                    ? badgeTokens.gradients[tierKey].card 
                    : 'hsl(var(--muted))',
                  borderColor: isCurrent 
                    ? `hsl(${tokens.primary})` 
                    : isUnlocked 
                    ? `hsl(${tokens.primary} / 0.3)` 
                    : 'hsl(var(--border))',
                  boxShadow: isCurrent 
                    ? `0 0 32px hsl(${tokens.glow})` 
                    : isUnlocked
                    ? `0 0 16px hsl(${tokens.glow})`
                    : 'none'
                }}
              >
                {/* Glow Effect for Current */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: `hsl(${tokens.glow})` }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                )}

                {/* Icon */}
                <div className="relative z-10">
                  {isUnlocked ? (
                    <Icon
                      className="w-10 h-10"
                      style={{ color: `hsl(${tokens.primary})` }}
                    />
                  ) : (
                    <Lock className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>

                {/* Current Badge Indicator */}
                {isCurrent && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ 
                      background: `hsl(${tokens.primary})`,
                      boxShadow: `0 4px 12px hsl(${tokens.glow})`
                    }}
                  >
                    <Check className="w-4 h-4" style={{ color: `hsl(${tokens.text})` }} />
                  </motion.div>
                )}
              </motion.div>

              {/* Tier Info */}
              <div className="mt-3 text-center space-y-1">
                <p 
                  className={cn(
                    "font-semibold text-sm",
                    isUnlocked ? "" : "text-muted-foreground"
                  )}
                  style={isUnlocked ? { color: `hsl(${tokens.primary})` } : {}}
                >
                  {tier.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tier.cost} BSK
                </p>
                <p className="text-xs text-muted-foreground">
                  Level {tier.unlockLevels}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
