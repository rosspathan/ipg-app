import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, TrendingUp, Lock, Clock, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const StakingScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pools, setPools] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [poolsResponse, submissionsResponse] = await Promise.all([
        supabase.from("staking_pools").select("*").eq("active", true).order("apy", { ascending: false }),
        user ? supabase.from("user_staking_submissions").select(`
          *,
          staking_pools(name)
        `).eq("user_id", user.id).order("created_at", { ascending: false }) : { data: [], error: null }
      ]);

      if (poolsResponse.error) throw poolsResponse.error;
      
      setPools(poolsResponse.data || []);
      setSubmissions(submissionsResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStake = (poolId: string) => {
    navigate(`/app/staking/${poolId}/submit`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/app/home")}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Staking</h1>
      </div>

      <Tabs defaultValue="pools" className="flex-1">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pools">Staking Pools</TabsTrigger>
          <TabsTrigger value="active">My Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="pools" className="space-y-4">
          {pools.length === 0 ? (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No active staking pools</p>
              </CardContent>
            </Card>
          ) : (
            pools.map((pool) => (
              <Card key={pool.id} className="bg-gradient-card shadow-card border-0">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{pool.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Min: {pool.min_stake_amount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-500">{pool.apy}%</p>
                      <p className="text-xs text-muted-foreground">APY</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {pool.has_lock_period ? `${pool.lock_period_days} days` : "Flexible"}
                        </p>
                        <p className="text-xs text-muted-foreground">Lock Period</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {pool.reward_distribution}
                        </p>
                        <p className="text-xs text-muted-foreground">Distribution</p>
                      </div>
                    </div>
                  </div>

                  {pool.description && (
                    <p className="text-sm text-muted-foreground">
                      {pool.description}
                    </p>
                  )}

                  <Button 
                    onClick={() => handleStake(pool.id)}
                    className="w-full"
                  >
                    Stake Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {submissions.length > 0 ? (
            submissions.map((submission) => (
              <Card key={submission.id} className="bg-gradient-card shadow-card border-0">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {submission.staking_pools?.name || "Staking Pool"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {submission.stake_amount} {submission.currency}
                      </p>
                    </div>
                    <Badge
                      variant={
                        submission.status === "approved"
                          ? "default"
                          : submission.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {submission.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-sm">{submission.user_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted</p>
                      <p className="font-medium text-sm">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {submission.admin_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Admin Notes</p>
                      <p className="text-sm">{submission.admin_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Submissions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start staking to earn rewards on your crypto
                </p>
                <Button onClick={() => navigate("/app/programs/staking")}>
                  Explore Staking Pools
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StakingScreen;