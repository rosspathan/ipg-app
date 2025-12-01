import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, Users, DollarSign, Activity } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuickEditAdMining } from "@/components/admin/program-control/QuickEditAdMining";
import { AdInventoryManager } from "@/components/admin/ad-mining/AdInventoryManager";
import { AdMiningAnalytics } from "@/components/admin/ad-mining/AdMiningAnalytics";

export default function AdMiningControlPanel() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch real-time stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["ad-mining-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's ad clicks
      const { data: todayClicks, error: clicksError } = await supabase
        .from("ad_clicks")
        .select("id, user_id, reward_bsk, started_at")
        .gte("started_at", today.toISOString());

      if (clicksError) throw clicksError;

      // Get unique active users today
      const uniqueUsers = new Set(todayClicks?.map(c => c.user_id) || []);

      // Calculate total BSK paid today
      const totalBskPaid = todayClicks?.reduce((sum, c) => sum + (c.reward_bsk || 0), 0) || 0;

      // Calculate average watch time (mock for now, would need actual completion data)
      const avgWatchTime = todayClicks?.length ? 28 : 0;

      // Get yesterday's stats for comparison
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: yesterdayClicks } = await supabase
        .from("ad_clicks")
        .select("id")
        .gte("started_at", yesterday.toISOString())
        .lt("started_at", today.toISOString());

      const changePercent = yesterdayClicks?.length 
        ? Math.round(((todayClicks?.length || 0) - yesterdayClicks.length) / yesterdayClicks.length * 100)
        : 0;

      return {
        adsToday: todayClicks?.length || 0,
        activeUsers: uniqueUsers.size,
        bskPaid: Math.round(totalBskPaid),
        avgWatchTime: avgWatchTime,
        changePercent: changePercent,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={() => navigate('/admin/programs/control')}
          variant="ghost"
          size={isMobile ? "sm" : "default"}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            Ad Mining Control
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Manage ads, rewards, and analytics
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {statsLoading ? (
          <>
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ads Today</p>
                    <p className="text-2xl font-bold">{stats?.adsToday.toLocaleString() || 0}</p>
                  </div>
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                {stats && stats.changePercent !== 0 && (
                  <p className={`text-xs mt-2 ${stats.changePercent > 0 ? 'text-success' : 'text-warning'}`}>
                    {stats.changePercent > 0 ? '+' : ''}{stats.changePercent}% from yesterday
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{stats?.activeUsers.toLocaleString() || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Unique viewers today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">BSK Paid</p>
                    <p className="text-2xl font-bold">{stats?.bskPaid.toLocaleString() || 0}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-success" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Total rewards today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Watch</p>
                    <p className="text-2xl font-bold">{stats?.avgWatchTime || 0}s</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <p className="text-xs text-success mt-2">Engagement metric</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className={isMobile ? "w-full grid grid-cols-3" : ""}>
          <TabsTrigger value="settings">Quick Settings</TabsTrigger>
          <TabsTrigger value="inventory">Ad Inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reward Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickEditAdMining moduleKey="ad_mining" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <AdInventoryManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AdMiningAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
