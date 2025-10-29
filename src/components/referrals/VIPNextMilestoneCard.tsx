import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Milestone {
  id: string;
  vip_count_threshold: number;
  reward_type: string;
  reward_inr_value: number;
  reward_description: string | null;
}

interface VIPNextMilestoneCardProps {
  currentVIPCount: number;
  nextMilestone: Milestone | null;
  className?: string;
}

export function VIPNextMilestoneCard({
  currentVIPCount,
  nextMilestone,
  className
}: VIPNextMilestoneCardProps) {
  // Handle case when all milestones are completed
  if (!nextMilestone) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Trophy className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-primary">
                🎉 All Milestones Completed!
              </h3>
              <p className="text-sm text-muted-foreground">
                You're a VIP legend with {currentVIPCount} VIP referrals!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const threshold = nextMilestone.vip_count_threshold;
  const vipsNeeded = Math.max(0, threshold - currentVIPCount);
  const progress = Math.min(100, (currentVIPCount / threshold) * 100);
  const bskReward = nextMilestone.reward_inr_value;

  // Motivational messages based on progress
  const getMotivationalMessage = () => {
    if (progress === 0) {
      return "Start referring VIP members to unlock rewards!";
    } else if (progress >= 80) {
      return "Almost there! Keep going! 🎯";
    } else if (progress >= 50) {
      return "You're halfway there! 🔥";
    } else {
      return `${vipsNeeded} more VIP${vipsNeeded === 1 ? '' : 's'} to unlock your next reward!`;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-primary" />
          Next Milestone Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">
              {progress.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {currentVIPCount} / {threshold} VIPs
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 text-primary text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              {bskReward.toFixed(0)} BSK
            </div>
            <div className="text-xs text-muted-foreground">Reward</div>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="space-y-2">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="origin-left"
          >
            <Progress value={progress} className="h-3" />
          </motion.div>
        </div>

        {/* VIPs Needed Badge */}
        {vipsNeeded > 0 && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {vipsNeeded} VIP{vipsNeeded === 1 ? '' : 's'} needed
            </span>
          </div>
        )}

        {/* Ready to Claim */}
        {vipsNeeded === 0 && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 animate-pulse">
            <Trophy className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-success">
              Ready to claim! Visit progress page to claim your reward
            </span>
          </div>
        )}

        {/* Motivational Message */}
        <p className="text-center text-sm text-muted-foreground">
          {getMotivationalMessage()}
        </p>
      </CardContent>
    </Card>
  );
}
