import { motion } from "framer-motion";
import { TrendingUp, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { badgeTokens, getTierTokens, getTierKey } from "@/design-system/badge-tokens";
import { cn } from "@/lib/utils";

interface BadgeProgressTrackerProps {
  currentBadge: string;
  nextBadge?: {
    name: string;
    cost: number;
  };
  currentBalance: number;
  className?: string;
}

export function BadgeProgressTracker({
  currentBadge,
  nextBadge,
  currentBalance,
  className
}: BadgeProgressTrackerProps) {
  if (!nextBadge) {
    return (
      <div className={cn("p-6 rounded-xl bg-card border border-border", className)}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">Maximum Tier Reached</h4>
            <p className="text-sm text-muted-foreground">You're at the highest badge level!</p>
          </div>
        </div>
      </div>
    );
  }

  const bskNeeded = Math.max(0, nextBadge.cost - currentBalance);
  const progress = Math.min(100, (currentBalance / nextBadge.cost) * 100);
  const tierKey = getTierKey(nextBadge.name);
  const tokens = getTierTokens(tierKey);

  return (
    <div className={cn("p-6 rounded-xl bg-card border border-border space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: `hsl(${tokens.primary} / 0.1)` }}
          >
            <TrendingUp className="w-6 h-6" style={{ color: `hsl(${tokens.primary})` }} />
          </div>
          <div>
            <h4 className="font-semibold">Next Badge Tier</h4>
            <p className="text-sm" style={{ color: `hsl(${tokens.primary})` }}>
              {nextBadge.name}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Progress</p>
          <p className="text-2xl font-bold" style={{ color: `hsl(${tokens.primary})` }}>
            {progress.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ background: badgeTokens.gradients[tierKey].card }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {currentBalance.toLocaleString()} BSK
          </span>
          <span className="font-semibold">
            {nextBadge.cost.toLocaleString()} BSK
          </span>
        </div>
      </div>

      {/* BSK Needed */}
      {bskNeeded > 0 && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <span className="text-sm text-muted-foreground">BSK needed to upgrade</span>
          <span className="font-bold text-lg">{bskNeeded.toLocaleString()} BSK</span>
        </div>
      )}

      {/* Motivational Message */}
      {progress >= 80 && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-center font-medium"
          style={{ color: `hsl(${tokens.primary})` }}
        >
          You're almost there! 🎉
        </motion.p>
      )}
    </div>
  );
}
