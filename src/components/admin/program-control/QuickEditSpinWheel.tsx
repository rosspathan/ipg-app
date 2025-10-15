import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Save, DollarSign, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuickEditSpinWheelProps {
  moduleKey: string;
  currentConfig?: any;
}

export function QuickEditSpinWheel({ moduleKey, currentConfig }: QuickEditSpinWheelProps) {
  const { toast } = useToast();
  const [minBet, setMinBet] = useState(currentConfig?.minBet || 10);
  const [maxBet, setMaxBet] = useState(currentConfig?.maxBet || 1000);
  const [freeSpinsPerDay, setFreeSpinsPerDay] = useState(currentConfig?.freeSpinsPerDay || 3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setMinBet(currentConfig.minBet || 10);
      setMaxBet(currentConfig.maxBet || 1000);
      setFreeSpinsPerDay(currentConfig.freeSpinsPerDay || 3);
    }
  }, [currentConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get module ID from key
      const { data: module } = await supabase
        .from('program_modules')
        .select('id')
        .eq('key', moduleKey)
        .maybeSingle();

      if (!module) {
        throw new Error('Program module not found');
      }

      // Create new config version
      const { error } = await supabase
        .from('program_configs')
        .insert({
          module_id: module.id,
          config_json: {
            ...currentConfig,
            minBet,
            maxBet,
            freeSpinsPerDay
          },
          status: 'published',
          is_current: true
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Spin Wheel configuration updated successfully"
      });
    } catch (error) {
      toast({
        title: "Failed to save",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Minimum Bet (BSK)</Label>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-primary" />
            <span className="text-sm font-semibold">{minBet}</span>
          </div>
        </div>
        <Slider
          value={[minBet]}
          onValueChange={([val]) => setMinBet(val)}
          min={1}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 BSK</span>
          <span>100 BSK</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Maximum Bet (BSK)</Label>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-success" />
            <span className="text-sm font-semibold">{maxBet}</span>
          </div>
        </div>
        <Slider
          value={[maxBet]}
          onValueChange={([val]) => setMaxBet(val)}
          min={100}
          max={10000}
          step={100}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>100 BSK</span>
          <span>10,000 BSK</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Free Spins Per Day</Label>
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-warning" />
            <span className="text-sm font-semibold">{freeSpinsPerDay}</span>
          </div>
        </div>
        <Slider
          value={[freeSpinsPerDay]}
          onValueChange={([val]) => setFreeSpinsPerDay(val)}
          min={0}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 spins</span>
          <span>10 spins</span>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="w-full"
      >
        <Save className="w-3.5 h-3.5 mr-1.5" />
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
