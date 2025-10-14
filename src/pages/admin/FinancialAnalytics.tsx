import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/admin/reports/MetricCard";
import { ChartComponents } from "@/components/admin/reports/ChartComponents";
import { TrendingUp, Users, DollarSign, Activity } from "lucide-react";
import { format, subDays } from "date-fns";

export default function FinancialAnalytics() {
  const { data: todayMetrics } = useQuery({
    queryKey: ["daily-metrics", format(new Date(), "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calculate_daily_metrics", {
        p_date: format(new Date(), "yyyy-MM-dd"),
      });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: historicalMetrics } = useQuery({
    queryKey: ["historical-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_platform_metrics")
        .select("*")
        .gte("metric_date", format(subDays(new Date(), 30), "yyyy-MM-dd"))
        .order("metric_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: bskBalances } = useQuery({
    queryKey: ["bsk-balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance, holding_balance");
      if (error) throw error;
      return data;
    },
  });

  const { data: inrBalances } = useQuery({
    queryKey: ["inr-balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_inr_balances")
        .select("balance");
      if (error) throw error;
      return data;
    },
  });

  const totalBSK =
    bskBalances?.reduce(
      (sum, b) => sum + Number(b.withdrawable_balance) + Number(b.holding_balance),
      0
    ) || 0;

  const totalINR =
    inrBalances?.reduce((sum, b) => sum + Number(b.balance), 0) || 0;

  const tvl = totalBSK + totalINR;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Analytics</h1>
        <p className="text-muted-foreground">
          Real-time metrics and insights for platform performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Value Locked"
          value={`₹${tvl.toLocaleString()}`}
          icon={DollarSign}
          trend={5.2}
          description="Combined BSK + INR"
        />
        <MetricCard
          title="Active Users (24h)"
          value={todayMetrics?.active_users_24h || 0}
          icon={Users}
          trend={12.5}
          description="Last 24 hours"
        />
        <MetricCard
          title="Transaction Volume"
          value={`₹${((todayMetrics?.deposits_amount || 0) + (todayMetrics?.withdrawals_amount || 0)).toLocaleString()}`}
          icon={Activity}
          trend={-3.1}
          description="Today's total"
        />
        <MetricCard
          title="Total Users"
          value={todayMetrics?.total_users || 0}
          icon={TrendingUp}
          trend={8.7}
          description="All time"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>BSK Circulation (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartComponents
              type="line"
              data={
                historicalMetrics?.map((m) => ({
                  date: format(new Date(m.metric_date), "MMM dd"),
                  withdrawable: Number(m.bsk_withdrawable_total),
                  holding: Number(m.bsk_holding_total),
                })) || []
              }
              xKey="date"
              yKeys={["withdrawable", "holding"]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>INR Balance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartComponents
              type="area"
              data={
                historicalMetrics?.map((m) => ({
                  date: format(new Date(m.metric_date), "MMM dd"),
                  balance: Number(m.inr_total_balance),
                })) || []
              }
              xKey="date"
              yKeys={["balance"]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Transaction Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartComponents
              type="bar"
              data={
                historicalMetrics?.map((m) => ({
                  date: format(new Date(m.metric_date), "MMM dd"),
                  deposits: Number(m.deposits_amount),
                  withdrawals: Number(m.withdrawals_amount),
                })) || []
              }
              xKey="date"
              yKeys={["deposits", "withdrawals"]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartComponents
              type="line"
              data={
                historicalMetrics?.map((m) => ({
                  date: format(new Date(m.metric_date), "MMM dd"),
                  total: Number(m.total_users),
                  new: Number(m.new_users),
                })) || []
              }
              xKey="date"
              yKeys={["total", "new"]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
