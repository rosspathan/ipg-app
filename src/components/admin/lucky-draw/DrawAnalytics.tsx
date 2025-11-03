import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Ticket, DollarSign, Users, TrendingUp, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function DrawAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['draw-analytics'],
    queryFn: async () => {
      // Get draw configs stats
      const { data: drawStats } = await supabase
        .from('draw_configs')
        .select('state, pool_size, ticket_price_bsk, current_participants, created_at');

      // Get ticket stats
      const { data: ticketStats } = await supabase
        .from('draw_tickets')
        .select('status, bsk_paid, prize_rank, created_at');

      // Get prize distribution
      const { data: prizeStats } = await supabase
        .from('draw_prizes')
        .select('rank, amount_bsk');

      const totalDraws = drawStats?.length || 0;
      const activeDraws = drawStats?.filter(d => d.state === 'open').length || 0;
      const completedDraws = drawStats?.filter(d => d.state === 'completed').length || 0;
      
      const totalTicketsSold = ticketStats?.length || 0;
      const totalRevenue = ticketStats?.reduce((sum, t) => sum + Number(t.bsk_paid || 0), 0) || 0;
      const totalPrizesPaid = prizeStats?.reduce((sum, t) => sum + Number(t.amount_bsk || 0), 0) || 0;
      
      // Participation by draw state
      const stateDistribution = [
        { name: 'Open', value: activeDraws },
        { name: 'Completed', value: completedDraws },
        { name: 'Expired', value: drawStats?.filter(d => d.state === 'expired').length || 0 },
      ];

      // Revenue over time (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const revenueByDay = last7Days.map(date => {
        const dayTickets = ticketStats?.filter(t => 
          t.created_at?.startsWith(date)
        ) || [];
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayTickets.reduce((sum, t) => sum + Number(t.bsk_paid || 0), 0),
          tickets: dayTickets.length
        };
      });

      // Prize distribution
      const prizeDistribution = prizeStats?.reduce((acc: any[], prize) => {
        const existing = acc.find(p => p.rank === prize.rank);
        if (existing) {
          existing.total += Number(prize.amount_bsk);
          existing.count += 1;
        } else {
          acc.push({
            rank: prize.rank,
            total: Number(prize.amount_bsk),
            count: 1
          });
        }
        return acc;
      }, []) || [];

      return {
        totalDraws,
        activeDraws,
        completedDraws,
        totalTicketsSold,
        totalRevenue,
        totalPrizesPaid,
        netRevenue: totalRevenue - totalPrizesPaid,
        stateDistribution,
        revenueByDay,
        prizeDistribution,
        avgTicketsPerDraw: totalDraws > 0 ? (totalTicketsSold / totalDraws).toFixed(1) : 0
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
            <CardTitle className="text-sm font-medium">Total Draws</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDraws}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeDraws} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTicketsSold}</div>
            <p className="text-xs text-muted-foreground">
              Avg {analytics.avgTicketsPerDraw} per draw
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRevenue.toFixed(0)} BSK</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalPrizesPaid.toFixed(0)} BSK paid
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
              After prizes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Draw Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.stateDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {analytics.stateDistribution.map((entry: any, index: number) => (
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
            <CardTitle>Tickets Sold (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Bar dataKey="tickets" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prize Distribution by Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.prizeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="rank" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
