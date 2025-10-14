import { Users, DollarSign, FolderKanban, Activity } from "lucide-react";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { CleanMetricCard } from "@/components/admin/clean/CleanMetricCard";
import { QueueCard } from "@/components/admin/clean/QueueCard";
import { ActivityFeed } from "@/components/admin/clean/ActivityFeed";
import { QuickActionsGrid } from "@/components/admin/clean/QuickActionsGrid";
import { ProgramHealthMini } from "@/components/admin/clean/ProgramHealthMini";
import { useNavigate } from "react-router-dom";

export default function AdminDashboardClean() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <CleanGrid cols={4} gap="md">
        <CleanMetricCard
          label="Total Users"
          value="12,482"
          delta={{ value: 12.5, trend: "up" }}
          icon={Users}
        />
        <CleanMetricCard
          label="Revenue Today"
          value="$24,891"
          delta={{ value: 8.2, trend: "up" }}
          icon={DollarSign}
        />
        <CleanMetricCard
          label="Active Programs"
          value="18"
          delta={{ value: 2, trend: "up" }}
          icon={FolderKanban}
        />
        <CleanMetricCard
          label="System Health"
          value="99.8%"
          icon={Activity}
        />
      </CleanGrid>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 60% width on desktop */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pending Actions */}
          <div>
            <h2 className="text-lg font-bold text-[hsl(0_0%_98%)] mb-3">
              Pending Actions
            </h2>
            <CleanGrid cols={1} gap="sm">
              <QueueCard
                title="KYC Reviews"
                count={24}
                icon={Users}
                priority="warning"
                onAction={() => navigate("/admin/kyc-review")}
                actionLabel="Review"
              />
              <QueueCard
                title="Withdrawals"
                count={8}
                icon={DollarSign}
                priority="danger"
                onAction={() => navigate("/admin/bsk-withdrawals")}
                actionLabel="Approve"
              />
              <QueueCard
                title="Insurance Claims"
                count={3}
                icon={FolderKanban}
                priority="default"
                onAction={() => navigate("/admin/insurance")}
                actionLabel="Process"
              />
            </CleanGrid>
          </div>

          {/* Recent Activity Feed */}
          <ActivityFeed />
        </div>

        {/* Right Column - 40% width on desktop */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <QuickActionsGrid />

          {/* Program Health Mini Stats */}
          <ProgramHealthMini />
        </div>
      </div>
    </div>
  );
}
