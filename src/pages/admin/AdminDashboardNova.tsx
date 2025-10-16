import * as React from "react";
import { useNavigate } from "react-router-dom";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
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
 * AdminDashboardNova - Main dashboard with real-time data
 */
export default function AdminDashboardNova() {
  const navigate = useNavigate();
  const { data, loading } = useAdminDashboardData();

  if (loading || !data) {
    return (
      <div data-testid="page-admin-home" className="w-full space-y-6 pb-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const iconMap: Record<string, React.ReactNode> = {
    "Total Users": <Users className="w-4 h-4" />,
    "KYC Pending": <FileCheck className="w-4 h-4" />,
    "Deposits Today": <TrendingUp className="w-4 h-4" />,
    "Payouts Today": <DollarSign className="w-4 h-4" />,
    "Staking TVL": <Coins className="w-4 h-4" />,
    "Spin RTP": <RefreshCw className="w-4 h-4" />,
    "Draw Fill Rate": <Gift className="w-4 h-4" />,
    "Ads Impressions": <Megaphone className="w-4 h-4" />,
  };

  return (
    <div data-testid="page-admin-home" className="w-full space-y-3 sm:space-y-4 md:space-y-6 pb-4 sm:pb-6">
      {/* KPI Lane - Real Data */}
      <CardLane title="Key Metrics">
        {data.kpiMetrics.map((metric) => (
          <KPIStat
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            sparkline={metric.sparkline}
            icon={iconMap[metric.label]}
            variant={
              metric.label === "KYC Pending" && Number(metric.value) > 50
                ? "warning"
                : metric.delta?.trend === "up"
                ? "success"
                : "default"
            }
          />
        ))}
      </CardLane>

      {/* Queues Lane - Real Data */}
      <CardLane title="Queues">
        {data.queues.map((queue) => (
          <QueueCard
            key={queue.title}
            title={queue.title}
            count={queue.count}
            icon={
              queue.title === "KYC Review" ? <FileCheck className="w-5 h-5" /> :
              queue.title === "Withdrawals" ? <DollarSign className="w-5 h-5" /> :
              queue.title === "Insurance Claims" ? <Shield className="w-5 h-5" /> :
              <AlertCircle className="w-5 h-5" />
            }
            variant={queue.variant}
            action={() => console.log(`Review ${queue.title}`)}
          />
        ))}
      </CardLane>

      {/* Programs Health Lane - Real Data */}
      <CardLane title="Programs Health">
        {data.programHealth.map((metric) => (
          <KPIStat
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            sparkline={metric.sparkline}
            icon={iconMap[metric.label]}
            variant={metric.delta?.trend === "up" ? "success" : "default"}
          />
        ))}
      </CardLane>

      {/* Quick Actions Lane */}
      <CardLane title="Quick Actions">
        <QuickActionCard
          title="List Token"
          icon={<Coins className="w-5 h-5" />}
          action={() => navigate('/admin/markets')}
        />
        <QuickActionCard
          title="Create Pair"
          icon={<RefreshCw className="w-5 h-5" />}
          action={() => navigate('/admin/markets')}
        />
        <QuickActionCard
          title="Start Draw"
          icon={<Gift className="w-5 h-5" />}
          action={() => navigate('/admin/lucky-draw')}
        />
        <QuickActionCard
          title="Manage Insurance"
          icon={<Shield className="w-5 h-5" />}
          action={() => navigate('/admin/insurance')}
        />
        <QuickActionCard
          title="Ad Campaigns"
          icon={<Megaphone className="w-5 h-5" />}
          action={() => navigate('/admin/ads')}
        />
        <QuickActionCard
          title="Purchase Bonus"
          icon={<DollarSign className="w-5 h-5" />}
          action={() => navigate('/admin/purchase-bonus')}
        />
        <QuickActionCard
          title="Referrals"
          icon={<Users className="w-5 h-5" />}
          action={() => navigate('/admin/referrals')}
        />
        <QuickActionCard
          title="Funding Routes"
          icon={<TrendingUp className="w-5 h-5" />}
          action={() => navigate('/admin/funding')}
        />
      </CardLane>

      {/* Recent Activity Feed */}
      <div className="px-3 sm:px-4 lg:px-6 space-y-2 sm:space-y-3">
        <h2 className="text-sm sm:text-base font-heading font-semibold text-foreground">
          Recent Activity
        </h2>
        <div className="space-y-2 sm:space-y-3">
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
        "min-w-[280px] sm:min-w-[240px] lg:min-w-[220px]",
        "p-4 sm:p-5 rounded-2xl border",
        "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
        "transition-all duration-220 touch-manipulation active:scale-[0.98]",
        variantStyles[variant]
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="text-muted-foreground shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-3xl sm:text-2xl font-heading font-bold text-foreground tabular-nums mt-1">
            {count}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={action}
        className="w-full bg-transparent border-[hsl(225_24%_22%/0.16)] touch-manipulation min-h-[44px]"
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
        "min-w-[200px] sm:min-w-[160px] p-5 sm:p-4",
        "rounded-2xl border",
        "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
        "border-[hsl(225_24%_22%/0.16)]",
        "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
        "transition-all duration-220",
        "flex flex-col items-center gap-3",
        "touch-manipulation active:scale-95",
        "min-h-[110px]"
      )}
    >
      <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground text-center leading-tight">{title}</p>
    </button>
  );
}
