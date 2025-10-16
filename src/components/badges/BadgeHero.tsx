import { motion } from "framer-motion";
import { Shield, Star, Crown, Gem, Sparkles, TrendingUp } from "lucide-react";
import { badgeTokens, getTierTokens, getTierGradients } from "@/design-system/badge-tokens";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface BadgeHeroProps {
  currentBadge: string;
  bskBalance: number;
  nextTierCost?: number;
  nextTierName?: string;
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

export function BadgeHero({ currentBadge, bskBalance, nextTierCost, nextTierName, className }: BadgeHeroProps) {
  const tierKey = getTierKey(currentBadge);
  const tokens = getTierTokens(tierKey);
  const gradients = getTierGradients(tierKey);
  const Icon = getBadgeIcon(currentBadge);
  
  const progress = nextTierCost ? Math.min((bskBalance / nextTierCost) * 100, 100) : 100;
  const isMaxTier = currentBadge.toUpperCase() === 'VIP';

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {/* Animated Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{ background: gradients.radial }}
      />
      
      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0"
        style={{ background: gradients.card }}
      />

      {/* Content */}
      <div className="relative z-10 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center space-y-6"
        >
          {/* Badge Icon with Glow */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative"
          >
            <div 
              className="absolute inset-0 blur-2xl rounded-full"
              style={{ 
                background: `hsl(${tokens.glow})`,
                transform: 'scale(1.5)'
              }}
            />
            <div
              className="relative w-32 h-32 rounded-full flex items-center justify-center"
              style={{ 
                background: gradients.card,
                boxShadow: `0 0 48px hsl(${tokens.glow})`
              }}
            >
              <Icon 
                className="w-16 h-16"
                style={{ color: `hsl(${tokens.primary})` }}
              />
            </div>
          </motion.div>

          {/* Badge Name */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 
              className="text-4xl font-bold mb-2"
              style={{ 
                color: `hsl(${tokens.primary})`,
                fontFamily: badgeTokens.typography.fontFamily.heading
              }}
            >
              {currentBadge} Tier
            </h2>
            <p className="text-muted-foreground">
              {isMaxTier ? 'Maximum tier achieved! 🎉' : 'Your current badge tier'}
            </p>
          </motion.div>

          {/* BSK Balance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-background/40 backdrop-blur-sm rounded-xl px-8 py-4 border"
            style={{ borderColor: `hsl(${tokens.primary} / 0.2)` }}
          >
            <p className="text-sm text-muted-foreground mb-1">Your BSK Balance</p>
            <p className="text-3xl font-bold" style={{ color: `hsl(${tokens.primary})` }}>
              {bskBalance.toFixed(2)} BSK
            </p>
          </motion.div>

          {/* Progress to Next Tier */}
          {!isMaxTier && nextTierCost && nextTierName && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-md space-y-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress to {nextTierName}</span>
                <span className="font-semibold" style={{ color: `hsl(${tokens.primary})` }}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              
              <div className="relative">
                <Progress 
                  value={progress} 
                  className="h-3"
                  style={{
                    background: `hsl(${tokens.primary} / 0.2)`
                  }}
                />
                <div 
                  className="absolute inset-0 rounded-full blur-md opacity-50"
                  style={{ 
                    background: `linear-gradient(90deg, transparent, hsl(${tokens.primary}))`,
                    width: `${progress}%`
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{bskBalance.toFixed(0)} BSK</span>
                <span>{nextTierCost.toFixed(0)} BSK needed</span>
              </div>

              {bskBalance >= nextTierCost && (
                <Button 
                  className="w-full mt-4"
                  style={{ 
                    background: gradients.card,
                    color: `hsl(${tokens.text})`
                  }}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              )}
            </motion.div>
          )}

          {/* Particle Effects */}
          {tierKey !== 'none' && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(badgeTokens.particles[tierKey].count)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: badgeTokens.particles[tierKey].size,
                    height: badgeTokens.particles[tierKey].size,
                    background: badgeTokens.particles[tierKey].color,
                    opacity: badgeTokens.particles[tierKey].opacity,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0.4, 0.8, 0.4],
                  }}
                  transition={{
                    duration: parseFloat(badgeTokens.particles[tierKey].duration),
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
