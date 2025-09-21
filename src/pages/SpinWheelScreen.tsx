import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Zap, Clock, Coins, Home, Wallet, TrendingUp, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FuturisticSpinWheel } from "@/components/gamification/FuturisticSpinWheel";
import BonusBalanceCard from "@/components/BonusBalanceCard";
import { cn } from "@/lib/utils";

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
  const { user, session } = useAuth();
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
      console.log("🎰 Loading wheel data...");
      
      // Load the BSK Fortune Wheel specifically
      const { data: wheels, error: wheelsError } = await supabase
        .from("spin_wheels")
        .select("*")
        .eq("name", "BSK Fortune Wheel")
        .eq("is_active", true)
        .limit(1);

      console.log("🎰 Wheels query result:", { wheels, wheelsError });

      if (wheelsError) {
        console.error("Error loading wheels:", wheelsError);
        toast({
          title: "Error",
          description: "Failed to load wheel data: " + wheelsError.message,
          variant: "destructive"
        });
        return;
      }

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
      console.log("🎰 Active wheel:", activeWheel);
      setWheel(activeWheel);

      // Load segments (should be exactly 4)
      const { data: segmentsData, error: segmentsError } = await supabase
        .from("spin_segments")
        .select("*")
        .eq("wheel_id", activeWheel.id)
        .eq("is_enabled", true)
        .order("weight", { ascending: false });

      console.log("🎰 Segments query result:", { segmentsData, segmentsError });

      if (segmentsError) {
        console.error("Error loading segments:", segmentsError);
        toast({
          title: "Error",
          description: "Failed to load segments: " + segmentsError.message,
          variant: "destructive"
        });
        return;
      }

      if (segmentsData) {
        setSegments(segmentsData);
        console.log("🎰 Loaded segments:", segmentsData.length);
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
    console.log("🎯 Spin button clicked!", { 
      wheel: !!wheel, 
      isSpinning, 
      cooldownRemaining, 
      session: !!session,
      segments: segments.length 
    });
    
    if (!wheel || isSpinning || cooldownRemaining > 0 || !session) {
      console.log("🎯 Spin blocked:", { 
        noWheel: !wheel, 
        isSpinning, 
        cooldownRemaining, 
        noSession: !session 
      });
      return;
    }

    console.log("🎯 Starting spin...");
    setIsSpinning(true);
    setWinningResult(null);

    // Add some delay for dramatic effect
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      console.log("🎯 Calling spin-execute function...");
      const { data, error } = await supabase.functions.invoke("spin-execute", {
        body: { wheel_id: wheel.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log("🎯 Spin execute response:", { data, error });

      if (error) throw error;

      if (data.success) {
        console.log("🎯 Spin successful:", data);
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

  const formatCooldown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const canSpin = !isSpinning && cooldownRemaining === 0 && !!wheel && !!session && segments.length > 0;

  console.log("🔍 Spin button state:", {
    isSpinning,
    cooldownRemaining,
    hasWheel: !!wheel,
    hasSession: !!session,
    segmentsCount: segments.length,
    canSpin: !isSpinning && cooldownRemaining === 0 && !!wheel && !!session && segments.length > 0
  });

  if (!wheel) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1)_0%,transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-12">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/app/programs")}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            BSK Fortune Wheel
          </h1>
          <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
            ✨ Spin to win or lose BSK Coins
          </p>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="px-4 pb-24">
        {/* Wheel Section */}
        <div className="mt-8 mb-8">
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

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Zap className="h-5 w-5 mx-auto mb-2 text-green-400" />
              <div className="text-lg font-bold text-green-400">{freeSpinsLeft}</div>
              <div className="text-xs text-green-300">Free Spins</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-blue-400" />
              <div className="text-lg font-bold text-blue-400">
                {cooldownRemaining > 0 ? formatCooldown(cooldownRemaining) : "Ready"}
              </div>
              <div className="text-xs text-blue-300">Cooldown</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Coins className="h-5 w-5 mx-auto mb-2 text-purple-400" />
              <div className="text-lg font-bold text-purple-400">±5</div>
              <div className="text-xs text-purple-300">BSK Reward</div>
            </CardContent>
          </Card>
        </div>

        {/* Spin Button */}
        <div className="mb-6">
          <Button
            size="lg"
            onClick={handleSpin}
            disabled={!canSpin}
            className={cn(
              "w-full h-14 text-lg font-bold rounded-full relative overflow-hidden",
              "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600",
              "hover:from-purple-500 hover:via-pink-500 hover:to-purple-500",
              "disabled:from-slate-600 disabled:to-slate-700",
              "shadow-lg shadow-purple-500/25",
              canSpin && !isSpinning && "animate-pulse"
            )}
          >
            {isSpinning ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>SPINNING...</span>
              </div>
            ) : cooldownRemaining > 0 ? (
              <span>WAIT {formatCooldown(cooldownRemaining)}</span>
            ) : !canSpin && !wheel ? (
              <span>LOADING WHEEL...</span>
            ) : !canSpin && !session ? (
              <span>NOT AUTHENTICATED</span>
            ) : !canSpin && segments.length === 0 ? (
              <span>LOADING SEGMENTS...</span>
            ) : (
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span>SPIN TO WIN</span>
                <span>⭐</span>
              </div>
            )}
          </Button>
        </div>

        {/* Bonus Balance Card */}
        <div className="mb-6">
          <BonusBalanceCard key={bonusBalanceKey} className="bg-slate-800/50 backdrop-blur-sm border-slate-700" />
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700">
        <div className="grid grid-cols-4 gap-1 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/home")}
            className="flex flex-col items-center gap-1 h-16 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/wallet")}
            className="flex flex-col items-center gap-1 h-16 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Wallet className="h-5 w-5" />
            <span className="text-xs">Wallet</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/markets")}
            className="flex flex-col items-center gap-1 h-16 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">Markets</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/profile")}
            className="flex flex-col items-center gap-1 h-16 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
}