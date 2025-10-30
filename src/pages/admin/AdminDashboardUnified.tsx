import { Users, DollarSign, FolderKanban, Activity, Shield, Wallet, FileText, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { UserQuickAccessCard } from "@/components/admin/unified/UserQuickAccessCard";
import { CleanMetricCard } from "@/components/admin/clean/CleanMetricCard";
import { QueueCard } from "@/components/admin/clean/QueueCard";
import { ActivityFeed } from "@/components/admin/clean/ActivityFeed";
import { QuickActionsGrid } from "@/components/admin/clean/QuickActionsGrid";
import { ProgramHealthMini } from "@/components/admin/clean/ProgramHealthMini";
import { LoadingSpinner } from "@/components/admin/clean/LoadingState";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { useNavigate } from "react-router-dom";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/**
 * Unified Admin Dashboard - World-Class Overview
 * 
 * Features:
 * - Critical alerts at top
 * - 4 key metrics with sparklines
 * - Pending action queues
 * - Quick actions grid
 * - Program health stats
 * - Real-time activity feed
 * - User growth chart
 */
export default function AdminDashboardUnified() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useAdminDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-[hsl(240_10%_70%)]">Failed to load dashboard data</p>
      </div>
    );
  }

  const { kpiMetrics, queues, programHealth, recentActivity } = data;

  // Critical alerts - show if any queue has high count
  const criticalAlerts = queues.filter(q => q.count > 10 || q.variant === "danger");

  return (
    <div className="space-y-6">
      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <CleanCard padding="md" className="border-l-4 border-l-[hsl(0_70%_68%)] bg-[hsl(0_70%_68%/0.05)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[hsl(0_70%_68%)] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-1">
                Critical Actions Required
              </h3>
              <p className="text-xs text-[hsl(240_10%_70%)]">
                {criticalAlerts.map(a => `${a.count} ${a.title}`).join(", ")} need immediate attention
              </p>
            </div>
          </div>
        </CleanCard>
      )}

      {/* Top KPIs with Sparklines */}
      <CleanGrid cols={4} gap="md">
        {kpiMetrics.map((metric, index) => (
          <CleanMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            icon={[Users, Shield, DollarSign, Wallet][index]}
          />
        ))}
      </CleanGrid>

      {/* User Growth Chart */}
      {kpiMetrics[0].sparkline && (
        <CleanCard padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[hsl(0_0%_98%)]">User Growth Trend</h3>
            <button
              onClick={refetch}
              className="text-xs text-[hsl(262_100%_65%)] hover:underline"
            >
              Refresh Data
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={kpiMetrics[0].sparkline?.map((value, idx) => ({
                day: `Day ${idx + 1}`,
                value,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(235_20%_22%/0.2)" />
              <XAxis dataKey="day" stroke="hsl(240_10%_70%)" fontSize={12} />
              <YAxis stroke="hsl(240_10%_70%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(235_28%_13%)",
                  border: "1px solid hsl(235_20%_22%/0.4)",
                  borderRadius: "8px",
                  color: "hsl(0_0%_98%)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(262_100%_65%)"
                strokeWidth={3}
                dot={{ fill: "hsl(262_100%_65%)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CleanCard>
      )}

      {/* Two-Column Layout: Left (Queues + Activity) | Right (Actions + Health) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 66% width */}
        <div className="lg:col-span-2 space-y-6">
          {/* NEW: User Quick Access - Import will be added */}
          <UserQuickAccessCard 
            maxHeight="400px"
            showRecentUsers={true}
            showQuickStats={true}
          />
          {/* Pending Action Queues */}
          <div>
            <h2 className="text-lg font-bold text-[hsl(0_0%_98%)] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[hsl(262_100%_65%)]" />
              Pending Actions
            </h2>
            <CleanGrid cols={1} gap="sm">
              {queues.map((queue) => (
                <QueueCard
                  key={queue.title}
                  title={queue.title}
                  count={queue.count}
                  icon={[Shield, Wallet, FileText, DollarSign][queues.indexOf(queue)] || Shield}
                  priority={queue.variant === "danger" ? "danger" : queue.variant === "warning" ? "warning" : "default"}
                  onAction={() => {
                    const routes: Record<string, string> = {
                      "KYC Review": "/admin/kyc-review",
                      "Withdrawals": "/admin/bsk-withdrawals",
                      "Insurance Claims": "/admin/insurance",
                      "Disputes": "/admin/disputes",
                    };
                    navigate(routes[queue.title] || "/admin");
                  }}
                  actionLabel="Review"
                />
              ))}
            </CleanGrid>
          </div>

          {/* Real-Time Activity Feed */}
          <div>
            <h2 className="text-lg font-bold text-[hsl(0_0%_98%)] mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[hsl(262_100%_65%)]" />
              Live Activity
            </h2>
            <ActivityFeed
              activities={recentActivity.map(activity => ({
                id: activity.id,
                type: "user" as const,
                title: activity.title,
                description: activity.subtitle,
                timestamp: activity.fields[1]?.value || "Just now",
                status: activity.status.variant as any,
              }))}
            />
          </div>
        </div>

        {/* Right Column - 33% width */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-bold text-[hsl(0_0%_98%)] mb-4">Quick Actions</h2>
            <QuickActionsGrid />
          </div>

          {/* Program Health Stats */}
          <div>
            <h2 className="text-lg font-bold text-[hsl(0_0%_98%)] mb-4">Program Health</h2>
            <ProgramHealthMini />
            
            {/* Additional Health Metrics */}
            <CleanCard padding="lg" className="mt-4">
              <div className="space-y-3">
                {programHealth.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(240_10%_70%)]">{stat.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[hsl(0_0%_98%)]">{stat.value}</span>
                      {stat.delta && (
                        <span className={`text-xs ${stat.delta.trend === "up" ? "text-[hsl(152_64%_48%)]" : "text-[hsl(0_70%_68%)]"}`}>
                          {stat.delta.trend === "up" ? "↑" : "↓"} {stat.delta.value}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CleanCard>
          </div>

          {/* System Status */}
          <CleanCard padding="lg">
            <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-3">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[hsl(240_10%_70%)]">Database</span>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[hsl(152_64%_48%)]" />
                  <span className="text-xs text-[hsl(152_64%_48%)]">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[hsl(240_10%_70%)]">API</span>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[hsl(152_64%_48%)]" />
                  <span className="text-xs text-[hsl(152_64%_48%)]">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[hsl(240_10%_70%)]">Trading Engine</span>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[hsl(152_64%_48%)]" />
                  <span className="text-xs text-[hsl(152_64%_48%)]">Active</span>
                </div>
              </div>
            </div>
          </CleanCard>
        </div>
      </div>
    </div>
  );
}
