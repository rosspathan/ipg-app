import * as React from "react";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Users,
  FileCheck,
  TrendingUp,
  DollarSign,
  Coins,
  Gift,
  Megaphone,
  AlertCircle,
  Shield,
  RefreshCw,
} from "lucide-react";

/**
 * AdminDashboardNova - Main dashboard for Nova Admin
 * - KPI lane: top metrics
 * - Queues lane: pending review items
 * - Programs Health lane: program KPIs
 * - Quick Actions lane: common admin tasks
 * - Recent Activity feed
 */
export default function AdminDashboardNova() {
  return (
    <div data-testid="page-admin-home" className="space-y-6 pb-6">
      {/* KPI Lane */}
      <CardLane title="Key Metrics">
        <KPIStat
          label="Total Users"
          value="12,847"
          delta={{ value: 8.2, trend: "up" }}
          sparkline={[100, 120, 115, 140, 135, 150, 155]}
          icon={<Users className="w-4 h-4" />}
        />
        <KPIStat
          label="KYC Pending"
          value={234}
          delta={{ value: 12, trend: "up" }}
          icon={<FileCheck className="w-4 h-4" />}
          variant="warning"
        />
        <KPIStat
          label="Deposits Today"
          value="$128k"
          delta={{ value: 15.3, trend: "up" }}
          sparkline={[80, 90, 95, 110, 105, 120, 128]}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Payouts Today"
          value="$95k"
          delta={{ value: 3.7, trend: "down" }}
          sparkline={[100, 98, 95, 92, 95, 93, 95]}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPIStat
          label="Spin P&L"
          value="$12.4k"
          delta={{ value: 22.1, trend: "up" }}
          icon={<RefreshCw className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Draw P&L"
          value="$8.2k"
          delta={{ value: 5.4, trend: "up" }}
          icon={<Gift className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Ads Revenue"
          value="$22.1k"
          delta={{ value: 18.9, trend: "up" }}
          sparkline={[15, 17, 16, 19, 20, 21, 22]}
          icon={<Megaphone className="w-4 h-4" />}
          variant="success"
        />
      </CardLane>

      {/* Queues Lane */}
      <CardLane title="Queues">
        <QueueCard
          title="KYC Review"
          count={234}
          icon={<FileCheck className="w-5 h-5" />}
          variant="warning"
          action={() => console.log("Review KYC")}
        />
        <QueueCard
          title="Withdrawals"
          count={47}
          icon={<DollarSign className="w-5 h-5" />}
          variant="default"
          action={() => console.log("Review Withdrawals")}
        />
        <QueueCard
          title="Insurance Claims"
          count={12}
          icon={<Shield className="w-5 h-5" />}
          variant="default"
          action={() => console.log("Review Claims")}
        />
        <QueueCard
          title="Disputes"
          count={8}
          icon={<AlertCircle className="w-5 h-5" />}
          variant="danger"
          action={() => console.log("Review Disputes")}
        />
      </CardLane>

      {/* Programs Health Lane */}
      <CardLane title="Programs Health">
        <KPIStat
          label="Staking TVL"
          value="$2.4M"
          delta={{ value: 12.5, trend: "up" }}
          icon={<Coins className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Spin RTP"
          value="96.2%"
          delta={{ value: 0.3, trend: "up" }}
          icon={<RefreshCw className="w-4 h-4" />}
        />
        <KPIStat
          label="Draw Fill Rate"
          value="87%"
          delta={{ value: 5, trend: "up" }}
          icon={<Gift className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Ads Impressions"
          value="1.2M"
          delta={{ value: 22, trend: "up" }}
          sparkline={[900, 950, 1000, 1050, 1100, 1150, 1200]}
          icon={<Megaphone className="w-4 h-4" />}
          variant="success"
        />
      </CardLane>

      {/* Quick Actions Lane */}
      <CardLane title="Quick Actions">
        <QuickActionCard
          title="List Token"
          icon={<Coins className="w-5 h-5" />}
          action={() => console.log("List Token")}
        />
        <QuickActionCard
          title="Create Pair"
          icon={<RefreshCw className="w-5 h-5" />}
          action={() => console.log("Create Pair")}
        />
        <QuickActionCard
          title="Start Draw"
          icon={<Gift className="w-5 h-5" />}
          action={() => console.log("Start Draw")}
        />
        <QuickActionCard
          title="New Ad"
          icon={<Megaphone className="w-5 h-5" />}
          action={() => console.log("New Ad")}
        />
        <QuickActionCard
          title="Set Fee Rule"
          icon={<DollarSign className="w-5 h-5" />}
          action={() => console.log("Set Fee")}
        />
      </CardLane>

      {/* Recent Activity Feed */}
      <div className="px-4 space-y-3">
        <h2 className="text-base font-heading font-semibold text-foreground">
          Recent Activity
        </h2>
        <div className="space-y-2">
          <RecordCard
            id="1"
            title="User KYC Approved"
            subtitle="john.doe@example.com"
            fields={[
              { label: "Operator", value: "Admin Sarah" },
              { label: "Time", value: "2 min ago" },
            ]}
            status={{ label: "Approved", variant: "success" }}
          />
          <RecordCard
            id="2"
            title="Withdrawal Processed"
            subtitle="$5,000 USDT"
            fields={[
              { label: "User", value: "alice@..." },
              { label: "Time", value: "5 min ago" },
            ]}
            status={{ label: "Completed", variant: "success" }}
          />
          <RecordCard
            id="3"
            title="New Market Listed"
            subtitle="ETH/USDT"
            fields={[
              { label: "Operator", value: "Admin Mike" },
              { label: "Time", value: "12 min ago" },
            ]}
            status={{ label: "Active", variant: "default" }}
          />
        </div>
      </div>
    </div>
  );
}

// Helper Components

function QueueCard({
  title,
  count,
  icon,
  variant,
  action,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  variant: "default" | "warning" | "danger";
  action: () => void;
}) {
  const variantStyles = {
    default: "border-[hsl(225_24%_22%/0.16)]",
    warning: "border-warning/20 bg-warning/5",
    danger: "border-danger/20 bg-danger/5",
  };

  return (
    <div
      className={cn(
        "min-w-[200px] p-4 rounded-2xl border",
        "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
        variantStyles[variant]
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="text-muted-foreground">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-2xl font-heading font-bold text-foreground tabular-nums">
            {count}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={action}
        className="w-full bg-transparent border-[hsl(225_24%_22%/0.16)]"
      >
        Review
      </Button>
    </div>
  );
}

function QuickActionCard({
  title,
  icon,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  action: () => void;
}) {
  return (
    <button
      onClick={action}
      className={cn(
        "min-w-[140px] p-4 rounded-2xl border",
        "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
        "border-[hsl(225_24%_22%/0.16)]",
        "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
        "transition-colors duration-220",
        "flex flex-col items-center gap-2"
      )}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
    </button>
  );
}
