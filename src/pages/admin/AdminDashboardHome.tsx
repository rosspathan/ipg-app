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
import { CleanMetricCard } from "@/components/admin/clean/CleanMetricCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[hsl(240_10%_65%)]">Operational snapshot of the exchange, refreshed every 30 seconds.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/admin/tokens?new=1")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Token
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button type="button" onClick={() => navigate("/admin/crypto-withdrawals")} className="text-left">
          <CleanMetricCard
            label="Pending withdrawals"
            value={fmt(data?.pendingWithdrawals)}
            icon={ArrowUpFromLine}
            className={cn("h-full transition-colors hover:border-[hsl(262_100%_65%/0.5)]", (data?.pendingWithdrawals ?? 0) > 0 && "border-l-4 border-l-[hsl(38_92%_55%)]")}
          />
        </button>
        <button type="button" onClick={() => navigate("/admin/users")} className="text-left">
          <CleanMetricCard label="Total users" value={fmt(data?.totalUsers)} icon={Users} className="h-full hover:border-[hsl(262_100%_65%/0.5)]" />
        </button>
        <button type="button" onClick={() => navigate("/admin/kyc-review")} className="text-left">
          <CleanMetricCard label="KYC pending" value={fmt(data?.kycPending)} icon={UserCheck} className="h-full hover:border-[hsl(262_100%_65%/0.5)]" />
        </button>
        <button type="button" onClick={() => navigate("/admin/tokens")} className="text-left">
          <CleanMetricCard label="Active tokens" value={fmt(data?.activeTokens)} icon={Coins} className="h-full hover:border-[hsl(262_100%_65%/0.5)]" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Withdrawal breakdown */}
        <CleanCard padding="lg" className="lg:col-span-1">
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
        <CleanCard padding="lg" className="lg:col-span-2">
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
                className="group flex items-center gap-3 p-3 rounded-lg border border-[hsl(235_20%_22%/0.4)] bg-[hsl(235_28%_12%)] hover:bg-[hsl(235_28%_16%)] hover:border-[hsl(262_100%_65%/0.4)] transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-lg bg-[hsl(262_100%_65%/0.12)] flex items-center justify-center shrink-0">
                  <l.icon className="h-4 w-4 text-[hsl(262_100%_72%)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[hsl(0_0%_96%)] truncate">{l.title}</p>
                  <p className="text-xs text-[hsl(240_10%_60%)] truncate">{l.desc}</p>
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
