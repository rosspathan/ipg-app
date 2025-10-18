import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Award, TrendingUp, Users, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BadgePurchaseEvent {
  id: string;
  user_id: string;
  event_type: string;
  from_badge: string | null;
  to_badge: string;
  paid_amount_bsk: number;
  commissionable_amount_bsk: number;
  occurred_at: string;
  created_at: string;
}

interface DirectReferrerReward {
  id: string;
  user_id: string;
  referrer_id: string;
  badge_qualification_event_id: string;
  reward_amount: number;
  reward_token: string;
  reward_token_amount: number;
  status: string;
  cooloff_until: string | null;
  clawback_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface BadgeQualificationEvent {
  id: string;
  user_id: string;
  badge_name: string;
  previous_badge: string | null;
  qualifying_amount: number;
  qualification_type: string;
  transaction_hash: string | null;
  created_at: string;
}

export default function BadgeQualificationAdmin() {
  const [purchaseEvents, setPurchaseEvents] = useState<BadgePurchaseEvent[]>([]);
  const [referrerRewards, setReferrerRewards] = useState<DirectReferrerReward[]>([]);
  const [qualificationEvents, setQualificationEvents] = useState<BadgeQualificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<DirectReferrerReward | null>(null);
  const [clawbackReason, setClawbackReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchaseEventsRes, rewardsRes, qualificationRes] = await Promise.all([
        supabase
          .from("badge_purchase_events")
          .select("*")
          .order("occurred_at", { ascending: false })
          .limit(50),
        supabase
          .from("direct_referrer_rewards")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("badge_qualification_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (purchaseEventsRes.error) throw purchaseEventsRes.error;
      if (rewardsRes.error) throw rewardsRes.error;
      if (qualificationRes.error) throw qualificationRes.error;

      setPurchaseEvents(purchaseEventsRes.data || []);
      setReferrerRewards(rewardsRes.data || []);
      setQualificationEvents(qualificationRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSettleCooloff = async () => {
    try {
      setProcessing(true);
      
      // Find rewards past cooloff
      const now = new Date();
      const rewardsToSettle = referrerRewards.filter(
        r => r.status === "pending" && r.cooloff_until && new Date(r.cooloff_until) <= now
      );

      if (rewardsToSettle.length === 0) {
        toast({
          title: "No rewards to settle",
          description: "All cooloff periods are still active",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Settle each reward
      for (const reward of rewardsToSettle) {
        // Credit BSK balance
        const { data: currentBalance } = await supabase
          .from("user_bsk_balances")
          .select("withdrawable_balance")
          .eq("user_id", reward.referrer_id)
          .single();

        if (currentBalance) {
          await supabase
            .from("user_bsk_balances")
            .update({
              withdrawable_balance: currentBalance.withdrawable_balance + reward.reward_token_amount,
            })
            .eq("user_id", reward.referrer_id);
        } else {
          await supabase
            .from("user_bsk_balances")
            .insert({
              user_id: reward.referrer_id,
              withdrawable_balance: reward.reward_token_amount,
              holding_balance: 0,
              total_earned_withdrawable: reward.reward_token_amount,
              total_earned_holding: 0,
            });
        }

        // Update reward status
        await supabase
          .from("direct_referrer_rewards")
          .update({ status: "settled" })
          .eq("id", reward.id);
      }

      toast({
        title: "Rewards settled",
        description: `Settled ${rewardsToSettle.length} rewards worth ${rewardsToSettle.reduce((sum, r) => sum + r.reward_token_amount, 0).toFixed(2)} BSK`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error settling rewards",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleClawback = async () => {
    if (!selectedReward || !clawbackReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for clawback",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase
        .from("direct_referrer_rewards")
        .update({
          status: "clawback",
          clawback_reason: clawbackReason,
          clawback_by: user.id,
          clawback_at: new Date().toISOString(),
        })
        .eq("id", selectedReward.id);

      toast({
        title: "Reward clawback successful",
        description: `Clawed back ${selectedReward.reward_token_amount.toFixed(2)} BSK`,
      });

      setSelectedReward(null);
      setClawbackReason("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error processing clawback",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const calculateStats = () => {
    const pendingRewards = referrerRewards.filter(r => r.status === "pending");
    const settledRewards = referrerRewards.filter(r => r.status === "settled");
    const totalPending = pendingRewards.reduce((sum, r) => sum + r.reward_token_amount, 0);
    const totalSettled = settledRewards.reduce((sum, r) => sum + r.reward_token_amount, 0);

    return {
      totalPurchases: purchaseEvents.length,
      totalRewards: referrerRewards.length,
      pendingRewards: pendingRewards.length,
      totalPendingBSK: totalPending,
      settledRewards: settledRewards.length,
      totalSettledBSK: totalSettled,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading badge qualification data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Badge Qualification & Rewards</h1>
        <p className="text-muted-foreground">
          Manage badge purchases, qualifications, and direct referrer rewards
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold">{stats.totalPurchases}</p>
              </div>
              <Award className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Rewards</p>
                <p className="text-2xl font-bold">{stats.pendingRewards}</p>
                <p className="text-xs text-muted-foreground">{stats.totalPendingBSK.toFixed(2)} BSK</p>
              </div>
              <Clock className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Settled Rewards</p>
                <p className="text-2xl font-bold">{stats.settledRewards}</p>
                <p className="text-xs text-muted-foreground">{stats.totalSettledBSK.toFixed(2)} BSK</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              className="w-full"
              onClick={handleSettleCooloff}
              disabled={processing || stats.pendingRewards === 0}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Settle Cooloffs
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Settle all pending rewards past cooloff
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rewards">Referrer Rewards</TabsTrigger>
          <TabsTrigger value="purchases">Badge Purchases</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Direct Referrer Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              {referrerRewards.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No referrer rewards yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referrerRewards.map((reward) => (
                    <div key={reward.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            Referrer: {reward.referrer_id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            User: {reward.user_id.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              reward.status === "settled"
                                ? "default"
                                : reward.status === "pending"
                                ? "secondary"
                                : reward.status === "clawback"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {reward.status}
                          </Badge>
                          {reward.status === "pending" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setSelectedReward(reward)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Clawback
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Reward Amount</p>
                          <p className="font-semibold">
                            {reward.reward_token_amount.toFixed(2)} {reward.reward_token}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">{format(new Date(reward.created_at), "MMM d, yyyy")}</p>
                        </div>
                        {reward.cooloff_until && (
                          <div>
                            <p className="text-muted-foreground">Cooloff Until</p>
                            <p className="font-medium">
                              {new Date(reward.cooloff_until) > new Date()
                                ? formatDistanceToNow(new Date(reward.cooloff_until), { addSuffix: true })
                                : "Ready"}
                            </p>
                          </div>
                        )}
                        {reward.clawback_reason && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Clawback Reason</p>
                            <p className="font-medium text-destructive">{reward.clawback_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Badge Purchase Events</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No badge purchases yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchaseEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">
                            User: {event.user_id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.event_type === "badge_upgrade" ? "Upgraded" : "Purchased"}: {event.from_badge || "NONE"} → {event.to_badge}
                          </p>
                        </div>
                        <Badge variant="outline">{event.event_type}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Paid Amount</p>
                          <p className="font-semibold">{event.paid_amount_bsk.toFixed(2)} BSK</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Commissionable</p>
                          <p className="font-semibold">{event.commissionable_amount_bsk.toFixed(2)} BSK</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Occurred</p>
                          <p className="font-medium">{format(new Date(event.occurred_at), "PPp")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Badge Qualification Events</CardTitle>
            </CardHeader>
            <CardContent>
              {qualificationEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No qualification events yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {qualificationEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">
                            User: {event.user_id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.previous_badge || "NONE"} → {event.badge_name}
                          </p>
                        </div>
                        <Badge variant="outline">{event.qualification_type}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Qualifying Amount</p>
                          <p className="font-semibold">{event.qualifying_amount.toFixed(2)} BSK</p>
                        </div>
                        {event.transaction_hash && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">TX Hash</p>
                            <p className="font-mono text-xs truncate">{event.transaction_hash}</p>
                          </div>
                        )}
                        <div className="col-span-2 md:col-span-3">
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">{format(new Date(event.created_at), "PPp")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clawback Dialog */}
      <Dialog open={selectedReward !== null} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clawback Reward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Warning</p>
                  <p className="text-sm text-muted-foreground">
                    This will permanently cancel this reward. The referrer will not receive the BSK.
                  </p>
                </div>
              </div>
            </div>

            {selectedReward && (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="font-semibold">{selectedReward.reward_token_amount.toFixed(2)} BSK</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Referrer:</span>{" "}
                  <span className="font-mono text-xs">{selectedReward.referrer_id}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason for Clawback *</Label>
              <Textarea
                value={clawbackReason}
                onChange={(e) => setClawbackReason(e.target.value)}
                placeholder="e.g., User refunded, policy violation, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReward(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClawback}
              disabled={processing || !clawbackReason.trim()}
            >
              {processing ? "Processing..." : "Confirm Clawback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
