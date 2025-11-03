import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleDot, TrendingUp, Users, DollarSign, Award, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function SpinAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['spin-analytics'],
    queryFn: async () => {
      // Get spin stats
      const { data: spinStats } = await supabase
        .from('ismart_spins')
        .select('bet_bsk, payout_bsk, fee_bsk, multiplier, was_free_spin, segment_label, created_at');

      // Get user limits
      const { data: userStats } = await supabase
        .from('ismart_user_limits')
        .select('lifetime_spins_count, free_spins_remaining, free_spins_used');

      // Get segments
      const { data: segments } = await supabase
        .from('ismart_spin_segments')
        .select('label, multiplier, weight, is_active')
        .eq('is_active', true);

      const totalSpins = spinStats?.length || 0;
      const totalBet = spinStats?.reduce((sum, s) => sum + Number(s.bet_bsk || 0), 0) || 0;
      const totalPayout = spinStats?.reduce((sum, s) => sum + Number(s.payout_bsk || 0), 0) || 0;
      const totalFees = spinStats?.reduce((sum, s) => sum + Number(s.fee_bsk || 0), 0) || 0;
      const freeSpins = spinStats?.filter(s => s.was_free_spin).length || 0;
      const netRevenue = totalBet + totalFees - totalPayout;

      const uniqueUsers = userStats?.length || 0;
      const avgSpinsPerUser = uniqueUsers > 0 ? (totalSpins / uniqueUsers).toFixed(1) : 0;

      // Spins over time (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const spinsByDay = last7Days.map(date => {
        const daySpins = spinStats?.filter(s => 
          s.created_at?.startsWith(date)
        ) || [];
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          spins: daySpins.length,
          revenue: daySpins.reduce((sum, s) => sum + Number(s.bet_bsk || 0) + Number(s.fee_bsk || 0), 0),
          payout: daySpins.reduce((sum, s) => sum + Number(s.payout_bsk || 0), 0)
        };
      });

      // Segment performance
      const segmentPerformance = segments?.map(seg => {
        const segSpins = spinStats?.filter(s => s.segment_label === seg.label) || [];
        const hitRate = totalSpins > 0 ? (segSpins.length / totalSpins * 100).toFixed(1) : 0;
        return {
          label: seg.label,
          multiplier: Number(seg.multiplier),
          weight: seg.weight,
          hits: segSpins.length,
          hitRate: Number(hitRate),
          expectedRate: (seg.weight / segments.reduce((sum, s) => sum + s.weight, 0) * 100).toFixed(1)
        };
      }) || [];

      // Multiplier distribution
      const multiplierDistribution = spinStats?.reduce((acc: any[], spin) => {
        const mult = Number(spin.multiplier);
        const existing = acc.find(m => m.multiplier === mult);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ multiplier: `${mult}x`, count: 1 });
        }
        return acc;
      }, []).sort((a, b) => parseFloat(a.multiplier) - parseFloat(b.multiplier)) || [];

      return {
        totalSpins,
        totalBet,
        totalPayout,
        totalFees,
        netRevenue,
        freeSpins,
        paidSpins: totalSpins - freeSpins,
        uniqueUsers,
        avgSpinsPerUser,
        spinsByDay,
        segmentPerformance,
        multiplierDistribution,
        houseEdge: totalBet > 0 ? ((netRevenue / totalBet) * 100).toFixed(2) : 0
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
            <CardTitle className="text-sm font-medium">Total Spins</CardTitle>
            <CircleDot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSpins}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.freeSpins} free, {analytics.paidSpins} paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wagered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalBet.toFixed(0)} BSK</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.totalFees.toFixed(0)} fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPayout.toFixed(0)} BSK</div>
            <p className="text-xs text-muted-foreground">
              Across all spins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analytics.netRevenue.toFixed(0)} BSK</div>
            <p className="text-xs text-muted-foreground">
              {analytics.houseEdge}% house edge
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">
              Avg {analytics.avgSpinsPerUser} spins/user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activity & Revenue (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.spinsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="spins" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Spins"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Revenue (BSK)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Multiplier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.multiplierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ multiplier, count }) => `${multiplier}: ${count}`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="count"
                >
                  {analytics.multiplierDistribution.map((entry: any, index: number) => (
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Segment Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.segmentPerformance.map((seg: any) => (
                <div key={seg.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{seg.label} ({seg.multiplier}x)</p>
                      <p className="text-xs text-muted-foreground">
                        Weight: {seg.weight} | Expected: {seg.expectedRate}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{seg.hits} hits</p>
                      <p className="text-xs text-muted-foreground">{seg.hitRate}% actual</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${seg.hitRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
