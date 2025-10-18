import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, TrendingUp, Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface StakingReward {
  id: string;
  user_id: string;
  pool_id: string;
  stake_amount: number;
  reward_amount: number;
  apy_used: number;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  staking_pools?: { name: string };
}

interface StakingPool {
  id: string;
  name: string;
  apy: number;
}

interface RewardDistribution {
  id: string;
  admin_id: string;
  pool_id: string | null;
  total_users: number;
  total_bsk_distributed: number;
  distribution_type: string;
  period_start: string;
  period_end: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  notes: string | null;
  staking_pools?: { name: string };
}

export const StakingRewardsManager = () => {
  const [pendingRewards, setPendingRewards] = useState<StakingReward[]>([]);
  const [distributions, setDistributions] = useState<RewardDistribution[]>([]);
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributionDialogOpen, setDistributionDialogOpen] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<string>("all");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [distributionNotes, setDistributionNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [rewardsResponse, poolsResponse, distributionsResponse] = await Promise.all([
        supabase
          .from("staking_rewards")
          .select(`
            *,
            staking_pools(name)
          `)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("staking_pools")
          .select("id, name, apy")
          .eq("active", true),
        supabase
          .from("staking_reward_distributions")
          .select(`
            *,
            staking_pools(name)
          `)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (rewardsResponse.error) throw rewardsResponse.error;
      if (poolsResponse.error) throw poolsResponse.error;
      if (distributionsResponse.error) throw distributionsResponse.error;

      setPendingRewards(rewardsResponse.data || []);
      setPools(poolsResponse.data || []);
      setDistributions(distributionsResponse.data || []);
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
  }, []);

  const calculatePendingStats = () => {
    const filtered = selectedPoolId === "all" 
      ? pendingRewards 
      : pendingRewards.filter(r => r.pool_id === selectedPoolId);

    return {
      totalUsers: new Set(filtered.map(r => r.user_id)).size,
      totalBSK: filtered.reduce((sum, r) => sum + r.reward_amount, 0),
      totalRewards: filtered.length,
    };
  };

  const handleDistributeRewards = async () => {
    try {
      setProcessing(true);

      // Filter rewards based on selected pool
      const rewardsToDistribute = selectedPoolId === "all"
        ? pendingRewards
        : pendingRewards.filter(r => r.pool_id === selectedPoolId);

      if (rewardsToDistribute.length === 0) {
        toast({
          title: "No rewards to distribute",
          description: "Please select a pool with pending rewards",
          variant: "destructive",
        });
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rewardIds = rewardsToDistribute.map(r => r.id);
      const uniqueUsers = new Set(rewardsToDistribute.map(r => r.user_id));
      const totalBSK = rewardsToDistribute.reduce((sum, r) => sum + r.reward_amount, 0);

      // Create distribution record
      const { data: distributionData, error: distributionError } = await supabase
        .from("staking_reward_distributions")
        .insert({
          admin_id: user.id,
          pool_id: selectedPoolId === "all" ? null : selectedPoolId,
          total_users: uniqueUsers.size,
          total_bsk_distributed: totalBSK,
          distribution_type: "manual",
          period_start: periodStart || new Date().toISOString(),
          period_end: periodEnd || new Date().toISOString(),
          reward_ids: rewardIds,
          status: "processing",
          notes: distributionNotes || null,
        })
        .select()
        .single();

      if (distributionError) throw distributionError;

      // Process each reward
      for (const reward of rewardsToDistribute) {
        // Credit BSK balance - upsert to ensure record exists
        const { data: currentBalance } = await supabase
          .from("user_bsk_balances")
          .select("holding_balance")
          .eq("user_id", reward.user_id)
          .single();

        if (currentBalance) {
          // Update existing balance
          await supabase
            .from("user_bsk_balances")
            .update({
              holding_balance: currentBalance.holding_balance + reward.reward_amount,
              total_earned_holding: currentBalance.holding_balance + reward.reward_amount,
            })
            .eq("user_id", reward.user_id);
        } else {
          // Create new balance record
          await supabase
            .from("user_bsk_balances")
            .insert({
              user_id: reward.user_id,
              holding_balance: reward.reward_amount,
              withdrawable_balance: 0,
              total_earned_holding: reward.reward_amount,
              total_earned_withdrawable: 0,
            });
        }

        // Mark reward as distributed
        await supabase
          .from("staking_rewards")
          .update({
            status: "distributed",
            distributed_at: new Date().toISOString(),
            distributed_by: user.id,
          })
          .eq("id", reward.id);
      }

      // Mark distribution as completed
      await supabase
        .from("staking_reward_distributions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", distributionData.id);

      toast({
        title: "Rewards distributed successfully",
        description: `Distributed ${totalBSK.toFixed(2)} BSK to ${uniqueUsers.size} users`,
      });

      setDistributionDialogOpen(false);
      setPeriodStart("");
      setPeriodEnd("");
      setDistributionNotes("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error distributing rewards",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const stats = calculatePendingStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading rewards data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Rewards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pending BSK</p>
                <p className="text-2xl font-bold">{stats.totalBSK.toFixed(2)}</p>
              </div>
              <Gift className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Rewards</p>
                <p className="text-2xl font-bold">{stats.totalRewards}</p>
              </div>
              <Clock className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Distribute Rewards
            </CardTitle>
            <Dialog open={distributionDialogOpen} onOpenChange={setDistributionDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={pendingRewards.length === 0}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Distribute Now
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Distribute Staking Rewards</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Pool</Label>
                    <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Pools</SelectItem>
                        {pools.map(pool => (
                          <SelectItem key={pool.id} value={pool.id}>
                            {pool.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Start</Label>
                      <Input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Period End</Label>
                      <Input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input
                      placeholder="e.g., Weekly rewards distribution"
                      value={distributionNotes}
                      onChange={(e) => setDistributionNotes(e.target.value)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-semibold">Distribution Summary</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Users</p>
                        <p className="font-semibold">{stats.totalUsers}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total BSK</p>
                        <p className="font-semibold">{stats.totalBSK.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDistributionDialogOpen(false)}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleDistributeRewards} disabled={processing}>
                    {processing ? "Processing..." : "Confirm Distribution"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Filter by Pool</Label>
            <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pools</SelectItem>
                {pools.map(pool => (
                  <SelectItem key={pool.id} value={pool.id}>
                    {pool.name} ({pendingRewards.filter(r => r.pool_id === pool.id).length} pending)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pending Rewards List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRewards.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No pending rewards to distribute</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRewards
                .filter(r => selectedPoolId === "all" || r.pool_id === selectedPoolId)
                .map((reward) => (
                <div key={reward.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">User ID: {reward.user_id.slice(0, 8)}...</p>
                      <p className="text-sm text-muted-foreground">
                        {reward.staking_pools?.name}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {reward.reward_amount.toFixed(2)} BSK
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Stake Amount</p>
                      <p className="font-medium">{reward.stake_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">APY Used</p>
                      <p className="font-medium">{reward.apy_used}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution History */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution History</CardTitle>
        </CardHeader>
        <CardContent>
          {distributions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No distribution history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {distributions.map((dist) => (
                <div key={dist.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">
                        {dist.staking_pools?.name || "All Pools"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(dist.created_at), "PPp")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        dist.status === "completed"
                          ? "default"
                          : dist.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {dist.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Users</p>
                      <p className="font-semibold">{dist.total_users}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total BSK</p>
                      <p className="font-semibold">{dist.total_bsk_distributed.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-semibold capitalize">{dist.distribution_type}</p>
                    </div>
                  </div>
                  {dist.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{dist.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
