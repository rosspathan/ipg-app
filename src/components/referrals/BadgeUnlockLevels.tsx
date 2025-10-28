import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { normalizeBadgeName } from "@/lib/badgeUtils";

interface BadgeThreshold {
  badge_name: string;
  unlock_levels: number;
  bsk_threshold: number;
}

export function BadgeUnlockLevels() {
  const { user } = useAuthUser();

  const { data: currentBadge } = useQuery({
    queryKey: ['current-badge', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return normalizeBadgeName(data?.current_badge);
    },
    enabled: !!user?.id,
  });

  const { data: badgeThresholds } = useQuery({
    queryKey: ['badge-thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_thresholds')
        .select('*')
        .order('bsk_threshold', { ascending: true });
      
      if (error) throw error;
      return data as BadgeThreshold[];
    },
  });

  if (!badgeThresholds) return null;

  const currentUnlockLevels = badgeThresholds.find(
    b => normalizeBadgeName(b.badge_name) === currentBadge
  )?.unlock_levels || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Commission Level Access
        </CardTitle>
        <CardDescription>
          Unlock more referral levels by upgrading your badge
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {badgeThresholds.map((threshold) => {
            const isCurrentBadge = normalizeBadgeName(threshold.badge_name) === currentBadge;
            const isUnlocked = threshold.unlock_levels <= currentUnlockLevels;

            return (
              <div
                key={threshold.badge_name}
                className={`
                  flex items-center justify-between p-4 rounded-lg border-2 transition-all
                  ${isCurrentBadge 
                    ? 'border-primary bg-primary/5' 
                    : isUnlocked 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-muted bg-muted/30'}
                `}
              >
                <div className="flex items-center gap-3">
                  {isUnlocked ? (
                    <Unlock className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={isCurrentBadge ? "default" : "secondary"}
                        className={isCurrentBadge ? "bg-primary" : ""}
                      >
                        {normalizeBadgeName(threshold.badge_name)}
                      </Badge>
                      {isCurrentBadge && (
                        <span className="text-xs text-primary font-medium">Your Badge</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Earn commissions from {threshold.unlock_levels} {threshold.unlock_levels === 1 ? 'level' : 'levels'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {threshold.bsk_threshold.toLocaleString()} BSK
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
