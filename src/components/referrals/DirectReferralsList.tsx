import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDirectReferrals } from '@/hooks/useDirectReferrals';
import { Users, Calendar, TrendingUp, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';

export function DirectReferralsList() {
  const { data: referrals, isLoading } = useDirectReferrals();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Direct Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeReferrals = referrals?.filter(r => r.is_active) || [];
  const totalEarnings = referrals?.reduce((sum, r) => sum + r.total_earned, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Your Direct Team
        </CardTitle>
        <CardDescription>
          People you've directly referred • {referrals?.length || 0} total ({activeReferrals.length} active)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!referrals || referrals.length === 0 ? (
          <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg border-2 border-dashed">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold mb-1">No Direct Referrals Yet</p>
              <p className="text-sm text-muted-foreground">
                Share your referral code to start building your team
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{referrals.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{activeReferrals.length}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Total Earned from Team</p>
                <p className="text-2xl font-bold">{totalEarnings.toFixed(2)} BSK</p>
              </div>
            </div>

            {/* Referrals List */}
            <div className="space-y-3">
              {referrals.map((referral) => {
                const displayName = referral.display_name || referral.username || referral.email.split('@')[0];
                
                return (
                  <div
                    key={referral.user_id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {referral.is_active ? (
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <UserX className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{displayName}</p>
                          <p className="text-sm text-muted-foreground truncate">{referral.email}</p>
                        </div>
                        {referral.badge_name && (
                          <Badge variant="secondary" className="flex-shrink-0">
                            {referral.badge_name}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Joined {format(new Date(referral.join_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Earned: <span className="font-semibold text-foreground">{referral.total_earned.toFixed(2)} BSK</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
