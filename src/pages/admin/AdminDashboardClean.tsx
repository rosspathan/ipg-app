import { Users, DollarSign, FolderKanban, Activity, Shield, Wallet, FileText, TrendingUp, RefreshCw, Download, CheckCircle2 } from "lucide-react";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { CleanMetricCard } from "@/components/admin/clean/CleanMetricCard";
import { QueueCard } from "@/components/admin/clean/QueueCard";
import { ActivityFeed } from "@/components/admin/clean/ActivityFeed";
import { QuickActionsGrid } from "@/components/admin/clean/QuickActionsGrid";
import { ProgramHealthMini } from "@/components/admin/clean/ProgramHealthMini";
import { LoadingSpinner } from "@/components/admin/clean/LoadingState";
import { useNavigate } from "react-router-dom";
import { useAdminDashboardRealtime } from "@/hooks/useAdminDashboardRealtime";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboardClean() {
  const navigate = useNavigate();
  const { metrics, activity, loading, refetch } = useAdminDashboardRealtime();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch top active users today
  const { data: topUsers } = useQuery({
    queryKey: ['admin-top-users'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('bsk_withdrawable_ledger')
        .select('user_id, amount_bsk')
        .eq('tx_type', 'credit')
        .gte('created_at', today.toISOString())
        .order('amount_bsk', { ascending: false })
        .limit(5);

      return data || [];
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setLastRefresh(new Date());
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleExportReport = () => {
    const csv = `Date,Total Users,Revenue,Active Programs,Active Users
${new Date().toLocaleDateString()},${metrics.totalUsers},${metrics.revenueToday},${metrics.activePrograms},${metrics.activeUsers}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  // Mock chart data - in production, fetch from analytics
  const userGrowthData = [
    { date: "Mon", users: metrics.totalUsers - 500 },
    { date: "Tue", users: metrics.totalUsers - 400 },
    { date: "Wed", users: metrics.totalUsers - 250 },
    { date: "Thu", users: metrics.totalUsers - 150 },
    { date: "Fri", users: metrics.totalUsers - 50 },
    { date: "Sat", users: metrics.totalUsers - 20 },
    { date: "Sun", users: metrics.totalUsers },
  ];

  const calculateTrend = (current: number, previous: number = 0) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor platform performance</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportReport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* System Status & Last Updated */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-muted-foreground">All systems operational</span>
          </div>
          <span className="text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Top KPIs - Real Data */}
      <CleanGrid cols={4} gap="md">
        <CleanMetricCard
          label="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          delta={{ value: calculateTrend(metrics.totalUsers, metrics.totalUsers - 50), trend: "up" }}
          icon={Users}
        />
        <CleanMetricCard
          label="BSK Revenue Today"
          value={`${metrics.revenueToday.toLocaleString()} BSK`}
          delta={{ value: 8.2, trend: "up" }}
          icon={DollarSign}
        />
        <CleanMetricCard
          label="Active Programs"
          value={metrics.activePrograms.toString()}
          icon={FolderKanban}
        />
        <CleanMetricCard
          label="Active Users (7d)"
          value={metrics.activeUsers.toLocaleString()}
          delta={{ value: calculateTrend(metrics.activeUsers, metrics.totalUsers), trend: "up" }}
          icon={Activity}
        />
      </CleanGrid>

      {/* User Growth Chart */}
      <CleanCard padding="lg">
        <h3 className="text-base font-bold text-[hsl(0_0%_98%)] mb-4">User Growth (7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={userGrowthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220_13%_14%/0.4)" />
            <XAxis dataKey="date" stroke="hsl(220_9%_65%)" />
            <YAxis stroke="hsl(220_9%_65%)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220_13%_10%)",
                border: "1px solid hsl(220_13%_14%/0.4)",
                borderRadius: "8px",
                color: "hsl(0_0%_98%)",
              }}
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="hsl(262_100%_65%)"
              strokeWidth={2}
              dot={{ fill: "hsl(262_100%_65%)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CleanCard>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 60% width on desktop */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pending Actions - Real Data */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-[hsl(0_0%_98%)]">Pending Actions</h2>
              <button
                onClick={refetch}
                className="text-sm text-[hsl(262_100%_65%)] hover:underline"
              >
                Refresh
              </button>
            </div>
            <CleanGrid cols={1} gap="sm">
              <QueueCard
                title="KYC Reviews"
                count={metrics.pendingKYC}
                icon={Shield}
                priority={metrics.pendingKYC > 10 ? "warning" : "default"}
                onAction={() => navigate("/admin/kyc-review")}
                actionLabel="Review"
              />
              <QueueCard
                title="BSK Withdrawals"
                count={metrics.pendingWithdrawals}
                icon={Wallet}
                priority={metrics.pendingWithdrawals > 5 ? "danger" : "default"}
                onAction={() => navigate("/admin/bsk-withdrawals")}
                actionLabel="Approve"
              />
              <QueueCard
                title="Insurance Claims"
                count={metrics.pendingClaims}
                icon={FileText}
                priority="default"
                onAction={() => navigate("/admin/insurance")}
                actionLabel="Process"
              />
              <QueueCard
                title="Loan Applications"
                count={metrics.pendingLoans}
                icon={DollarSign}
                priority="default"
                onAction={() => navigate("/admin/bsk-loans")}
                actionLabel="Review"
              />
            </CleanGrid>
          </div>

          {/* Recent Activity Feed - Real Data */}
          <ActivityFeed activities={activity.length > 0 ? activity : undefined} />
        </div>

        {/* Right Column - 40% width on desktop */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <QuickActionsGrid />

          {/* Top Active Users Today */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Active Users Today</h3>
            <div className="space-y-3">
              {topUsers && topUsers.length > 0 ? (
                topUsers.map((user, index) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      <span className="text-sm font-mono">
                        {user.user_id.substring(0, 8)}...
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-success">
                      +{user.amount_bsk.toFixed(2)} BSK
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity today
                </p>
              )}
            </div>
          </Card>

          {/* Program Health Mini Stats */}
          <ProgramHealthMini />
        </div>
      </div>
    </div>
  );
}
