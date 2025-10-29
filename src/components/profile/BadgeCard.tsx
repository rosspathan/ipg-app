import * as React from "react"
import { Award, Sparkles, Shield, Crown, Star, ChevronRight, Gem } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserBadge } from "@/hooks/useUserBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { badgeTokens, getTierTokens, getTierKey } from "@/design-system/badge-tokens"
import { motion } from "framer-motion"
import { normalizeBadgeName, getBadgeDisplayName } from "@/lib/badgeUtils"

const getBadgeIcon = (tier: string) => {
  const tierUpper = tier.toUpperCase();
  switch (tierUpper) {
    case 'SILVER': return Shield;
    case 'GOLD': return Star;
    case 'PLATINUM': return Gem;
    case 'DIAMOND': return Sparkles;
    case 'VIP': return Crown;
    default: return Award;
  }
}

export function BadgeCard() {
  const { badge, loading } = useUserBadge()
  
  const displayBadge = badge || "None"
  const normalizedBadge = normalizeBadgeName(displayBadge);
  
  if (loading) {
    return (
      <Skeleton className="w-full h-48 rounded-3xl" />
    )
  }

  const tierKey = getTierKey(normalizedBadge);
  const tokens = getTierTokens(tierKey);
  const Icon = getBadgeIcon(normalizedBadge);
  const isPremium = ['platinum', 'diamond', 'vip'].includes(tierKey);
  
  console.log('🎖️ [BadgeCard] Display:', { badge, normalizedBadge, tierKey });
  
  return (
    <motion.button 
      onClick={() => window.location.href = '/app/badges'}
      className="w-full text-left relative"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Main Badge Card */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 border-2 backdrop-blur-xl cursor-pointer"
        style={{
          background: badgeTokens.gradients[tierKey].card,
          borderColor: `hsl(${tokens.primary} / 0.3)`,
          boxShadow: `0 0 30px hsl(${tokens.glow} / 0.3)`
        }}
      >
        {/* Animated gradient overlay */}
        <motion.div 
          className="absolute inset-0 opacity-60"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            background: badgeTokens.gradients[tierKey].card,
            backgroundSize: "200% 200%"
          }}
        />

        {/* Metallic shine effect for premium badges */}
        {isPremium && (
          <>
            <motion.div 
              className="absolute inset-0 opacity-30"
              animate={{
                backgroundPosition: ['-200% 0', '200% 0']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                background: "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.2) 50%, transparent 75%)",
                backgroundSize: "200% 100%"
              }}
            />
            {/* Sparkle particles */}
            {badgeTokens.particles[tierKey]?.enabled && (
              <>
                <motion.div 
                  className="absolute top-4 right-6"
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: `hsl(${tokens.glow})` }} />
                </motion.div>
                <motion.div 
                  className="absolute bottom-6 left-8"
                  animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, delay: 0.3, repeat: Infinity }}
                >
                  <Sparkles className="h-3 w-3" style={{ color: `hsl(${tokens.glow} / 0.6)` }} />
                </motion.div>
              </>
            )}
          </>
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Badge Icon */}
          <div 
            className="mb-4 w-fit p-4 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10"
            style={{ color: `hsl(${tokens.primary})` }}
          >
            <Icon className="h-8 w-8" />
          </div>

          {/* Badge Name */}
          <div className="mb-2">
            <h3 
              className="font-heading font-bold text-2xl tracking-wide"
              style={{ color: `hsl(${tokens.primary})` }}
            >
              {getBadgeDisplayName(normalizedBadge)}
            </h3>
            <p className="text-xs text-muted-foreground/70 uppercase tracking-widest mt-1">
              Current Rank
            </p>
          </div>

          {/* Badge Description */}
          <p className="text-sm text-foreground/70 leading-relaxed max-w-xs">
            {normalizedBadge === "VIP" && "Premium member with exclusive benefits and elite features"}
            {normalizedBadge === "Diamond" && "Elite member with maximum privileges"}
            {normalizedBadge === "Platinum" && "Distinguished member with premium benefits"}
            {normalizedBadge === "Gold" && "Top-tier member with advanced benefits"}
            {normalizedBadge === "Silver" && "Valued member with special perks"}
            {normalizedBadge === "None" && "Complete KYC and purchase a badge to unlock team rewards"}
          </p>

          {/* Premium Badge Indicator */}
          {isPremium && (
            <div 
              className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm border w-fit"
              style={{ 
                background: `hsl(${tokens.primary} / 0.1)`,
                borderColor: `hsl(${tokens.primary} / 0.2)`
              }}
            >
              <Crown className="h-3 w-3" style={{ color: `hsl(${tokens.accent})` }} />
              <span 
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: `hsl(${tokens.primary})` }}
              >
                Premium Tier
              </span>
            </div>
          )}
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
          <div 
            className="absolute top-0 right-0 w-full h-full rounded-bl-full"
            style={{ background: badgeTokens.gradients[tierKey].radial }}
          />
        </div>
        <div className="absolute bottom-0 left-0 w-24 h-24 opacity-20">
          <div 
            className="absolute bottom-0 left-0 w-full h-full rounded-tr-full"
            style={{ background: badgeTokens.gradients[tierKey].radial }}
          />
        </div>
        
        {/* View More Indicator */}
        <div className="absolute bottom-4 right-4">
          <ChevronRight className="h-5 w-5 text-white/40" />
        </div>
      </div>
    </motion.button>
  )
}
