import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSponsorInfo } from '@/hooks/useSponsorInfo';
import { Users, Calendar, Award, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export function SponsorInfoCard() {
  const { data: sponsorInfo, isLoading } = useSponsorInfo();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Sponsor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sponsorInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Your Sponsor
          </CardTitle>
          <CardDescription>Referral information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg border-2 border-dashed">
            <div className="text-center">
              <Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="font-semibold">Independent Member</p>
              <p className="text-sm text-muted-foreground mt-1">
                You joined directly without a referral code
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = sponsorInfo.sponsor_display_name || sponsorInfo.sponsor_username || 'Unknown';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Your Sponsor
        </CardTitle>
        <CardDescription>The person who referred you</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Sponsor Name</p>
                <p className="font-semibold truncate">{displayName}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Join Date</p>
                <p className="font-semibold">
                  {format(new Date(sponsorInfo.join_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
              <Award className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Sponsor's Badge</p>
                {sponsorInfo.sponsor_badge ? (
                  <Badge variant="secondary" className="mt-1">
                    {sponsorInfo.sponsor_badge}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No badge yet</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Earned for Sponsor</p>
                <p className="font-semibold">
                  {sponsorInfo.total_earned_for_sponsor.toFixed(2)} BSK
                </p>
              </div>
            </div>
          </div>
        </div>

        {sponsorInfo.sponsor_code_used && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Referral Code Used: <span className="font-mono font-semibold">{sponsorInfo.sponsor_code_used}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
