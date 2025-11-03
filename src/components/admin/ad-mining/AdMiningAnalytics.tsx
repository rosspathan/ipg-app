import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, DollarSign, Users, TrendingUp, Award, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function AdMiningAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['ad-mining-analytics'],
    queryFn: async () => {
      // Get ad clicks data
      const { data: clicks } = await supabase
        .from('ad_clicks')
        .select('user_id, reward_bsk, subscription_tier, started_at, completed_at');

      // Get active subscriptions
      const { data: subscriptions } = await supabase
        .from('ad_user_subscriptions')
        .select('status, tier_id, daily_bsk, total_earned_bsk, start_date, end_date, created_at');

      // Get subscription tiers
      const { data: tiers } = await supabase
        .from('ad_subscription_tiers')
        .select('id, tier_bsk, daily_bsk, duration_days, is_active');

      // Get daily ad views
      const { data: dailyViews } = await supabase
        .from('user_daily_ad_views')
        .select('date_key, free_views_used, subscription_views_used, total_bsk_earned');

      const totalClicks = clicks?.length || 0;
      const completedClicks = clicks?.filter(c => c.completed_at).length || 0;
      const totalRewards = clicks?.reduce((sum, c) => sum + Number(c.reward_bsk || 0), 0) || 0;
      const uniqueUsers = new Set(clicks?.map(c => c.user_id)).size;

      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
      const totalSubscriptionRevenue = subscriptions?.reduce((sum, s) => sum + Number(s.total_earned_bsk || 0), 0) || 0;

      // Completion rate
      const completionRate = totalClicks > 0 ? ((completedClicks / totalClicks) * 100).toFixed(1) : 0;

      // Last 7 days activity
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const activityByDay = last7Days.map(date => {
        const dayClicks = clicks?.filter(c => 
          c.started_at?.startsWith(date)
        ) || [];
        const dayViews = dailyViews?.filter(v => v.date_key === date) || [];
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          clicks: dayClicks.length,
          rewards: dayClicks.reduce((sum, c) => sum + Number(c.reward_bsk || 0), 0),
          freeViews: dayViews.reduce((sum, v) => sum + (v.free_views_used || 0), 0),
          subViews: dayViews.reduce((sum, v) => sum + (v.subscription_views_used || 0), 0)
        };
      });

      // Subscription tier distribution
      const tierDistribution = subscriptions?.reduce((acc: any[], sub) => {
        const tier = tiers?.find(t => t.id === sub.tier_id);
        if (!tier) return acc;
        
        const existing = acc.find(t => t.tierId === tier.id);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({
            tierId: tier.id,
            name: `${tier.tier_bsk} BSK`,
            count: 1,
            dailyBsk: Number(tier.daily_bsk)
          });
        }
        return acc;
      }, []) || [];

      // Subscription status breakdown
      const statusBreakdown = [
        { name: 'Active', value: subscriptions?.filter(s => s.status === 'active').length || 0 },
        { name: 'Expired', value: subscriptions?.filter(s => s.status === 'expired').length || 0 },
        { name: 'Cancelled', value: subscriptions?.filter(s => s.status === 'cancelled').length || 0 },
      ];

      // Free vs Subscription views
      const viewsBreakdown = [
        { name: 'Free', value: dailyViews?.reduce((sum, v) => sum + (v.free_views_used || 0), 0) || 0 },
        { name: 'Subscription', value: dailyViews?.reduce((sum, v) => sum + (v.subscription_views_used || 0), 0) || 0 },
      ];

      return {
        totalClicks,
        completedClicks,
        totalRewards,
        uniqueUsers,
        activeSubscriptions,
        totalSubscriptionRevenue,
        completionRate,
        avgRewardPerClick: totalClicks > 0 ? (totalRewards / totalClicks).toFixed(2) : 0,
        avgClicksPerUser: uniqueUsers > 0 ? (totalClicks / uniqueUsers).toFixed(1) : 0,
        activityByDay,
        tierDistribution,
        statusBreakdown,
        viewsBreakdown
      };
    },
    refetchInterval: 30000
  });

  if (isLoading || !analytics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ad Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalClicks}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRewards.toFixed(0)} BSK</div>
            <p className="text-xs text-muted-foreground">
              Avg {analytics.avgRewardPerClick} BSK/view
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">
              Avg {analytics.avgClicksPerUser} views/user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analytics.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalSubscriptionRevenue.toFixed(0)} BSK earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activity & Rewards (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.activityByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  stackId="1"
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="rewards" 
                  stackId="2"
                  stroke="hsl(var(--secondary))" 
                  fill="hsl(var(--secondary))"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Free vs Subscription Views</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.viewsBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {analytics.viewsBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.statusBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.tierDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
