import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Users, GitBranch, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RebuildAllTreesTool } from "@/components/admin/RebuildAllTreesTool";
import { ReferralBackfillTool } from "@/components/admin/ReferralBackfillTool";

interface TreeHealthStats {
  totalUsersWithSponsors: number;
  usersWithCompleteTree: number;
  usersWithIncompleteTree: number;
  usersWithNoTree: number;
  avgTreeDepth: number;
  lockFailures: number;
}

export default function TreeHealthDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['tree-health-stats'],
    queryFn: async () => {
      // Get all users with locked sponsors
      const { data: usersWithSponsors, error: sponsorsError } = await supabase
        .from('referral_links_new')
        .select('user_id')
        .not('locked_at', 'is', null)
        .not('sponsor_id', 'is', null);

      if (sponsorsError) throw sponsorsError;

      const totalUsersWithSponsors = usersWithSponsors?.length || 0;

      // Get tree statistics
      const { data: treeStats, error: treeStatsError } = await supabase
        .from('referral_tree')
        .select('user_id, level');

      if (treeStatsError) throw treeStatsError;

      // Calculate stats
      const userTreeLevels = new Map<string, number>();
      treeStats?.forEach(record => {
        const currentMax = userTreeLevels.get(record.user_id) || 0;
        if (record.level > currentMax) {
          userTreeLevels.set(record.user_id, record.level);
        }
      });

      const usersWithTree = userTreeLevels.size;
      const usersWithNoTree = totalUsersWithSponsors - usersWithTree;

      // Users with complete tree (reaching 50 levels or having significant depth)
      let usersWithCompleteTree = 0;
      let usersWithIncompleteTree = 0;
      let totalDepth = 0;

      userTreeLevels.forEach(maxLevel => {
        totalDepth += maxLevel;
        if (maxLevel >= 10) { // Consider complete if at least 10 levels
          usersWithCompleteTree++;
        } else {
          usersWithIncompleteTree++;
        }
      });

      const avgTreeDepth = usersWithTree > 0 ? totalDepth / usersWithTree : 0;

      // Get lock failures: users who signed up but have no locked sponsor
      const { count: lockFailuresCount } = await supabase
        .from('referral_links_new')
        .select('*', { count: 'exact', head: true })
        .is('sponsor_id', null)
        .is('locked_at', null);

      return {
        totalUsersWithSponsors,
        usersWithCompleteTree,
        usersWithIncompleteTree,
        usersWithNoTree,
        avgTreeDepth: Math.round(avgTreeDepth * 10) / 10,
        lockFailures: lockFailuresCount || 0
      } as TreeHealthStats;
    }
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Referral Tree Health Dashboard</h1>
              <p className="text-muted-foreground">Monitor and fix referral tree integrity</p>
            </div>
          </div>
        </div>

        {/* Lock Failures Alert */}
        {stats && stats.lockFailures > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{stats.lockFailures}</strong> users signed up but have no locked sponsor. 
              They may have missed referral code capture or need manual assignment.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.totalUsersWithSponsors}
              </div>
              <p className="text-xs text-muted-foreground">
                With locked sponsors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Complete Trees</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.usersWithCompleteTree}
              </div>
              <p className="text-xs text-muted-foreground">
                10+ levels deep
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incomplete Trees</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.usersWithIncompleteTree}
              </div>
              <p className="text-xs text-muted-foreground">
                Less than 10 levels
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Tree</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.usersWithNoTree}
              </div>
              <p className="text-xs text-muted-foreground">
                Missing tree data
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lock Failures</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.lockFailures}
              </div>
              <p className="text-xs text-muted-foreground">
                No sponsor captured
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Average Depth Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Average Tree Depth
            </CardTitle>
            <CardDescription>
              The average number of levels in existing referral trees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{isLoading ? '...' : stats?.avgTreeDepth}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Levels per user (higher is better)
            </p>
          </CardContent>
        </Card>

        {/* Backfill Tool */}
        <ReferralBackfillTool />

        {/* Rebuild Tool */}
        <RebuildAllTreesTool />

        {/* Health Status */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Health Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.usersWithNoTree > 0 && (
                <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <div className="font-semibold text-destructive">Critical Issue</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.usersWithNoTree} users have no referral tree data. These users will not receive commissions
                      from their downline. Use the rebuild tool above to fix this.
                    </div>
                  </div>
                </div>
              )}

              {stats.usersWithIncompleteTree > 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <div className="font-semibold text-yellow-600 dark:text-yellow-500">Warning</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.usersWithIncompleteTree} users have shallow trees (less than 10 levels). 
                      This might indicate incomplete tree building. Consider using the force rebuild option.
                    </div>
                  </div>
                </div>
              )}

              {stats.usersWithNoTree === 0 && stats.usersWithIncompleteTree === 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-semibold text-green-600 dark:text-green-500">All Good!</div>
                    <div className="text-sm text-muted-foreground">
                      All referral trees are complete and healthy. Commission distribution should work correctly.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
