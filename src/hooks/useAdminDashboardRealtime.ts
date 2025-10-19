import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  revenueToday: number;
  activePrograms: number;
  pendingKYC: number;
  pendingWithdrawals: number;
  pendingClaims: number;
  pendingLoans: number;
}

interface ActivityItem {
  id: string;
  type: "user" | "transaction" | "system" | "alert";
  title: string;
  description: string;
  timestamp: string;
  status?: "success" | "warning" | "danger";
}

export function useAdminDashboardRealtime() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    revenueToday: 0,
    activePrograms: 0,
    pendingKYC: 0,
    pendingWithdrawals: 0,
    pendingClaims: 0,
    pendingLoans: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch active users (logged in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", sevenDaysAgo.toISOString());

      // Fetch today's revenue (BSK purchases)
      const today = new Date().toISOString().split("T")[0];
      const { data: purchases } = await supabase
        .from("bonus_ledger")
        .select("amount_bsk")
        .gte("created_at", today);
      const revenueToday = purchases?.reduce((sum, p) => sum + (Number(p.amount_bsk) || 0), 0) || 0;

      // Fetch active programs
      const { count: activePrograms } = await supabase
        .from("program_modules")
        .select("*", { count: "exact", head: true })
        .eq("status", "live");

      // Fetch pending actions
      const { count: pendingKYC } = await supabase
        .from("kyc_profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: pendingWithdrawals } = await supabase
        .from("fiat_deposits")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: pendingClaims } = await supabase
        .from("insurance_claims")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: pendingLoans } = await supabase
        .from("bsk_loans")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch recent activity
      const { data: recentActivity } = await supabase
        .from("audit_logs")
        .select("id, action, resource_type, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

      const activityItems: ActivityItem[] = (recentActivity || []).map((log) => {
        // Map action types to activity types
        const getType = (action: string): "user" | "transaction" | "system" | "alert" => {
          if (action.includes("profile") || action.includes("user")) return "user";
          if (action.includes("withdrawal") || action.includes("deposit")) return "transaction";
          if (action.includes("alert") || action.includes("warning")) return "alert";
          return "system";
        };

        const getStatus = (action: string): "success" | "warning" | "danger" | undefined => {
          if (action.includes("approved") || action.includes("completed")) return "success";
          if (action.includes("pending") || action.includes("review")) return "warning";
          if (action.includes("rejected") || action.includes("failed")) return "danger";
          return undefined;
        };

        // Format timestamp to relative time
        const formatTimestamp = (dateStr: string) => {
          const now = new Date();
          const then = new Date(dateStr);
          const diffMs = now.getTime() - then.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) return "just now";
          if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
          if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
          return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        };

        return {
          id: log.id,
          type: getType(log.action),
          title: log.action
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
          description: `${log.action.replace(/_/g, " ")} on ${log.resource_type}`,
          timestamp: formatTimestamp(log.created_at),
          status: getStatus(log.action),
        };
      });

      setMetrics({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        revenueToday: Math.round(revenueToday * 100) / 100,
        activePrograms: activePrograms || 0,
        pendingKYC: pendingKYC || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        pendingClaims: pendingClaims || 0,
        pendingLoans: pendingLoans || 0,
      });

      setActivity(activityItems);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up realtime subscriptions
    const profilesChannel = supabase
      .channel("profiles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchDashboardData)
      .subscribe();

    const kycChannel = supabase
      .channel("kyc-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "kyc_profiles" }, fetchDashboardData)
      .subscribe();

    const withdrawalsChannel = supabase
      .channel("withdrawals-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "fiat_deposits" }, fetchDashboardData)
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      profilesChannel.unsubscribe();
      kycChannel.unsubscribe();
      withdrawalsChannel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { metrics, activity, loading, refetch: fetchDashboardData };
}
