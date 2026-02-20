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
  const criticalAlerts = queues.filter(q => q.count > 10 || q.variant === "danger");

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <CleanCard padding="md" className="border-l-4 border-l-[hsl(0_70%_68%)] bg-[hsl(0_70%_68%/0.05)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[hsl(0_70%_68%)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-1">
                Critical Actions Required
              </h3>
              <p className="text-xs text-[hsl(240_10%_70%)] leading-relaxed">
                {criticalAlerts.map(a => `${a.count} ${a.title}`).join(", ")} need immediate attention
              </p>
            </div>
          </div>
        </CleanCard>
      )}

      {/* Top KPIs — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiMetrics.map((metric, index) => (
          <CleanMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            icon={[Users, Shield, DollarSign, Wallet][index]}
          />
        ))}
      </div>

      {/* User Growth Chart */}
      {kpiMetrics[0].sparkline && (
        <CleanCard padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-bold text-[hsl(0_0%_98%)]">User Growth Trend</h3>
            <button onClick={refetch} className="text-xs text-[hsl(262_100%_65%)] hover:underline">
              Refresh
            </button>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart
              data={kpiMetrics[0].sparkline?.map((value, idx) => ({ day: `D${idx + 1}`, value }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(235 20% 22% / 0.2)" />
              <XAxis dataKey="day" stroke="hsl(240 10% 70%)" tick={{ fontSize: 10 }} />
              <YAxis stroke="hsl(240 10% 70%)" tick={{ fontSize: 10 }} width={30} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(235 28% 13%)",
                  border: "1px solid hsl(235 20% 22% / 0.4)",
                  borderRadius: "8px",
                  color: "hsl(0 0% 98%)",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(262 100% 65%)"
                strokeWidth={2}
                dot={{ fill: "hsl(262 100% 65%)", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CleanCard>
      )}

      {/* Main Grid — stacked on mobile, 3-col on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <UserQuickAccessCard
            maxHeight="360px"
            showRecentUsers={true}
            showQuickStats={true}
          />

          {/* Pending Actions */}
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[hsl(0_0%_98%)] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[hsl(262_100%_65%)]" />
              Pending Actions
            </h2>
            <div className="space-y-2">
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
            </div>
          </div>

          {/* Live Activity */}
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[hsl(0_0%_98%)] mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[hsl(262_100%_65%)]" />
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

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[hsl(0_0%_98%)] mb-3">Quick Actions</h2>
            <QuickActionsGrid />
          </div>

          <div>
            <h2 className="text-sm sm:text-base font-bold text-[hsl(0_0%_98%)] mb-3">Program Health</h2>
            <ProgramHealthMini />
            <CleanCard padding="md" className="mt-3">
              <div className="space-y-3">
                {programHealth.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[hsl(240_10%_70%)] truncate">{stat.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-[hsl(0_0%_98%)]">{stat.value}</span>
                      {stat.delta && (
                        <span className={`text-[10px] font-semibold ${stat.delta.trend === "up" ? "text-[hsl(152_64%_48%)]" : "text-[hsl(0_70%_68%)]"}`}>
                          {stat.delta.trend === "up" ? "↑" : "↓"}{Math.abs(stat.delta.value)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CleanCard>
          </div>

          {/* System Status */}
          <CleanCard padding="md">
            <h3 className="text-xs sm:text-sm font-semibold text-[hsl(0_0%_98%)] mb-3">System Status</h3>
            <div className="space-y-2.5">
              {[
                { label: "Database", status: "Healthy" },
                { label: "API", status: "Operational" },
                { label: "Trading Engine", status: "Active" },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(240_10%_70%)]">{label}</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[hsl(152_64%_48%)]" />
                    <span className="text-xs text-[hsl(152_64%_48%)]">{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CleanCard>
        </div>
      </div>
    </div>
  );
}
