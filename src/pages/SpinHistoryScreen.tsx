import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SpinRun {
  id: string;
  wheel_id: string;
  outcome: any;
  ticket_cost: number;
  ticket_currency: string;
  created_at: string;
  status: string;
}

interface SpinGrant {
  id: string;
  type: string;
  value: number;
  token: string;
  meta: any;
  created_at: string;
}

export default function SpinHistoryScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [runs, setRuns] = useState<SpinRun[]>([]);
  const [grants, setGrants] = useState<SpinGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpins: 0,
    totalWon: 0,
    totalSpent: 0
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);

      // Load spin runs
      const { data: runsData, error: runsError } = await supabase
        .from("spin_runs")
        .select("*")
        .order("created_at", { ascending: false });

      if (runsError) throw runsError;

      // Load grants
      const { data: grantsData, error: grantsError } = await supabase
        .from("spin_grants")
        .select("*")
        .order("created_at", { ascending: false });

      if (grantsError) throw grantsError;

      setRuns(runsData || []);
      setGrants(grantsData || []);

      // Calculate stats
      if (runsData) {
        const totalSpins = runsData.length;
        const totalSpent = runsData.reduce((sum, run) => sum + (run.ticket_cost || 0), 0);
        const totalWon = (grantsData || []).filter(grant => grant.type === "token").length;

        setStats({
          totalSpins,
          totalWon,
          totalSpent
        });
      }

    } catch (error: any) {
      console.error("Error loading history:", error);
      toast({
        title: "Error",
        description: "Failed to load spin history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "granted": return "default";
      case "won": return "secondary";
      case "pending": return "outline";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const groupRunsByDate = (runs: SpinRun[]) => {
    const groups: { [key: string]: SpinRun[] } = {};
    
    runs.forEach(run => {
      const date = new Date(run.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(run);
    });
    
    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const groupedRuns = groupRunsByDate(runs);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/programs/spin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Spin History</h1>
            <p className="text-muted-foreground">Your complete spinning record</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalSpins}</div>
              <div className="text-sm text-muted-foreground">Total Spins</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalWon}</div>
              <div className="text-sm text-muted-foreground">Prizes Won</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.totalSpent}</div>
              <div className="text-sm text-muted-foreground">Total Spent</div>
            </CardContent>
          </Card>
        </div>

        {/* Grants Summary */}
        {grants.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Rewards Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {grants.map((grant) => (
                  <div key={grant.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <div className="font-medium text-green-800">
                        {grant.type === "token" ? `${grant.value} ${grant.token}` : grant.type}
                      </div>
                      <div className="text-sm text-green-600">
                        {formatDate(grant.created_at)}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {grant.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spin History */}
        <div className="space-y-6">
          {Object.keys(groupedRuns).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Spin History</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't spun the wheel yet. Start spinning to see your history here!
                </p>
                <Button onClick={() => navigate("/app/programs/spin")}>
                  Go to Spin Wheel
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedRuns).map(([date, dateRuns]) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="text-lg">{date}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dateRuns.map((run) => (
                      <div key={run.id} className="flex justify-between items-center p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium">{run.outcome?.label || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(run.created_at)}
                          </div>
                          {run.outcome?.reward_type !== "nothing" && run.outcome?.reward_value && (
                            <div className="text-sm text-green-600">
                              Reward: {run.outcome.reward_value} {run.outcome.reward_token || run.outcome.reward_type}
                            </div>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant={getStatusColor(run.status)}>
                            {run.status}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            Cost: {run.ticket_cost || 0} {run.ticket_currency || ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}