import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTeamReferrals } from '@/hooks/useTeamReferrals';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Trophy, TrendingUp, Users, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UserReferralStatsWidget() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const {
    referralLedger,
    badgeThresholds,
    teamIncomeLevels,
    loading
  } = useTeamReferrals();

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const userLedger = referralLedger.filter(entry => entry.user_id === user?.id);
  const totalEarned = userLedger.reduce((sum, entry) => sum + entry.bsk_amount, 0);
  const withdrawableEarned = userLedger
    .filter(e => teamIncomeLevels.find(l => l.level === e.depth)?.balance_type === 'withdrawable')
    .reduce((sum, entry) => sum + entry.bsk_amount, 0);
  const holdingEarned = totalEarned - withdrawableEarned;

  // Get total referral count (approximate based on unique source_user_ids)
  const uniqueReferrals = new Set(userLedger.map(e => e.source_user_id).filter(Boolean));
  const totalReferrals = uniqueReferrals.size;

  // Get active levels (simplified - would need user badge data)
  const activeLevels = teamIncomeLevels.filter(l => l.is_active).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Team Referrals
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/app/programs/team-referrals')}
          >
            View Details
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardTitle>
        <CardDescription>
          Your referral network earnings and stats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Trophy className="w-5 h-5 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold">{totalEarned.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">BSK Earned</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">L{activeLevels}</p>
            <p className="text-xs text-muted-foreground">Unlocked Levels</p>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Earnings Breakdown</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded">
              <span className="text-sm">Withdrawable</span>
              <span className="font-bold text-green-600">{withdrawableEarned.toFixed(2)} BSK</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded">
              <span className="text-sm">Holding</span>
              <span className="font-bold text-blue-600">{holdingEarned.toFixed(2)} BSK</span>
            </div>
          </div>
        </div>

        {/* Unlock More Levels CTA */}
        {activeLevels < 50 && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Unlock More Levels</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Upgrade your badge to unlock levels {activeLevels + 1}-50 and earn from deeper in your network
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/app/programs/badge-subscription')}
                >
                  Upgrade Badge
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Summary */}
        {userLedger.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Recent Activity</p>
            <div className="space-y-2">
              {userLedger.slice(0, 3).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                  <div>
                    <p className="font-medium">
                      {entry.ledger_type === 'team_income' ? `L${entry.depth} Team` : 'Direct Bonus'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-bold text-primary">+{entry.bsk_amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {userLedger.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No referral earnings yet</p>
            <p className="text-xs">Share your link to start earning BSK!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
