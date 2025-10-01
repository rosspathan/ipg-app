import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  Play,
  Clock,
  Coins,
  TrendingUp,
  Video,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdMiningPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const [watchingAd, setWatchingAd] = useState<any>(null);
  const [watchProgress, setWatchProgress] = useState(0);

  // Fetch available ads
  const { data: ads, isLoading } = useQuery({
    queryKey: ["available-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("status", "active")
        .order("reward_bsk", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's ad history
  const { data: adHistory } = useQuery({
    queryKey: ["ad-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("ad_clicks")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate today's earnings
  const todayEarnings = React.useMemo(() => {
    if (!adHistory) return 0;
    const today = new Date().toDateString();
    return adHistory
      .filter((ad) => new Date(ad.completed_at || "").toDateString() === today)
      .reduce((sum, ad) => sum + Number(ad.reward_bsk || 0), 0);
  }, [adHistory]);

  // Watch ad mutation
  const watchAdMutation = useMutation({
    mutationFn: async (adId: string) => {
      const { data, error } = await supabase
        .from("ad_clicks")
        .insert({
          user_id: user?.id,
          ad_id: adId,
          started_at: new Date().toISOString(),
          rewarded: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-history"] });
    },
  });

  const handleWatchAd = (ad: any) => {
    if (!user) {
      toast.error("Please login to watch ads");
      return;
    }

    setWatchingAd(ad);
    setWatchProgress(0);

    // Simulate watching progress
    const duration = ad.required_view_time_seconds || 30;
    const interval = setInterval(() => {
      setWatchProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleCompleteAd(ad);
          return 100;
        }
        return prev + 100 / duration;
      });
    }, 1000);
  };

  const handleCompleteAd = async (ad: any) => {
    try {
      await watchAdMutation.mutateAsync(ad.id);
      toast.success(`Earned ${ad.reward_bsk} BSK!`);
      setWatchingAd(null);
      setWatchProgress(0);
    } catch (error) {
      toast.error("Failed to complete ad");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-warning/20 via-warning/10 to-transparent p-6 border-b border-border/50">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
          Ad Mining
        </h1>
        <p className="text-sm text-muted-foreground">
          Watch ads and earn BSK tokens
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Today's Earnings</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {todayEarnings.toFixed(2)} BSK
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Ads Watched</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {adHistory?.filter((a) => a.completed_at).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Watching Ad */}
        {watchingAd && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Watching Ad...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
                <Video className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-foreground">
                    {Math.round(watchProgress)}%
                  </span>
                </div>
                <Progress value={watchProgress} className="h-2" />
              </div>
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <span className="text-sm text-muted-foreground">Reward</span>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-success" />
                  <span className="font-bold text-success">
                    {watchingAd.reward_bsk} BSK
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Ads */}
        {!watchingAd && (
          <div className="space-y-3">
            <h2 className="text-lg font-heading font-bold text-foreground">
              Available Ads
            </h2>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading ads...
              </div>
            ) : ads && ads.length > 0 ? (
              ads.map((ad: any) => (
                <Card key={ad.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-20 h-20 bg-muted/50 rounded-lg flex items-center justify-center">
                        {ad.image_url ? (
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Video className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          {ad.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ad.required_view_time_seconds}s
                          </div>
                          <div className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-success" />
                            {ad.reward_bsk} BSK
                          </div>
                        </div>
                        <Button
                          onClick={() => handleWatchAd(ad)}
                          size="sm"
                          className="w-full gap-2 bg-primary"
                        >
                          <Play className="w-4 h-4" />
                          Watch & Earn
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No ads available right now</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check back later for new opportunities
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Recent Activity */}
        {!watchingAd && adHistory && adHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {adHistory.slice(0, 5).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Ad Completed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-success">
                      +{item.reward_bsk} BSK
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
