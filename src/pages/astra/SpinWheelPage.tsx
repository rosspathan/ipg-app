import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProgramConfig } from "@/hooks/useProgramConfig";
import { Sparkles, TrendingUp, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { toast } from "sonner";

export default function SpinWheelPage() {
  const { user } = useAuthUser();
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Fetch program configuration
  const { data: programConfig } = useProgramConfig("spin-wheel");
  const config = programConfig as any || {};

  const spinCost = config?.pricing?.costPerSpin || 10;
  const freeSpinsPerDay = config?.pricing?.freeSpinsPerDay || 1;

  // Fetch spin segments (from ismart_spin_segments, not spin_segments)
  const { data: segments } = useQuery({
    queryKey: ["spin-segments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ismart_spin_segments")
        .select("*")
        .eq("is_active", true)
        .order("position_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's BSK balance
  const { data: bskBalance } = useQuery({
    queryKey: ["user-bsk-balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.withdrawable_balance || 0;
    },
    enabled: !!user?.id,
  });

  const handleSpin = async () => {
    if (!user || !segments || segments.length === 0) {
      toast.error("Unable to spin right now");
      return;
    }

    if (bskBalance < spinCost) {
      toast.error(`Insufficient BSK balance. Need ${spinCost} BSK to spin.`);
      return;
    }

    setIsSpinning(true);

    try {
      // Simulate spin animation
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // In production, this would call an edge function to execute provably fair spin
      // For now, simulate result
      const randomSegment = segments[Math.floor(Math.random() * segments.length)];
      setLastResult(randomSegment);

      toast.success(`You won ${randomSegment.multiplier}x! (+${spinCost * randomSegment.multiplier} BSK)`);
    } catch (error) {
      toast.error("Failed to spin");
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      <BacklinkBar programName="Spin Wheel" />

      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground mb-4">
          Spin the wheel to multiply your BSK! Each spin costs {spinCost} BSK.
        </p>

        {/* BSK Balance */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Your BSK Balance</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{bskBalance || 0} BSK</p>
            </div>
          </CardContent>
        </Card>

        {/* Spin Wheel Visual */}
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader>
            <CardTitle className="text-lg text-center flex items-center justify-center gap-2">
              <RotateCw className="w-5 h-5 text-warning" />
              Spin Wheel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wheel placeholder */}
            <div className="relative aspect-square max-w-sm mx-auto bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full flex items-center justify-center border-4 border-primary/30">
              <div
                className={`w-4 h-4 bg-warning rounded-full ${
                  isSpinning ? "animate-spin" : ""
                }`}
              />
              {lastResult && !isSpinning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-background/90 p-4 rounded-xl">
                    <p className="text-3xl font-bold text-warning">
                      {lastResult.multiplier}x
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Spin Button */}
            <Button
              onClick={handleSpin}
              disabled={isSpinning || !user || (bskBalance || 0) < spinCost}
              className="w-full gap-2 bg-gradient-to-r from-warning to-warning/80"
              size="lg"
            >
              {isSpinning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Spinning...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Spin ({spinCost} BSK)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Possible Prizes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Possible Prizes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {segments?.map((segment: any) => (
                <div
                  key={segment.id}
                  className="p-3 bg-muted/30 rounded-lg text-center"
                >
                  <p className="text-2xl font-bold text-foreground">
                    {segment.multiplier}x
                  </p>
                  <p className="text-xs text-muted-foreground">{segment.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
