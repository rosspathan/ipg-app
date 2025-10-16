import { motion } from "framer-motion";
import { Users, TrendingUp, Shield, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { badgeTokens, getTierTokens } from "@/design-system/badge-tokens";
import { cn } from "@/lib/utils";

interface TierCount {
  tier: string;
  count: number;
}

interface BadgeSocialProofProps {
  className?: string;
}

const getTierKey = (badge: string): keyof typeof badgeTokens.tiers => {
  const key = badge.toLowerCase() as keyof typeof badgeTokens.tiers;
  return badgeTokens.tiers[key] ? key : 'none';
};

export function BadgeSocialProof({ className }: BadgeSocialProofProps) {
  const [tierCounts, setTierCounts] = useState<TierCount[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get tier counts
        const { data: badgeData } = await supabase
          .from('user_badge_holdings')
          .select('current_badge');

        if (badgeData) {
          const counts: Record<string, number> = {};
          let total = 0;

          badgeData.forEach((record) => {
            const tier = record.current_badge?.toUpperCase() || 'NONE';
            if (tier !== 'NONE') {
              counts[tier] = (counts[tier] || 0) + 1;
              total++;
            }
          });

          const tierArray = Object.entries(counts).map(([tier, count]) => ({
            tier,
            count
          }));

          setTierCounts(tierArray);
          setTotalUsers(total);
        }
      } catch (error) {
        console.error('Error fetching badge stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className={cn("animate-pulse space-y-4", className)}>
        <div className="h-24 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overall Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 bg-gradient-to-br from-primary/10 via-accent/5 to-background border-2 border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Badge Holders</p>
              <motion.p
                className="text-4xl font-bold text-primary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {totalUsers.toLocaleString()}
              </motion.p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <Award className="w-6 h-6 text-accent mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
            <div className="text-center">
              <Shield className="w-6 h-6 text-success mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Secure</p>
            </div>
            <div className="text-center">
              <TrendingUp className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Growing</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tier Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tierCounts.map((tierCount, index) => {
          const tierKey = getTierKey(tierCount.tier);
          const tokens = getTierTokens(tierKey);

          return (
            <motion.div
              key={tierCount.tier}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl p-4 border-2 bg-card relative overflow-hidden"
              style={{ borderColor: `hsl(${tokens.primary} / 0.2)` }}
            >
              {/* Background Glow */}
              <div
                className="absolute inset-0 opacity-5"
                style={{ background: badgeTokens.gradients[tierKey].radial }}
              />

              <div className="relative z-10">
                <p className="text-sm text-muted-foreground mb-2">{tierCount.tier}</p>
                <motion.p
                  className="text-3xl font-bold"
                  style={{ color: `hsl(${tokens.primary})` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {tierCount.count}
                </motion.p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((tierCount.count / totalUsers) * 100).toFixed(1)}% of holders
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Trust Indicators */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4 text-success" />
          <span>Secure Payments</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Award className="w-4 h-4 text-accent" />
          <span>Verified Platform</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4 text-primary" />
          <span>Active Community</span>
        </div>
      </div>
    </div>
  );
}
