import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Gift, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SpinWheel {
  id: string;
  name: string;
  ticket_price: number;
  ticket_currency: string;
  free_spins_daily: number;
  cooldown_seconds: number;
  max_spins_per_user: number;
}

interface SpinSegment {
  id: string;
  label: string;
  weight: number;
  reward_type: string;
  reward_value: number;
  reward_token: string;
  color?: string;
}

interface SpinRun {
  id: string;
  outcome: any;
  ticket_cost: number;
  created_at: string;
  status: string;
}

export default function SpinWheelScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wheel, setWheel] = useState<SpinWheel | null>(null);
  const [segments, setSegments] = useState<SpinSegment[]>([]);
  const [recentRuns, setRecentRuns] = useState<SpinRun[]>([]);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [winningResult, setWinningResult] = useState<any>(null);

  useEffect(() => {
    loadWheelData();
    
    // Set up realtime subscription for spin_runs
    const channel = supabase
      .channel('spin-runs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'spin_runs'
        },
        (payload) => {
          console.log('New spin run:', payload);
          loadWheelData(); // Refresh data when new runs are added
        }
      )
      .subscribe();
    
    const interval = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadWheelData = async () => {
    try {
      // Load active wheel with time window check
      const { data: wheels } = await supabase
        .from("spin_wheels")
        .select("*")
        .eq("is_active", true)
        .or(`start_at.is.null,start_at.lte.${new Date().toISOString()}`)
        .or(`end_at.is.null,end_at.gte.${new Date().toISOString()}`)
        .limit(1);

      if (!wheels || wheels.length === 0) {
        console.log("No active wheels found, might need to seed demo data");
        return;
      }

      const activeWheel = wheels[0];
      setWheel(activeWheel);

      // Load segments
      const { data: segmentsData } = await supabase
        .from("spin_segments")
        .select("*")
        .eq("wheel_id", activeWheel.id)
        .eq("is_enabled", true)
        .order("weight", { ascending: false });

      if (segmentsData) {
        setSegments(segmentsData);
      }

      // Load user's recent runs
      const { data: runsData } = await supabase
        .from("spin_runs")
        .select("*")
        .eq("wheel_id", activeWheel.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (runsData) {
        setRecentRuns(runsData);
        
        // Calculate free spins left and cooldown
        const today = new Date().toISOString().split('T')[0];
        const todayRuns = runsData.filter(run => 
          run.created_at.startsWith(today)
        );
        
        const spinsToday = todayRuns.length;
        setFreeSpinsLeft(Math.max(0, activeWheel.free_spins_daily - spinsToday));

        // Check cooldown
        if (runsData.length > 0 && activeWheel.cooldown_seconds > 0) {
          const lastRun = new Date(runsData[0].created_at);
          const timeSince = Date.now() - lastRun.getTime();
          const cooldownMs = activeWheel.cooldown_seconds * 1000;
          
          if (timeSince < cooldownMs) {
            setCooldownRemaining(Math.ceil((cooldownMs - timeSince) / 1000));
          }
        }
      }
    } catch (error) {
      console.error("Error loading wheel data:", error);
      toast({
        title: "Error",
        description: "Failed to load wheel data",
        variant: "destructive"
      });
    }
  };

  const handleSpin = async () => {
    if (!wheel || isSpinning || cooldownRemaining > 0) return;

    setIsSpinning(true);
    setWinningResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("spin-execute", {
        body: { wheel_id: wheel.id }
      });

      if (error) throw error;

      if (data.success) {
        setWinningResult(data);
        setFreeSpinsLeft(data.free_spins_remaining || 0);
        
        // Set cooldown
        if (wheel.cooldown_seconds > 0) {
          setCooldownRemaining(wheel.cooldown_seconds);
        }

        // Refresh recent runs
        loadWheelData();

        toast({
          title: "Congratulations! 🎉",
          description: `You won: ${data.label}`,
        });
      } else {
        throw new Error(data.error || "Spin failed");
      }
    } catch (error: any) {
      console.error("Spin error:", error);
      toast({
        title: "Spin Failed",
        description: error.message || "Failed to execute spin",
        variant: "destructive"
      });
    } finally {
      setIsSpinning(false);
    }
  };

  const getTotalWeight = () => segments.reduce((sum, s) => sum + s.weight, 0);
  
  const getSegmentProbability = (weight: number) => {
    const total = getTotalWeight();
    return total > 0 ? ((weight / total) * 100).toFixed(1) : "0";
  };

  const formatCooldown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const canSpin = wheel && !isSpinning && cooldownRemaining === 0;
  const spinCost = freeSpinsLeft > 0 ? 0 : wheel?.ticket_price || 0;

    // Show loading state if no wheel is loaded yet
    if (!wheel) {
      return (
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/app/programs")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Lucky Spin Wheel</h1>
                <p className="text-muted-foreground">Loading wheel data...</p>
              </div>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      );
    }

    return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/programs")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Lucky Spin Wheel</h1>
            {wheel ? (
              <p className="text-muted-foreground">{wheel.name}</p>
            ) : (
              <p className="text-muted-foreground">Loading...</p>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Gift className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{freeSpinsLeft}</div>
              <div className="text-sm text-muted-foreground">Free Spins Left</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Coins className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                {spinCost > 0 ? `${spinCost}` : "FREE"}
              </div>
              <div className="text-sm text-muted-foreground">
                {spinCost > 0 ? wheel?.ticket_currency : "Next Spin"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                {cooldownRemaining > 0 ? formatCooldown(cooldownRemaining) : "Ready"}
              </div>
              <div className="text-sm text-muted-foreground">Cooldown</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{recentRuns.length}</div>
              <div className="text-sm text-muted-foreground">Total Spins</div>
            </CardContent>
          </Card>
        </div>

        {/* Wheel Segments */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Wheel Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {segments.map((segment) => (
                <div 
                  key={segment.id}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    winningResult?.segment_id === segment.id 
                      ? "border-primary bg-primary/10 animate-pulse" 
                      : "border-border"
                  }`}
                  style={{ backgroundColor: segment.color ? `${segment.color}20` : undefined }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{segment.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {segment.reward_type !== "nothing" && (
                          <>
                            Reward: {segment.reward_value} {segment.reward_token || segment.reward_type}
                          </>
                        )}
                        {segment.reward_type === "nothing" && "No reward"}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {getSegmentProbability(segment.weight)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spin Button */}
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <Button
              size="lg"
              onClick={handleSpin}
              disabled={!canSpin}
              className="w-full max-w-xs mx-auto h-16 text-lg"
            >
              {isSpinning ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Spinning...
                </div>
              ) : cooldownRemaining > 0 ? (
                `Wait ${formatCooldown(cooldownRemaining)}`
              ) : (
                `SPIN ${spinCost > 0 ? `(${spinCost} ${wheel?.ticket_currency})` : "(FREE)"}`
              )}
            </Button>
            
            {!canSpin && cooldownRemaining === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Wheel not available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Winning Result */}
        {winningResult && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle className="text-center">🎉 Congratulations!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-xl font-bold mb-2">{winningResult.label}</div>
              {winningResult.reward.type !== "nothing" && (
                <div className="text-lg text-primary">
                  You won: {winningResult.reward.value} {winningResult.reward.token || winningResult.reward.type}
                </div>
              )}
              {winningResult.reward.type === "nothing" && (
                <div className="text-muted-foreground">Better luck next time!</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Spins */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Spins</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/app/programs/spin/history")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No spins yet. Try your luck!
              </p>
            ) : (
              <div className="space-y-2">
                {recentRuns.slice(0, 5).map((run) => (
                  <div key={run.id} className="flex justify-between items-center p-2 rounded border">
                    <div>
                      <div className="font-medium">{run.outcome?.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(run.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      {run.outcome?.reward_type !== "nothing" ? (
                        <div className="text-sm text-primary">
                          +{run.outcome?.reward_value} {run.outcome?.reward_token}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No reward</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Cost: {run.ticket_cost || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}