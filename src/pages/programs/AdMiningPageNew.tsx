import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor, Clock, Gift, Play, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { useProgramConfig } from "@/hooks/useProgramConfig";

export default function AdMiningPageNew() {
  return (
    <ProgramAccessGate programKey="adverts_mining" title="Ad Mining">
      <AdMiningContent />
    </ProgramAccessGate>
  )
}

function AdMiningContent() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const programConfig = useProgramConfig("ad-mining");
  const config = programConfig.data?.config as any;

  // Fetch available ads
  const { data: ads, isLoading: adsLoading } = useQuery({
    queryKey: ["available-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("status", "active")
        .gte("end_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's ad viewing history today
  const { data: todayViews } = useQuery({
    queryKey: ["ad-views-today", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("ad_clicks")
        .select("*")
        .eq("user_id", user!.id)
        .gte("started_at", today.toISOString())
        .eq("rewarded", true);

      if (error) throw error;
      return data || [];
    },
  });

  // Watch ad mutation - uses secure edge function
  const watchAdMutation = useMutation({
    mutationFn: async (adId: string) => {
      const ad = ads?.find((a) => a.id === adId);
      if (!ad) throw new Error("Ad not found");

      // Simulate watching the ad (track viewing time)
      const startTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, ad.required_view_time_seconds * 1000));
      const viewingTimeSeconds = Math.floor((Date.now() - startTime) / 1000);

      // Call secure edge function to process ad click
      const { data, error } = await supabase.functions.invoke("process-ad-click", {
        body: {
          adId,
          viewingTimeSeconds,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to process ad click");

      return { 
        adId, 
        reward: data.reward_bsk,
        balanceType: data.balance_type,
        viewsRemaining: data.views_remaining
      };
    },
    onSuccess: (data) => {
      toast.success(`Earned ${data.reward} BSK!`, {
        description: "Reward has been credited to your balance",
      });
      queryClient.invalidateQueries({ queryKey: ["ad-views-today"] });
      queryClient.invalidateQueries({ queryKey: ["user-bsk-balance"] });
    },
    onError: (error: any) => {
      toast.error("Failed to watch ad", {
        description: error.message,
      });
    },
  });

  const dailyLimit = config?.limits?.adsPerDay || 5;
  const viewsToday = todayViews?.length || 0;
  const remainingViews = Math.max(0, dailyLimit - viewsToday);

  if (programConfig.isLoading || adsLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 p-4 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header Stats */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Ad Mining</h1>
              <p className="text-sm text-muted-foreground">Watch ads and earn BSK rewards</p>
            </div>
            <Monitor className="h-8 w-8 text-primary" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Today's Views</p>
              <p className="text-2xl font-bold">{viewsToday}/{dailyLimit}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold text-primary">{remainingViews}</p>
            </div>
          </div>

          <Progress value={(viewsToday / dailyLimit) * 100} className="mt-4" />
        </Card>

        {/* Daily Limit Info */}
        {remainingViews === 0 && (
          <Card className="p-4 bg-warning/5 border-warning/20">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-sm">Daily limit reached</p>
                <p className="text-xs text-muted-foreground">
                  Come back tomorrow for more earning opportunities
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Available Ads */}
        <div className="space-y-3">
          <h2 className="font-semibold">Available Ads</h2>

          {!ads || ads.length === 0 ? (
            <Card className="p-8 text-center">
              <Gift className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No ads available right now</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later</p>
            </Card>
          ) : (
            ads.map((ad) => {
              const alreadyWatched = todayViews?.some((v) => v.ad_id === ad.id);
              const canWatch = remainingViews > 0 && !alreadyWatched;

              return (
                <Card key={ad.id} className="p-4">
                  <div className="flex items-start gap-4">
                    {ad.square_image_url ? (
                      <img
                        src={ad.square_image_url}
                        alt={ad.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <Monitor className="h-8 w-8 text-primary" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{ad.title}</h3>
                        {alreadyWatched && (
                          <Badge variant="outline" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Watched
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ad.required_view_time_seconds}s
                        </span>
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Gift className="h-3 w-3" />
                          {ad.reward_bsk} BSK
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      disabled={!canWatch || watchAdMutation.isPending}
                      onClick={() => watchAdMutation.mutate(ad.id)}
                      className="min-h-[44px] min-w-[44px]"
                    >
                      {alreadyWatched ? (
                        <Check className="h-4 w-4" />
                      ) : !canWatch ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Watch
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Subscription Tiers (Coming Soon) */}
        <Card className="p-6 bg-muted/50">
          <div className="text-center">
            <Gift className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">Premium Subscriptions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Unlock higher daily limits and better rewards
            </p>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
