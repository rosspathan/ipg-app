import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  Users,
  Copy,
  Share2,
  TrendingUp,
  Gift,
  ChevronRight,
  Check,
  Shield,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useTeamReferrals } from "@/hooks/useTeamReferrals";

export default function ReferralsPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { badgeThresholds } = useTeamReferrals();

  // Fetch referral data
  const { data: referralData } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get referral relationships
      const { data: referrals, error } = await supabase
        .from("referral_relationships")
        .select("*")
        .eq("referrer_id", user.id);

      if (error) throw error;

      return {
        totalReferrals: referrals?.length || 0,
        activeReferrals: referrals?.filter((r) => r.referee_id).length || 0,
        referrals: referrals || [],
      };
    },
    enabled: !!user?.id,
  });

  // Fetch earnings
  const { data: earnings } = useQuery({
    queryKey: ["referral-earnings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("referral_events")
        .select("amount_bonus, usd_value")
        .eq("referrer_id", user.id);

      if (error) throw error;

      const totalBSK = data?.reduce((sum, e) => sum + Number(e.amount_bonus), 0) || 0;
      const totalUSD = data?.reduce((sum, e) => sum + Number(e.usd_value), 0) || 0;

      return { totalBSK, totalUSD };
    },
    enabled: !!user?.id,
  });

  // Fetch user's referral code from profile
  const { data: profileData } = useQuery({
    queryKey: ["profile-referral-code", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const code = profileData?.referral_code || user?.id || "";
  const baseHost = typeof window !== 'undefined' ? window.location.origin : 'https://i-smartapp.com';
  const referralLink = code ? `${baseHost}/r/${code}` : "";

  const handleCopyLink = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join me on IPG",
          text: "Start trading crypto with IPG!",
          url: referralLink,
        });
      } else {
        handleCopyLink();
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      {/* Backlink */}
      <BacklinkBar programName="Referral Program" />
      
      <div className="p-4 space-y-4">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-4">
          Earn rewards by inviting friends
        </p>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Referrals</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {referralData?.totalReferrals || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {referralData?.activeReferrals || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Card */}
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="w-5 h-5 text-warning" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">BSK Earned</span>
              <span className="text-lg font-bold text-foreground">
                {earnings?.totalBSK.toFixed(2) || "0.00"} BSK
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">USD Value</span>
              <span className="text-lg font-bold text-success">
                ${earnings?.totalUSD.toFixed(2) || "0.00"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Badge Subscription Card */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
              Unlock More Levels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Purchase badges to unlock deeper referral levels and earn more commissions
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Available Badges</span>
                <span className="text-sm font-bold text-foreground">
                  {badgeThresholds.length} tiers
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Starting From</span>
                <span className="text-sm font-bold text-foreground">
                  {badgeThresholds[0]?.bsk_threshold || 0} BSK
                </span>
              </div>
            </div>

            <Button 
              onClick={() => navigate('/app/badge-subscription')}
              className="w-full gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              <Shield className="w-4 h-4" />
              View & Buy Badges
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Referral Link Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-foreground font-mono break-all" data-testid="referral-link">
                {referralLink || 'Sign in to generate your personal referral link'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopyLink}
                className="flex-1 gap-2"
                variant={copied ? "default" : "outline"}
                disabled={!referralLink}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button onClick={handleShare} className="flex-1 gap-2 bg-primary" disabled={!referralLink}>
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Share Your Link</p>
                <p className="text-sm text-muted-foreground">
                  Send your referral link to friends
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Friends Sign Up</p>
                <p className="text-sm text-muted-foreground">
                  They create an account using your link
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Earn Rewards</p>
                <p className="text-sm text-muted-foreground">
                  Get BSK tokens for each successful referral
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        {referralData && referralData.referrals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Referrals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {referralData.referrals.slice(0, 5).map((referral: any, idx: number) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">User {idx + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Active
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
