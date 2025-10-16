import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KPIMetric {
  label: string;
  value: string | number;
  delta?: { value: number; trend: "up" | "down" };
  sparkline?: number[];
}

interface QueueItem {
  title: string;
  count: number;
  variant: "default" | "warning" | "danger";
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  fields: { label: string; value: string }[];
  status: { label: string; variant: "success" | "default" | "warning" };
}

interface AdminDashboardData {
  kpiMetrics: KPIMetric[];
  queues: QueueItem[];
  programHealth: KPIMetric[];
  recentActivity: ActivityItem[];
}

/**
 * useAdminDashboardData - Real-time admin dashboard data from Supabase
 */
export function useAdminDashboardData() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("admin-dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fiat_deposits" },
        () => fetchDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kyc_submissions" },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch KYC pending count
      const { count: kycCount } = await supabase
        .from("kyc_submissions")
        .select("*", { count: "exact", head: true })
        .in("status", ["submitted", "under_review"]);

      // Fetch withdrawals pending count
      const { count: withdrawalCount } = await supabase
        .from("fiat_deposits")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch today's deposits (mock for now)
      const todayDeposits = 128000;
      const todayPayouts = 95000;

      // Fetch recent activity
      const { data: recentKYC } = await supabase
        .from("kyc_submissions")
        .select("id, user_id, status, updated_at, profiles(display_name)")
        .order("updated_at", { ascending: false })
        .limit(5);

      const activityItems: ActivityItem[] = (recentKYC || []).map((item: any) => ({
        id: item.id,
        title: item.status === "approved" ? "User KYC Approved" : "KYC Submission",
        subtitle: item.profiles?.display_name || "Unknown User",
        fields: [
          { label: "Status", value: item.status },
          { label: "Time", value: new Date(item.updated_at).toLocaleTimeString() },
        ],
        status: {
          label: item.status === "approved" ? "Approved" : "Pending",
          variant: item.status === "approved" ? "success" : "warning",
        },
      }));

      setData({
        kpiMetrics: [
          {
            label: "Total Users",
            value: totalUsers?.toLocaleString() || "0",
            delta: { value: 8.2, trend: "up" },
            sparkline: [100, 120, 115, 140, 135, 150, 155],
          },
          {
            label: "KYC Pending",
            value: kycCount || 0,
            delta: { value: 12, trend: "up" },
          },
          {
            label: "Deposits Today",
            value: `$${(todayDeposits / 1000).toFixed(0)}k`,
            delta: { value: 15.3, trend: "up" },
            sparkline: [80, 90, 95, 110, 105, 120, 128],
          },
          {
            label: "Payouts Today",
            value: `$${(todayPayouts / 1000).toFixed(0)}k`,
            delta: { value: 3.7, trend: "down" },
            sparkline: [100, 98, 95, 92, 95, 93, 95],
          },
        ],
        queues: [
          {
            title: "KYC Review",
            count: kycCount || 0,
            variant: (kycCount || 0) > 50 ? "warning" : "default",
          },
          {
            title: "Withdrawals",
            count: withdrawalCount || 0,
            variant: "default",
          },
          {
            title: "Insurance Claims",
            count: 12,
            variant: "default",
          },
          {
            title: "Disputes",
            count: 8,
            variant: "danger",
          },
        ],
        programHealth: [
          {
            label: "Staking TVL",
            value: "$2.4M",
            delta: { value: 12.5, trend: "up" },
          },
          {
            label: "Spin RTP",
            value: "96.2%",
            delta: { value: 0.3, trend: "up" },
          },
          {
            label: "Draw Fill Rate",
            value: "87%",
            delta: { value: 5, trend: "up" },
          },
          {
            label: "Ads Impressions",
            value: "1.2M",
            delta: { value: 22, trend: "up" },
            sparkline: [900, 950, 1000, 1050, 1100, 1150, 1200],
          },
        ],
        recentActivity: activityItems,
      });
    } catch (error: any) {
      console.error("Error fetching admin dashboard data:", error);
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, refetch: fetchDashboardData };
}
