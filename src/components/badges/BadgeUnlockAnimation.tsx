import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Confetti from "react-confetti";
import { Shield, Star, Crown, Gem, Sparkles, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { badgeTokens, getTierTokens, getTierKey } from "@/design-system/badge-tokens";

interface BadgeUnlockAnimationProps {
  badge: string;
  isOpen: boolean;
  onClose: () => void;
  onShare?: () => void;
}

const getBadgeIcon = (tier: string) => {
  const tierUpper = tier.toUpperCase();
  switch (tierUpper) {
    case 'SILVER': return Shield;
    case 'GOLD': return Star;
    case 'PLATINUM': return Gem;
    case 'DIAMOND': return Sparkles;
    case 'VIP': return Crown;
    default: return Shield;
  }
};

export function BadgeUnlockAnimation({ badge, isOpen, onClose, onShare }: BadgeUnlockAnimationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const tierKey = getTierKey(badge);
  const tokens = getTierTokens(tierKey);
  const Icon = getBadgeIcon(badge);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          colors={[
            `hsl(${tokens.primary})`,
            `hsl(${tokens.secondary})`,
            `hsl(${tokens.accent})`,
            `hsl(${tokens.glow})`
          ]}
        />
      )}

      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <div className="relative z-10 text-center space-y-8 px-4">
        {/* Badge Icon with Animation */}
        <motion.div
          initial={{ scale: 0, rotateY: 0 }}
          animate={{ scale: 1, rotateY: 360 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mx-auto w-40 h-40 rounded-full flex items-center justify-center relative"
          style={{
            background: badgeTokens.gradients[tierKey].card,
            boxShadow: `0 0 60px hsl(${tokens.glow})`
          }}
        >
          {/* Pulsing glow */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: `hsl(${tokens.glow})` }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity
            }}
          />
          <Icon className="w-20 h-20 relative z-10" style={{ color: `hsl(${tokens.text})` }} />
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <h2 className="text-4xl font-bold text-white">
            Badge Unlocked!
          </h2>
          <p className="text-2xl font-semibold" style={{ color: `hsl(${tokens.primary})` }}>
            {badge} Tier
          </p>
          <p className="text-white/70 max-w-md mx-auto">
            Congratulations! You've unlocked the {badge} badge and gained access to exclusive benefits.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-4"
        >
          {onShare && (
            <Button
              onClick={onShare}
              variant="outline"
              size="lg"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Achievement
            </Button>
          )}
          <Button
            onClick={onClose}
            size="lg"
            style={{
              background: badgeTokens.gradients[tierKey].card,
              color: 'white'
            }}
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
