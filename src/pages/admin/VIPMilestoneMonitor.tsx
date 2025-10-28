import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Users, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { normalizeBadgeName } from "@/lib/badgeUtils";

interface VIPUserProgress {
  user_id: string;
  email: string;
  current_badge: string;
  direct_vip_count: number;
  claimed_milestones: number;
  total_milestone_rewards: number;
  next_milestone_at: number | null;
  progress_to_next: number;
}

export default function VIPMilestoneMonitor() {
  // Fetch all VIP milestones
  const { data: milestones, isLoading: milestonesLoading } = useQuery({
    queryKey: ['admin-vip-milestones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_milestones')
        .select('*')
        .eq('is_active', true)
        .order('vip_count_threshold', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch all VIP users with their progress
  const { data: vipUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-vip-users-progress'],
    queryFn: async () => {
      // Get all VIP badge holders
      const { data: badgeHolders, error: badgeError } = await supabase
        .from('user_badge_holdings')
        .select('user_id, current_badge');
      
      if (badgeError) throw badgeError;

      // Filter for VIP users
      const vipUserIds = badgeHolders
        ?.filter(b => normalizeBadgeName(b.current_badge) === 'VIP')
        .map(b => b.user_id) || [];

      if (vipUserIds.length === 0) {
        return [];
      }

      // Get user profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', vipUserIds);

      if (profileError) throw profileError;

      // Calculate progress for each VIP user
      const usersWithProgress: VIPUserProgress[] = await Promise.all(
        vipUserIds.map(async (userId) => {
          const profile = profiles?.find(p => p.id === userId);
          
          // Get direct referrals
          const { data: directReferrals } = await supabase
            .from('referral_tree')
            .select('user_id')
            .eq('ancestor_id', userId)
            .eq('level', 1);

          const referralIds = directReferrals?.map(r => r.user_id) || [];

          // Count VIP referrals
          let vipCount = 0;
          if (referralIds.length > 0) {
            const { data: vipReferrals } = await supabase
              .from('user_badge_holdings')
              .select('user_id, current_badge')
              .in('user_id', referralIds);

            vipCount = vipReferrals?.filter(b => 
              normalizeBadgeName(b.current_badge) === 'VIP'
            ).length || 0;
          }

          // Get claimed milestones
          const { data: claims } = await supabase
            .from('user_vip_milestone_claims')
            .select('bsk_rewarded, milestone_id')
            .eq('user_id', userId);

          const claimedCount = claims?.length || 0;
          const totalRewards = claims?.reduce((sum, c) => sum + Number(c.bsk_rewarded || 0), 0) || 0;

          // Find next milestone
          const nextMilestone = milestones?.find(m => m.vip_count_threshold > vipCount);
          const progressToNext = nextMilestone 
            ? (vipCount / nextMilestone.vip_count_threshold) * 100 
            : 100;

          return {
            user_id: userId,
            email: profile?.email || 'Unknown',
            current_badge: 'VIP',
            direct_vip_count: vipCount,
            claimed_milestones: claimedCount,
            total_milestone_rewards: totalRewards,
            next_milestone_at: nextMilestone?.vip_count_threshold || null,
            progress_to_next: Math.min(progressToNext, 100)
          };
        })
      );

      return usersWithProgress.sort((a, b) => b.direct_vip_count - a.direct_vip_count);
    },
    enabled: !!milestones
  });

  // Calculate summary stats
  const totalVIPUsers = vipUsers?.length || 0;
  const totalVIPReferrals = vipUsers?.reduce((sum, u) => sum + u.direct_vip_count, 0) || 0;
  const totalRewardsDistributed = vipUsers?.reduce((sum, u) => sum + u.total_milestone_rewards, 0) || 0;
  const totalMilestonesClaimed = vipUsers?.reduce((sum, u) => sum + u.claimed_milestones, 0) || 0;

  if (milestonesLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">VIP Milestone Monitor</h1>
        <p className="text-muted-foreground">Track VIP user progress and milestone achievements</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VIP Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVIPUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VIP Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVIPReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milestones Claimed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMilestonesClaimed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BSK Distributed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRewardsDistributed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">BSK</p>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Milestones</CardTitle>
          <CardDescription>Active VIP milestone tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {milestones?.map((milestone) => (
              <Card key={milestone.id} className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">VIP Referrals Required</p>
                      <p className="text-2xl font-bold">{milestone.vip_count_threshold}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Reward</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {Number(milestone.reward_inr_value).toLocaleString()} BSK
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{milestone.reward_description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Progress Table */}
      <Card>
        <CardHeader>
          <CardTitle>VIP User Progress</CardTitle>
          <CardDescription>Individual progress tracking for all VIP users</CardDescription>
        </CardHeader>
        <CardContent>
          {vipUsers && vipUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead className="text-center">Direct VIP Referrals</TableHead>
                  <TableHead className="text-center">Claimed Milestones</TableHead>
                  <TableHead className="text-center">Total Rewards (BSK)</TableHead>
                  <TableHead>Progress to Next</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vipUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-primary/10 text-primary">
                        {user.direct_vip_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {user.claimed_milestones} / {milestones?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-green-600 dark:text-green-400">
                      {user.total_milestone_rewards.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {user.next_milestone_at ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>Next: {user.next_milestone_at} VIPs</span>
                            <span>{Math.round(user.progress_to_next)}%</span>
                          </div>
                          <Progress value={user.progress_to_next} className="h-2" />
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                          All Complete ✓
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No VIP users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
