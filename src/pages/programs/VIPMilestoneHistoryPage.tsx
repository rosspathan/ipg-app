import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate";
import { useVIPMilestoneHistory } from "@/hooks/useVIPMilestoneHistory";
import { useTeamReferrals } from "@/hooks/useTeamReferrals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Award, TrendingUp, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function VIPMilestoneHistoryPage() {
  const { data: history = [], isLoading: historyLoading } = useVIPMilestoneHistory();
  const { userVipMilestones } = useTeamReferrals();
  
  const currentVIPCount = userVipMilestones?.direct_vip_count || 0;

  const totalEarned = history.reduce((sum, item) => sum + Number(item.bsk_rewarded), 0);
  const totalMilestones = history.length;

  const handleExport = () => {
    const csvContent = [
      ['Date', 'VIP Count', 'Milestone', 'BSK Rewarded', 'Reward Type'].join(','),
      ...history.map(item => [
        item.claimed_at ? format(new Date(item.claimed_at), 'yyyy-MM-dd HH:mm:ss') : 'Pending',
        item.vip_count_at_claim,
        `${item.milestone.vip_count_threshold} VIP Referrals`,
        item.bsk_rewarded,
        item.milestone.reward_type
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vip-milestone-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (historyLoading) {
    return (
      <ProgramPageTemplate title="VIP Milestone History" subtitle="Track your achievements">
        <div className="space-y-4 pb-24">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </ProgramPageTemplate>
    );
  }

  return (
    <ProgramPageTemplate
      title="VIP Milestone History"
      subtitle="Complete history of your VIP milestone achievements"
    >
      <div className="space-y-6 pb-24">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-1">
                <Trophy className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{totalMilestones}</div>
                <div className="text-xs text-muted-foreground">Milestones</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-1">
                <Award className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{totalEarned.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">BSK Earned</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-1">
                <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{currentVIPCount}</div>
                <div className="text-xs text-muted-foreground">Current VIPs</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Button */}
        {history.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export History (CSV)
          </Button>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Achievement Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No milestones claimed yet. Keep referring VIP badge holders to unlock rewards!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative pl-8 pb-4 border-l-2 border-border last:border-0 last:pb-0"
                  >
                    <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                    
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="font-semibold">
                            {item.milestone.vip_count_threshold} VIP Referrals Milestone
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.claimed_at
                              ? format(new Date(item.claimed_at), 'MMM dd, yyyy · HH:mm')
                              : 'Pending claim'}
                          </div>
                        </div>
                        <Badge variant={item.claimed_at ? "default" : "secondary"}>
                          {item.claimed_at ? "Claimed" : "Pending"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground">VIP Count</div>
                          <div className="font-semibold">{item.vip_count_at_claim}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground">BSK Reward</div>
                          <div className="font-semibold text-primary">
                            {Number(item.bsk_rewarded).toFixed(0)} BSK
                          </div>
                        </div>
                      </div>

                      {item.milestone.reward_description && (
                        <div className="text-sm text-muted-foreground">
                          {item.milestone.reward_description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">About VIP Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • VIP milestones are unlocked when you refer a specific number of VIP badge holders
            </p>
            <p>
              • Only direct (Level 1) VIP referrals count toward milestones
            </p>
            <p>
              • You must be a VIP badge holder yourself to earn milestone rewards
            </p>
            <p>
              • Rewards are automatically credited as withdrawable BSK
            </p>
          </CardContent>
        </Card>
      </div>
    </ProgramPageTemplate>
  );
}
