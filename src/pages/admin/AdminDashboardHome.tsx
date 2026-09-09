import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ArrowUpFromLine,
  UserCheck,
  Coins,
  TrendingUp,
  Wallet,
  Shield,
  ClipboardList,
  Activity,
  ArrowRight,
  RefreshCw,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const PENDING_WITHDRAWAL_STATES = ["pending", "processing", "queued", "requested", "approved"];

async function countRows(table: string, apply: (q: any) => any) {
  const base = (supabase as any).from(table).select("*", { count: "exact", head: true });
  const { count, error } = await apply(base);
  if (error) return 0;
  return count ?? 0;
}

function useDashboardStats() {
  return useQuery({
    queryKey: ["admin-dashboard-home"],
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [
        cryptoWithdrawals,
        bskWithdrawals,
        totalUsers,
        newUsers24h,
        kycPending,
        activeTokens,
        activeMarkets,
        openOrders,
      ] = await Promise.all([
        countRows("custodial_withdrawals", (q) => q.in("status", PENDING_WITHDRAWAL_STATES)),
        countRows("bsk_withdrawal_requests", (q) => q.in("status", PENDING_WITHDRAWAL_STATES)),
        countRows("profiles", (q) => q),
        countRows("profiles", (q) => q.gte("created_at", since24h)),
        countRows("kyc_submissions", (q) => q.in("status", ["submitted", "under_review", "documents_under_review"])),
        countRows("assets", (q) => q.eq("is_active", true)),
        countRows("markets", (q) => q.eq("is_active", true)),
        countRows("orders", (q) => q.in("status", ["open", "partially_filled"])),
      ]);
      return {
        pendingWithdrawals: cryptoWithdrawals + bskWithdrawals,
        cryptoWithdrawals,
        bskWithdrawals,
        totalUsers,
        newUsers24h,
        kycPending,
        activeTokens,
        activeMarkets,
        openOrders,
      };
    },
    refetchInterval: 30000,
  });
}

const quickLinks = [
  { title: "Token Management", desc: "Add or edit listed tokens", url: "/admin/tokens", icon: Coins },
  { title: "Crypto Withdrawals", desc: "Review pending payouts", url: "/admin/crypto-withdrawals", icon: ArrowUpFromLine },
  { title: "KYC Review", desc: "Approve identity submissions", url: "/admin/kyc-review", icon: UserCheck },
  { title: "Users", desc: "Search and manage accounts", url: "/admin/users", icon: Users },
  { title: "Markets", desc: "Pairs and IPG price floor", url: "/admin/markets", icon: TrendingUp },
  { title: "Hot Wallet Live", desc: "Solvency and balances", url: "/admin/hot-wallet-live", icon: Wallet },
  { title: "Trading Orders", desc: "Open order book control", url: "/admin/trading-orders", icon: ClipboardList },
  { title: "System Health", desc: "Cron jobs and services", url: "/admin/system/health", icon: Activity },
];

export default function AdminDashboardHome() {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, refetch } = useDashboardStats();

  const fmt = (n?: number) => (isLoading ? "—" : (n ?? 0).toLocaleString());

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-[hsl(0_0%_98%)]">Admin dashboard</h2>
          <p className="mt-1 text-sm text-[hsl(240_10%_65%)]">Operational snapshot of the exchange, refreshed every 30 seconds.</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="min-h-10 gap-2">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => navigate("/admin/tokens?new=1")} className="min-h-10 gap-2">
            <Plus className="h-4 w-4" />
            Add Token
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="Pending withdrawals" value={fmt(data?.pendingWithdrawals)} icon={ArrowUpFromLine} onClick={() => navigate("/admin/crypto-withdrawals")} alert={(data?.pendingWithdrawals ?? 0) > 0} />
        <DashboardStat label="Total users" value={fmt(data?.totalUsers)} icon={Users} onClick={() => navigate("/admin/users")} />
        <DashboardStat label="KYC pending" value={fmt(data?.kycPending)} icon={UserCheck} onClick={() => navigate("/admin/kyc-review")} />
        <DashboardStat label="Active tokens" value={fmt(data?.activeTokens)} icon={Coins} onClick={() => navigate("/admin/tokens")} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Withdrawal breakdown */}
        <CleanCard padding="lg" className="min-w-0">
          <h3 className="text-sm font-bold text-[hsl(0_0%_98%)] mb-4">Withdrawal queue</h3>
          <div className="space-y-3">
            <Row label="Crypto withdrawals" value={fmt(data?.cryptoWithdrawals)} onClick={() => navigate("/admin/crypto-withdrawals")} />
            <Row label="BSK withdrawals" value={fmt(data?.bskWithdrawals)} onClick={() => navigate("/admin/bsk-withdrawals")} />
            <Row label="Open orders" value={fmt(data?.openOrders)} onClick={() => navigate("/admin/trading-orders")} />
            <Row label="Active markets" value={fmt(data?.activeMarkets)} onClick={() => navigate("/admin/markets")} />
            <Row label="New users (24h)" value={fmt(data?.newUsers24h)} onClick={() => navigate("/admin/users")} />
          </div>
        </CleanCard>

        {/* Quick links */}
        <CleanCard padding="lg" className="min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[hsl(0_0%_98%)]">Quick links</h3>
            <Shield className="h-4 w-4 text-[hsl(240_10%_50%)]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickLinks.map((l) => (
              <button
                key={l.url}
                type="button"
                onClick={() => navigate(l.url)}
                className="group flex min-h-14 min-w-0 items-center gap-3 rounded-lg border border-[hsl(235_20%_22%/0.4)] bg-[hsl(235_28%_12%)] p-3 text-left transition-colors hover:border-[hsl(262_100%_65%/0.4)] hover:bg-[hsl(235_28%_16%)]"
              >
                <div className="h-9 w-9 rounded-lg bg-[hsl(262_100%_65%/0.12)] flex items-center justify-center shrink-0">
                  <l.icon className="h-4 w-4 text-[hsl(262_100%_72%)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[hsl(0_0%_96%)]">{l.title}</p>
                  <p className="truncate text-xs text-[hsl(240_10%_60%)]">{l.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[hsl(240_10%_45%)] group-hover:text-[hsl(262_100%_72%)] group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </CleanCard>
      </div>
    </div>
  );
}

function DashboardStat({ label, value, icon: Icon, onClick, alert }: { label: string; value: string; icon: LucideIcon; onClick: () => void; alert?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="min-w-0 text-left">
      <CleanCard padding="lg" className={cn("flex h-full min-w-0 flex-col transition-colors hover:border-[hsl(262_100%_65%/0.5)]", alert && "border-l-4 border-l-[hsl(38_92%_55%)]")}>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p className="min-w-0 text-xs font-bold uppercase leading-5 text-[hsl(240_10%_60%)]">{label}</p>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(262_100%_65%/0.12)]">
            <Icon className="h-5 w-5 text-[hsl(262_100%_72%)]" />
          </span>
        </div>
        <p className="mt-4 break-words text-3xl font-bold tabular-nums text-[hsl(0_0%_98%)]">{value}</p>
      </CleanCard>
    </button>
  );
}

function Row({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-2 border-b border-[hsl(235_20%_22%/0.3)] last:border-0 hover:text-[hsl(262_100%_78%)] transition-colors"
    >
      <span className="text-sm text-[hsl(240_10%_68%)]">{label}</span>
      <span className="text-sm font-bold tabular-nums text-[hsl(0_0%_98%)]">{value}</span>
    </button>
  );
}
