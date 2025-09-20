import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Zap, Play, Settings, CheckCircle } from "lucide-react";

interface QuickSetupProps {
  onWheelCreated: () => void;
}

export const SpinWheelQuickSetup = ({ onWheelCreated }: QuickSetupProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const setupBSKFortuneWheel = async () => {
    setIsLoading(true);
    try {
      // Create the wheel
      const { data: wheel, error: wheelError } = await supabase
        .from("spin_wheels")
        .insert({
          name: "BSK Fortune Wheel",
          is_active: true,
          ticket_price: 0,
          ticket_currency: "BSK",
          free_spins_daily: 5,
          vip_multiplier: 1,
          cooldown_seconds: 300, // 5 minutes
          max_spins_per_user: 0,
          seed: crypto.randomUUID()
        })
        .select()
        .single();

      if (wheelError) throw wheelError;

      // Create the 4 segments
      const segments = [
        {
          wheel_id: wheel.id,
          label: "WIN 1×",
          weight: 25,
          reward_type: "token",
          reward_value: 5,
          reward_token: "BSK",
          max_per_day: 0,
          max_total: 0,
          is_enabled: true,
          color: "#00ff88"
        },
        {
          wheel_id: wheel.id,
          label: "LOSE 0",
          weight: 25,
          reward_type: "token",
          reward_value: -5,
          reward_token: "BSK",
          max_per_day: 0,
          max_total: 0,
          is_enabled: true,
          color: "#ff0066"
        },
        {
          wheel_id: wheel.id,
          label: "WIN 1×",
          weight: 25,
          reward_type: "token",
          reward_value: 5,
          reward_token: "BSK",
          max_per_day: 0,
          max_total: 0,
          is_enabled: true,
          color: "#00ff88"
        },
        {
          wheel_id: wheel.id,
          label: "LOSE 0",
          weight: 25,
          reward_type: "token",
          reward_value: -5,
          reward_token: "BSK",
          max_per_day: 0,
          max_total: 0,
          is_enabled: true,
          color: "#ff0066"
        }
      ];

      const { error: segmentsError } = await supabase
        .from("spin_segments")
        .insert(segments);

      if (segmentsError) throw segmentsError;

      toast({
        title: "Success! 🎉",
        description: "BSK Fortune Wheel created with 4 segments (2 WIN, 2 LOSE)",
      });

      setIsDialogOpen(false);
      onWheelCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600">
          <Zap className="h-4 w-4 mr-2" />
          Quick Setup: BSK Fortune Wheel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Setup: BSK Fortune Wheel
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
            <CardHeader>
              <CardTitle className="text-lg">Configuration Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-600 mb-2">🎡 Wheel Settings</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Name:</strong> BSK Fortune Wheel</li>
                    <li>• <strong>Free Spins:</strong> 5 per day</li>
                    <li>• <strong>Cooldown:</strong> 5 minutes</li>
                    <li>• <strong>Cost:</strong> Free</li>
                    <li>• <strong>Status:</strong> Active</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-600 mb-2">🎯 4 Segments</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">WIN 1× (+5 BSK) - 25%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">LOSE 0 (-5 BSK) - 25%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">WIN 1× (+5 BSK) - 25%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">LOSE 0 (-5 BSK) - 25%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-200">Perfect for BSK Rewards</div>
                    <div className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                      This setup creates a balanced wheel where users can win or lose BSK tokens. 
                      Equal probability (50% win, 50% lose) with ±5 BSK rewards.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={setupBSKFortuneWheel} disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Create Wheel & Segments
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};