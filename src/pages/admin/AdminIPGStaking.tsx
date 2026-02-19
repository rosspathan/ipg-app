import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Coins, Users, TrendingUp, DollarSign, RefreshCw,
  Zap, AlertTriangle, CheckCircle2, Clock, Search, Loader2,
  Play, SkipForward, Bell
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminIPGStaking() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [forceUnstakeTarget, setForceUnstakeTarget] = useState<any>(null);
  const [triggerRewardsOpen, setTriggerRewardsOpen] = useState(false);

  // ── Fetch IPG staking stats ──
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-ipg-staking-stats"],
    queryFn: async () => {
      const [accountsRes, stakesRes, ledgerRes] = await Promise.all([
        supabase.from("user_staking_accounts").select("available_balance, staked_balance, total_rewards_earned"),
        supabase.from("user_crypto_stakes").select("stake_amount, status, monthly_reward_percent"),
        supabase.from("crypto_staking_ledger").select("tx_type, amount, fee_amount").eq("tx_type", "fee"),
      ]);
      const accounts = accountsRes.data || [];
      const stakes = stakesRes.data || [];
      const fees = ledgerRes.data || [];
      return {
        totalUsers: accounts.length,
        totalStaked: stakes.filter(s => s.status === "active").reduce((a, s) => a + Number(s.stake_amount), 0),
        totalRewardsEarned: accounts.reduce((a, acc) => a + Number(acc.total_rewards_earned), 0),
        totalFeeRevenue: fees.reduce((a, f) => a + Number(f.fee_amount), 0),
        activeStakes: stakes.filter(s => s.status === "active").length,
        earlyExits: stakes.filter(s => s.status === "early_exited").length,
      };
    },
    refetchInterval: 30000,
  });

  // ── Fetch all active stakes with user info ──
  const { data: stakes, isLoading: stakesLoading } = useQuery({
    queryKey: ["admin-ipg-active-stakes", search],
    queryFn: async () => {
      let query = supabase
        .from("user_crypto_stakes")
        .select(`
          *,
          plan:crypto_staking_plans(name, monthly_reward_percent),
          account:user_staking_accounts(user_id)
        `)
        .in("status", ["active", "early_exited", "completed"])
        .order("created_at", { ascending: false })
        .limit(200);

      const { data, error } = await query;
      if (error) throw error;

      if (search) {
        return (data || []).filter(s =>
          s.account?.user_id?.toLowerCase().includes(search.toLowerCase()) ||
          s.id?.toLowerCase().includes(search.toLowerCase())
        );
      }
      return data || [];
    },
    refetchInterval: 30000,
  });

  // ── Fetch recent ledger ──
  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["admin-ipg-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crypto_staking_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // ── Fetch admin notifications (staking alerts) ──
  const { data: alerts } = useQuery({
    queryKey: ["admin-staking-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_notifications")
        .select("*")
        .eq("type", "security_alert")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // ── Trigger reward distribution ──
  const rewardsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("staking-distribute-rewards");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Rewards distributed!", {
        description: `Processed ${data?.stakes_processed || 0} stakes`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-ipg-staking-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ipg-ledger"] });
      setTriggerRewardsOpen(false);
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  // ── Trigger auto-unstake ──
  const autoUnstakeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("staking-auto-unstake");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Auto-unstake complete!", {
        description: `Processed expired stakes`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-ipg-active-stakes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ipg-staking-stats"] });
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  // ── Trigger deposit monitor ──
  const depositMonitorMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("staking-deposit-monitor");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Deposit scan complete: ${data?.count || 0} deposits credited`);
      queryClient.invalidateQueries({ queryKey: ["admin-ipg-staking-stats"] });
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  const statCards = [
    {
      label: "Total IPG Staked",
      value: `${Number(stats?.totalStaked || 0).toFixed(2)} IPG`,
      icon: <Coins className="w-4 h-4" />,
      color: "text-accent",
    },
    {
      label: "Active Stakes",
      value: stats?.activeStakes || 0,
      icon: <Users className="w-4 h-4" />,
      color: "text-primary",
    },
    {
      label: "Total Rewards Paid",
      value: `${Number(stats?.totalRewardsEarned || 0).toFixed(4)} IPG`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-success",
    },
    {
      label: "Fee Revenue",
      value: `${Number(stats?.totalFeeRevenue || 0).toFixed(4)} IPG`,
      icon: <DollarSign className="w-4 h-4" />,
      color: "text-warning",
    },
    {
      label: "Staking Users",
      value: stats?.totalUsers || 0,
      icon: <Users className="w-4 h-4" />,
      color: "text-muted-foreground",
    },
    {
      label: "Early Exits",
      value: stats?.earlyExits || 0,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-destructive",
    },
  ];

  const txTypeConfig: Record<string, { label: string; icon: string; positive: boolean }> = {
    deposit: { label: "Deposit", icon: "⬇", positive: true },
    stake: { label: "Staked", icon: "🔒", positive: false },
    unstake: { label: "Unstaked", icon: "🔓", positive: true },
    early_unstake: { label: "Early Exit", icon: "⚠️", positive: true },
    reward: { label: "Reward", icon: "✨", positive: true },
    fee: { label: "Fee", icon: "📊", positive: false },
    withdrawal: { label: "Withdrawal", icon: "⬆", positive: false },
  };

  return (
    <div className="p-4 space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">IPG Staking Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time system controls & monitoring</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-ipg-staking-stats"] });
            queryClient.invalidateQueries({ queryKey: ["admin-ipg-active-stakes"] });
            queryClient.invalidateQueries({ queryKey: ["admin-ipg-ledger"] });
          }}
          className="gap-1.5 text-xs h-8"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} className="border-border/40">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-muted/40", card.color)}>
                  {card.icon}
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
              </div>
              {statsLoading ? (
                <div className="h-5 w-16 bg-muted/40 rounded animate-pulse" />
              ) : (
                <p className={cn("text-lg font-bold tabular-nums", card.color)}>{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            Manual Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Button
            onClick={() => setTriggerRewardsOpen(true)}
            disabled={rewardsMutation.isPending}
            className="gap-2 h-10 text-sm"
          >
            {rewardsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Reward Distribution
          </Button>
          <Button
            variant="outline"
            onClick={() => autoUnstakeMutation.mutate()}
            disabled={autoUnstakeMutation.isPending}
            className="gap-2 h-10 text-sm border-primary/30 text-primary"
          >
            {autoUnstakeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
            Run Auto-Unstake
          </Button>
          <Button
            variant="outline"
            onClick={() => depositMonitorMutation.mutate()}
            disabled={depositMonitorMutation.isPending}
            className="gap-2 h-10 text-sm border-accent/30 text-accent"
          >
            {depositMonitorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Scan Deposits Now
          </Button>
        </CardContent>
      </Card>

      {/* Security Alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <Bell className="w-4 h-4" />
              Security Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 5).map((alert: any) => (
              <div key={alert.id} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
                <p className="font-semibold text-destructive">{alert.title}</p>
                <p className="mt-0.5 text-muted-foreground">{alert.message}</p>
                <p className="mt-1 text-muted-foreground/60">{format(new Date(alert.created_at), 'dd MMM HH:mm')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="stakes">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="stakes">All Stakes</TabsTrigger>
          <TabsTrigger value="ledger">Transaction Ledger</TabsTrigger>
        </TabsList>

        {/* All Stakes Tab */}
        <TabsContent value="stakes" className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user ID or stake ID..."
              className="pl-9 h-9 text-sm bg-card border-border/40"
            />
          </div>

          {stakesLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !stakes || stakes.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No stakes found</div>
          ) : (
            <div className="space-y-2">
              {stakes.map((stake: any) => {
                const lockDate = new Date(stake.lock_until);
                const isLocked = lockDate > new Date();
                const daysLeft = isLocked ? Math.ceil((lockDate.getTime() - Date.now()) / 86400000) : 0;
                const statusColors: Record<string, string> = {
                  active: "bg-success/15 text-success",
                  early_exited: "bg-destructive/15 text-destructive",
                  completed: "bg-muted text-muted-foreground",
                };
                return (
                  <div key={stake.id} className="p-3.5 rounded-xl bg-card border border-border/40 text-xs">
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-semibold text-foreground/90 truncate">{stake.plan?.name || "Unknown"} Plan</p>
                        <p className="text-muted-foreground font-mono text-[10px] truncate">
                          User: {stake.account?.user_id || "—"}
                        </p>
                        <p className="text-muted-foreground font-mono text-[10px] truncate">
                          ID: {stake.id}
                        </p>
                      </div>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", statusColors[stake.status] || "bg-muted text-muted-foreground")}>
                        {stake.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/20 mb-2.5">
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Staked</p>
                        <p className="font-bold text-sm text-foreground tabular-nums">{Number(stake.stake_amount).toFixed(2)}</p>
                        <p className="text-[9px] text-muted-foreground">IPG</p>
                      </div>
                      <div className="text-center border-x border-border/30">
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Rate</p>
                        <p className="font-bold text-sm text-accent tabular-nums">{Number(stake.monthly_reward_percent)}%</p>
                        <p className="text-[9px] text-muted-foreground">mo.</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Earned</p>
                        <p className="font-bold text-sm text-accent tabular-nums">{Number(stake.total_rewards).toFixed(4)}</p>
                        <p className="text-[9px] text-muted-foreground">IPG</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {isLocked
                            ? `Locked ${daysLeft}d left`
                            : `Unlocked ${format(lockDate, 'dd MMM yyyy')}`}
                        </span>
                      </div>
                      <span>{format(new Date(stake.staked_at || stake.created_at), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-2 mt-4">
          {ledgerLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !ledger || ledger.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No transactions</div>
          ) : (
            ledger.map((entry: any) => {
              const cfg = txTypeConfig[entry.tx_type] || { label: entry.tx_type, icon: "•", positive: true };
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/30 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center text-sm flex-shrink-0">{cfg.icon}</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground/90">{cfg.label}</p>
                      <p className="text-muted-foreground font-mono text-[10px] truncate">{entry.user_id?.slice(0, 16)}…</p>
                      <p className="text-muted-foreground/60 text-[10px]">{format(new Date(entry.created_at), 'dd MMM HH:mm')}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn("font-bold tabular-nums", cfg.positive ? "text-accent" : "text-destructive")}>
                      {cfg.positive ? "+" : "-"}{Math.abs(Number(entry.amount)).toFixed(4)} IPG
                    </p>
                    {Number(entry.fee_amount) > 0 && (
                      <p className="text-muted-foreground text-[10px]">fee: {Number(entry.fee_amount).toFixed(4)}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Reward Distribution */}
      <AlertDialog open={triggerRewardsOpen} onOpenChange={setTriggerRewardsOpen}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-accent" />
              Run Reward Distribution
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will manually trigger the daily staking reward distribution for all active IPG stakes. Rewards are normally auto-run at midnight. Running it again within 24h may result in double rewards — confirm only if you know today's rewards haven't been distributed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rewardsMutation.mutate()}
              disabled={rewardsMutation.isPending}
            >
              {rewardsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Run"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
