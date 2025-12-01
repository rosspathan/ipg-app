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
import { Monitor, Clock, Gift, Zap, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useProgramConfig } from "@/hooks/useProgramConfig";
import { AdPlayer } from "@/components/ads/AdPlayer";
import { AdCard } from "@/components/ads/AdCard";
import { SubscriptionTierCard } from "@/components/ads/SubscriptionTierCard";

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
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

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

  // Fetch subscription tiers
  const { data: subscriptionTiers, isLoading: tiersLoading } = useQuery({
    queryKey: ["ad-subscription-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_subscription_tiers")
        .select("*")
        .eq("is_active", true)
        .order("tier_bsk", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's active subscriptions
  const { data: userSubscriptions } = useQuery({
    queryKey: ["user-ad-subscriptions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_user_subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .gte("end_date", new Date().toISOString());

      if (error) throw error;
      return data || [];
    },
  });

  // Watch ad handler - opens ad player
  const handleWatchAd = (ad: any) => {
    setSelectedAd(ad);
    setIsPlayerOpen(true);
  };

  // Process ad completion
  const handleAdComplete = async (adId: string, viewTimeSeconds: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("process-ad-click", {
        body: {
          adId,
          viewingTimeSeconds: viewTimeSeconds,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to process ad click");

      toast.success(`Earned ${data.reward_bsk} BSK!`, {
        description: `Credited to your ${data.balance_type} balance`,
      });

      queryClient.invalidateQueries({ queryKey: ["ad-views-today"] });
      queryClient.invalidateQueries({ queryKey: ["user-bsk-balance"] });
    } catch (error: any) {
      toast.error("Failed to claim reward", {
        description: error.message,
      });
      throw error;
    }
  };

  // Purchase subscription
  const purchaseSubscriptionMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const { data, error } = await supabase.functions.invoke("purchase-ad-subscription", {
        body: { tier_id: tierId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to purchase subscription");

      return data;
    },
    onSuccess: (data) => {
      toast.success("Subscription activated!", {
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["user-ad-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["user-bsk-balance"] });
    },
    onError: (error: any) => {
      toast.error("Purchase failed", {
        description: error.message,
      });
    },
  });
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

  const dailyLimit = config?.limits?.adsPerDay || 5;
  const viewsToday = todayViews?.length || 0;
  const remainingViews = Math.max(0, dailyLimit - viewsToday);
  const hasActiveSubscription = (userSubscriptions?.length || 0) > 0;

  if (programConfig.isLoading || adsLoading || tiersLoading) {
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
      {/* Ad Player Modal */}
      {selectedAd && (
        <AdPlayer
          ad={selectedAd}
          isOpen={isPlayerOpen}
          onClose={() => {
            setIsPlayerOpen(false);
            setSelectedAd(null);
          }}
          onComplete={handleAdComplete}
        />
      )}

      <div className="p-4 space-y-6">
        {/* Header Stats */}
        <Card className="p-6 glass-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-heading font-bold">Ad Mining</h1>
              <p className="text-sm text-muted-foreground">Watch ads and earn BSK rewards</p>
            </div>
            <Monitor className="h-8 w-8 text-primary" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Today's Views</p>
              <p className="text-2xl font-heading font-bold">{viewsToday}/{dailyLimit}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-2xl font-heading font-bold text-primary">{remainingViews}</p>
            </div>
          </div>

          <Progress value={(viewsToday / dailyLimit) * 100} className="mt-4" />

          {hasActiveSubscription && (
            <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
              <Zap className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">Premium Active</span>
            </div>
          )}
        </Card>

        {/* Daily Limit Info */}
        {remainingViews === 0 && (
          <Card className="p-4 bg-warning/5 border-warning/20">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-sm">Daily limit reached</p>
                <p className="text-xs text-muted-foreground">
                  {hasActiveSubscription 
                    ? "You've watched all available ads today"
                    : "Upgrade to premium for higher daily limits"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Available Ads */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-lg">Available Ads</h2>
            <Badge variant="secondary">{ads?.length || 0} ads</Badge>
          </div>

          {!ads || ads.length === 0 ? (
            <Card className="p-8 text-center">
              <Gift className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No ads available right now</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {ads.map((ad) => {
                const alreadyWatched = todayViews?.some((v) => v.ad_id === ad.id);

                return (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    isWatched={alreadyWatched}
                    onWatch={handleWatchAd}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Subscription Tiers */}
        <div className="space-y-4">
          <div>
            <h2 className="font-heading font-semibold text-lg mb-1">Premium Subscriptions</h2>
            <p className="text-sm text-muted-foreground">
              Unlock higher daily limits and withdrawable rewards
            </p>
          </div>

          {tiersLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : !subscriptionTiers || subscriptionTiers.length === 0 ? (
            <Card className="p-8 text-center bg-muted/50">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No subscription tiers available</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {subscriptionTiers.map((tier, index) => (
                <SubscriptionTierCard
                  key={tier.id}
                  tier={tier}
                  isPopular={index === 1} // Mark the second tier as popular
                  isPremium={index === subscriptionTiers.length - 1} // Mark last tier as premium
                  onPurchase={(tierId) => purchaseSubscriptionMutation.mutate(tierId)}
                  isPurchasing={purchaseSubscriptionMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
