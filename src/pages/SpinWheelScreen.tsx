import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Zap, Clock, Coins, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useWeb3 } from "@/contexts/Web3Context";
import { hasLocalSecurity } from "@/utils/localSecurityStorage";
import { FuturisticSpinWheel } from "@/components/gamification/FuturisticSpinWheel";
import BonusBalanceCard from "@/components/BonusBalanceCard";
import { cn } from "@/lib/utils";

interface SpinSettings {
  id: string;
  free_spins_default: number;
  fee_bp_after_free: number;
  min_bet_usdt: number;
  max_bet_usdt: number;
  segments: SpinSegment[];
  is_enabled: boolean;
  cooldown_seconds: number;
}

interface SpinSegment {
  id: string;
  label: string;
  weight: number;
  reward_value: number;
  reward_token: string;
  reward_type: string;
  color?: string;
}

interface SpinResult {
  id: string;
  outcome: any;
  bsk_delta: number;
  fee_bsk: number;
  created_at: string;
  is_free_spin: boolean;
  segment_label: string;
}

type SpinState = 'idle' | 'requesting' | 'spinning' | 'result' | 'error';

export default function SpinWheelScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session } = useAuthUser();
  const { wallet, isConnected } = useWeb3();
  
  // State management
  const [settings, setSettings] = useState<SpinSettings | null>(null);
  const [segments, setSegments] = useState<SpinSegment[]>([]);
  const [recentResults, setRecentResults] = useState<SpinResult[]>([]);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [spinState, setSpinState] = useState<SpinState>('idle');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [nextAllowedAt, setNextAllowedAt] = useState<Date | null>(null);
  const [winningResult, setWinningResult] = useState<any>(null);
  const [bonusBalanceKey, setBonusBalanceKey] = useState(0);
  const [error, setError] = useState<{code: string, message: string, hint?: string} | null>(null);
  
  // Refs for debouncing and request locking
  const spinLockRef = useRef(false);
  const lastSpinAttempt = useRef(0);

  useEffect(() => {
    loadSpinData();
    
    // Set up realtime subscription for spin_results
    const channel = supabase
      .channel('spin-results-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'spin_results'
        },
        (payload) => {
          console.log('New spin result:', payload);
          loadSpinData(); // Refresh data when new results are added
          setBonusBalanceKey(prev => prev + 1); // Force bonus balance update
        }
      )
      .subscribe();
    
    // Server-authoritative cooldown timer
    const interval = setInterval(() => {
      const now = Date.now();
      if (nextAllowedAt) {
        const remaining = Math.max(0, Math.ceil((nextAllowedAt.getTime() - now) / 1000));
        setCooldownRemaining(remaining);
        if (remaining === 0) {
          setNextAllowedAt(null);
        }
      } else {
        setCooldownRemaining(0);
      }
    }, 1000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [nextAllowedAt]);

  const loadSpinData = async () => {
    try {
      console.log("🎰 Loading spin data...");
      setError(null);
      
      // Load spin settings from the new table
      const { data: settingsData, error: settingsError } = await supabase
        .from("spin_settings")
        .select("*")
        .eq("is_enabled", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      console.log("🎰 Settings query result:", { settingsData, settingsError });

      if (settingsError || !settingsData) {
        console.error("Error loading spin settings:", settingsError);
        setError({
          code: "SETTINGS_MISSING",
          message: "Spin wheel is unavailable",
          hint: "The spin system is not configured"
        });
        return;
      }

      const segmentsArray = Array.isArray(settingsData.segments) 
        ? (settingsData.segments as any[]).map((seg: any, index: number) => ({
            id: `segment-${index}`,
            label: seg.label || `Segment ${index + 1}`,
            weight: seg.weight || 25,
            reward_value: seg.reward_value || 0,
            reward_token: seg.reward_token || 'BSK',
            reward_type: seg.reward_type || 'token',
            color: seg.color || (seg.reward_value > 0 ? '#00ff88' : '#ff0066')
          } as SpinSegment))
        : [];

      const processedSettings: SpinSettings = {
        ...settingsData,
        segments: segmentsArray
      };
      setSettings(processedSettings);
      setSegments(segmentsArray);
      console.log("🎰 Loaded settings:", {
        free_spins: settingsData.free_spins_default,
        cooldown: settingsData.cooldown_seconds,
        segments: segmentsArray.length
      });

      // Load user's recent spin results to calculate stats
      if (user?.id) {
        const today = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
        const { data: resultsData } = await supabase
          .from("spin_results")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", today)
          .order("created_at", { ascending: false })
          .limit(10);

        if (resultsData) {
          setRecentResults(resultsData);
          
          const spinsToday = resultsData.length;
          setFreeSpinsLeft(Math.max(0, settingsData.free_spins_default - spinsToday));

          // Server-authoritative cooldown check
          if (resultsData.length > 0 && settingsData.cooldown_seconds > 0) {
            const lastSpin = new Date(resultsData[0].created_at);
            const nextAllowed = new Date(lastSpin.getTime() + (settingsData.cooldown_seconds * 1000));
            const now = Date.now();
            
            if (nextAllowed.getTime() > now) {
              setNextAllowedAt(nextAllowed);
              setCooldownRemaining(Math.ceil((nextAllowed.getTime() - now) / 1000));
            }
          }
          
          console.log("🎰 User stats:", {
            spinsToday,
            freeSpinsLeft: Math.max(0, settingsData.free_spins_default - spinsToday),
            lastSpinAt: resultsData[0]?.created_at
          });
        }
      }
    } catch (error) {
      console.error("Error loading spin data:", error);
      setError({
        code: "LOAD_ERROR",
        message: "Failed to load spin data",
        hint: "Please refresh the page"
      });
    }
  };

  const handleSpin = async () => {
    // Debounce rapid taps
    const now = Date.now();
    if (now - lastSpinAttempt.current < 300) {
      console.log("🎯 Spin debounced - too rapid");
      return;
    }
    lastSpinAttempt.current = now;

    // Check if another spin is in progress
    if (spinLockRef.current) {
      console.log("🎯 Spin blocked - already in progress");
      return;
    }

    // Check prerequisites
    const isAuthenticated = !!(user && session) || isConnected || hasLocalSecurity();
    
    console.log("🎯 Spin button clicked!", { 
      settings: !!settings, 
      spinState, 
      cooldownRemaining, 
      session: !!session,
      isConnected,
      hasLocalSec: hasLocalSecurity(),
      isAuthenticated,
      segments: segments.length 
    });
    
    if (!settings || !isAuthenticated || segments.length === 0) {
      console.log("🎯 Spin blocked:", { 
        noSettings: !settings, 
        spinState, 
        cooldownRemaining, 
        noAuth: !isAuthenticated,
        noSegments: segments.length === 0
      });
      return;
    }

    if (cooldownRemaining > 0) {
      toast({
        title: "Cooldown Active",
        description: `Please wait ${formatCooldown(cooldownRemaining)} before spinning again`,
        variant: "destructive"
      });
      return;
    }

    console.log("🎯 Starting spin...");
    spinLockRef.current = true;
    setSpinState('requesting');
    setWinningResult(null);
    setError(null);

    // Start optimistic animation immediately
    setTimeout(() => {
      if (spinState === 'requesting') {
        setSpinState('spinning');
      }
    }, 150);

    try {
      console.log("🎯 Calling spin-execute function...");
      
      // Prepare authentication headers and body based on auth method
      let headers: Record<string, string> = {};
      let body: Record<string, any> = { bet_usdt: settings.min_bet_usdt };
      
      if (session?.access_token) {
        // Supabase authentication
        headers.Authorization = `Bearer ${session.access_token}`;
      } else if (isConnected && wallet?.address) {
        // Web3 authentication
        headers['X-Wallet-Address'] = wallet.address;
        body.wallet_address = wallet.address;
      } else if (hasLocalSecurity()) {
        // Local security authentication
        headers['X-Local-Auth'] = 'true';
        body.local_auth = true;
      }

      // Race between API call and timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout - please try again")), 10000);
      });

      const apiCall = supabase.functions.invoke("spin-execute", {
        body,
        headers
      });

      const { data, error } = await Promise.race([apiCall, timeoutPromise]) as any;

      console.log("🎯 Spin execute response:", { data, error });

      if (error) throw error;

      if (data?.success) {
        console.log("🎯 Spin successful:", data);
        
        setSpinState('result');
        
        // Update winning result with new format
        setWinningResult({
          segment_id: data.outcome?.id || null,
          label: data.outcome?.label || data.segment?.label || 'Unknown',
          reward: {
            type: data.outcome?.reward_type || 'token',
            value: data.delta_bsk || data.bsk_delta || 0,
            token: data.outcome?.reward_token || 'BSK'
          },
          free_spins_remaining: data.free_spins_remaining || data.free_spins_left || 0
        });

        setFreeSpinsLeft(data.free_spins_remaining || data.free_spins_left || 0);
        
        // Server-authoritative cooldown
        if (data.next_allowed_at) {
          const nextAllowed = new Date(data.next_allowed_at);
          setNextAllowedAt(nextAllowed);
          const remaining = Math.max(0, Math.ceil((nextAllowed.getTime() - Date.now()) / 1000));
          setCooldownRemaining(remaining);
        } else if (data.cooldown_seconds > 0) {
          const nextAllowed = new Date(Date.now() + (data.cooldown_seconds * 1000));
          setNextAllowedAt(nextAllowed);
          setCooldownRemaining(data.cooldown_seconds);
        }

        // Force bonus balance update
        setBonusBalanceKey(prev => prev + 1);

        // Show appropriate toast
        const delta = data.delta_bsk || data.bsk_delta || 0;
        const isWin = delta > 0;
        toast({
          title: isWin ? "🎉 Winner!" : "😔 Better luck next time!",
          description: `${data.outcome?.label || data.segment?.label}: ${delta > 0 ? '+' : ''}${delta} BSK${data.is_free_spin ? ' (Free Spin)' : ''}`,
          variant: isWin ? "default" : "destructive"
        });

        // Reset to idle after showing result
        setTimeout(() => {
          setSpinState('idle');
        }, 2000);
        
      } else {
        throw new Error(data?.error || data?.message || "Spin failed");
      }
    } catch (error: any) {
      console.error("Spin error:", error);
      setSpinState('error');
      
      // Parse structured error response
      const errorData = error.message ? error : { message: error.toString() };
      
      setError({
        code: errorData.code || "SPIN_ERROR",
        message: errorData.message || "Spin failed",
        hint: errorData.hint || "Please try again"
      });

      toast({
        title: "Spin Failed",
        description: errorData.message || "Failed to execute spin",
        variant: "destructive"
      });

      // Reset to idle after error
      setTimeout(() => {
        setSpinState('idle');
        setError(null);
      }, 3000);
    } finally {
      spinLockRef.current = false;
    }
  };

  const formatCooldown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  // Check if user is authenticated via any method
  const isAuthenticated = !!(user && session) || isConnected || hasLocalSecurity();
  const canSpin = spinState === 'idle' && cooldownRemaining === 0 && !!settings && isAuthenticated && segments.length > 0 && !error;

  console.log("🔍 Spin button state:", {
    spinState,
    cooldownRemaining,
    hasSettings: !!settings,
    hasSession: !!session,
    isConnected,
    hasLocalSec: hasLocalSecurity(),
    isAuthenticated,
    segmentsCount: segments.length,
    canSpin,
    error: error?.code
  });

  if (!settings && !error) {
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
          {settings && (
            <p className="text-xs text-slate-500 mt-1">
              Cooldown: {settings.cooldown_seconds}s • Free spins: {settings.free_spins_default}/day
            </p>
          )}
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="px-4 pb-24">
        {/* Error Display */}
        {error && (
          <div className="mt-4 mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{error.message}</span>
            </div>
            {error.hint && (
              <p className="text-sm text-red-300">{error.hint}</p>
            )}
            <p className="text-xs text-red-400 mt-1">Code: {error.code}</p>
          </div>
        )}

        {/* Wheel Section */}
        {!error && (
          <div className="mt-8 mb-8">
            <FuturisticSpinWheel
              segments={segments}
              onSpin={handleSpin}
              isSpinning={spinState === 'spinning'}
              winningSegment={winningResult}
              disabled={!canSpin}
              freeSpinsLeft={freeSpinsLeft}
              cooldownRemaining={cooldownRemaining}
            />
          </div>
        )}

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
              <div className="text-lg font-bold text-purple-400">
                {settings ? `±${Math.abs(settings.segments[0]?.reward_value || 5)}` : '±5'}
              </div>
              <div className="text-xs text-purple-300">BSK Reward</div>
            </CardContent>
          </Card>
        </div>

        {/* Spin Button */}
        {!error && (
          <div className="mb-6">
            <Button
              size="lg"
              onClick={handleSpin}
              disabled={!canSpin}
              className={cn(
                "w-full h-14 text-lg font-bold rounded-full relative overflow-hidden transition-all duration-200",
                "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600",
                "hover:from-purple-500 hover:via-pink-500 hover:to-purple-500",
                "disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed",
                "shadow-lg shadow-purple-500/25",
                canSpin && spinState === 'idle' && "animate-pulse hover:scale-105",
                spinState === 'requesting' && "opacity-75",
                spinState === 'spinning' && "animate-bounce"
              )}
            >
              {spinState === 'requesting' ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>REQUESTING...</span>
                </div>
              ) : spinState === 'spinning' ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>SPINNING...</span>
                </div>
              ) : spinState === 'result' ? (
                <div className="flex items-center gap-2">
                  <span>🎉</span>
                  <span>RESULT!</span>
                  <span>🎉</span>
                </div>
              ) : spinState === 'error' ? (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>TRY AGAIN</span>
                </div>
              ) : cooldownRemaining > 0 ? (
                <span>WAIT {formatCooldown(cooldownRemaining)}</span>
              ) : !canSpin && !settings ? (
                <span>LOADING...</span>
              ) : !canSpin && !isAuthenticated ? (
                <span>CONNECT WALLET</span>
              ) : !canSpin && segments.length === 0 ? (
                <span>NO SEGMENTS</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span>⭐</span>
                  <span>SPIN TO WIN</span>
                  <span>⭐</span>
                </div>
              )}
            </Button>
            
            {/* Additional info below button */}
            <div className="text-center mt-2">
              {freeSpinsLeft > 0 ? (
                <p className="text-sm text-green-400">✨ Free spin available</p>
              ) : settings && (
                <p className="text-sm text-slate-400">
                  Fee: {settings.fee_bp_after_free}% ({settings.min_bet_usdt * settings.fee_bp_after_free / 100} BSK)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bonus Balance Card */}
        <div className="mb-6">
          <BonusBalanceCard key={bonusBalanceKey} className="bg-slate-800/50 backdrop-blur-sm border-slate-700" />
        </div>
      </div>

    </div>
  );
}