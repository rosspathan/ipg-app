import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, History, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FuturisticSpinWheel } from "@/components/gamification/FuturisticSpinWheel";
import BonusBalanceCard from "@/components/BonusBalanceCard";

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
  const [bonusBalanceKey, setBonusBalanceKey] = useState(0);

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
          setBonusBalanceKey(prev => prev + 1); // Force bonus balance update
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
      // Load the BSK Fortune Wheel specifically
      const { data: wheels } = await supabase
        .from("spin_wheels")
        .select("*")
        .eq("name", "BSK Fortune Wheel")
        .eq("is_active", true)
        .limit(1);

      if (!wheels || wheels.length === 0) {
        console.log("BSK Fortune Wheel not found");
        toast({
          title: "Wheel Unavailable",
          description: "The BSK Fortune Wheel is currently unavailable",
          variant: "destructive"
        });
        return;
      }

      const activeWheel = wheels[0];
      setWheel(activeWheel);

      // Load segments (should be exactly 4)
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

    // Add some delay for dramatic effect
    await new Promise(resolve => setTimeout(resolve, 500));

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

        // Force bonus balance update
        setBonusBalanceKey(prev => prev + 1);

        // Show appropriate toast
        const isWin = data.reward?.value > 0;
        toast({
          title: isWin ? "🎉 Congratulations!" : "😢 Better luck next time!",
          description: `${data.label}: ${data.reward?.value > 0 ? '+' : ''}${data.reward?.value} BSK`,
          variant: isWin ? "default" : "destructive"
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const groupRunsByDate = (runs: SpinRun[]) => {
    const groups: { [key: string]: SpinRun[] } = {};
    runs.forEach(run => {
      const date = new Date(run.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(run);
    });
    return groups;
  };

  if (!wheel) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,136,0.1)_0%,transparent_50%)] animate-pulse" />
        
        <div className="container mx-auto px-4 py-6 max-w-4xl relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/app/programs")}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                BSK Fortune Wheel
              </h1>
              <p className="text-muted-foreground">Loading wheel data...</p>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const groupedRuns = groupRunsByDate(recentRuns);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5" />
      <div className="absolute inset-0">
        <div className="h-full w-full bg-[linear-gradient(90deg,transparent_79px,rgba(0,255,136,0.03)_81px,rgba(0,255,136,0.03)_82px,transparent_84px)] bg-[length:84px_84px]" />
        <div className="h-full w-full bg-[linear-gradient(0deg,transparent_79px,rgba(255,0,102,0.03)_81px,rgba(255,0,102,0.03)_82px,transparent_84px)] bg-[length:84px_84px]" />
      </div>
      
      <div className="container mx-auto px-4 py-6 max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/programs")}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              BSK Fortune Wheel
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Spin to win or lose BSK Coins
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate("/app/programs/spin/history")}
            className="hidden md:flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            View History
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Spin Wheel */}
          <div className="lg:col-span-2 space-y-8">
            <FuturisticSpinWheel
              segments={segments}
              onSpin={handleSpin}
              isSpinning={isSpinning}
              winningSegment={winningResult}
              disabled={false}
              freeSpinsLeft={freeSpinsLeft}
              cooldownRemaining={cooldownRemaining}
            />
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            {/* Bonus Balance Card */}
            <BonusBalanceCard key={bonusBalanceKey} className="animate-fade-in" />

            {/* Segment Details */}
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Prize Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {segments.map((segment) => (
                    <div 
                      key={segment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: segment.color || (segment.label.includes('WIN') ? '#00ff88' : '#ff0066') }}
                        />
                        <div>
                          <div className="font-medium">{segment.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {segment.reward_value > 0 ? '+' : ''}{segment.reward_value} BSK
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        25%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Spins */}
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Spins</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/app/programs/spin/history")}
                  className="md:hidden"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {recentRuns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">🎰</div>
                    <p>No spins yet.</p>
                    <p className="text-sm">Try your luck!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(groupedRuns).slice(0, 3).map(([date, runs]) => (
                      <div key={date}>
                        <div className="text-xs font-medium text-muted-foreground mb-2">{date}</div>
                        {runs.slice(0, 3).map((run) => {
                          const isWin = run.outcome?.reward_value > 0;
                          return (
                            <div key={run.id} className="flex justify-between items-center p-2 rounded border border-border/30">
                              <div>
                                <div className="font-medium text-sm">{run.outcome?.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(run.created_at).toLocaleTimeString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-medium ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                                  {run.outcome?.reward_value > 0 ? '+' : ''}{run.outcome?.reward_value} BSK
                                </div>
                                <Badge variant={isWin ? "secondary" : "destructive"} className="text-xs">
                                  {isWin ? 'WIN' : 'LOSE'}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}