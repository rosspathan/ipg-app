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
    
    toast({
      title: "Saving...",
      description: "Updating configuration"
    });
    
    try {
      const { data: module, error: moduleError } = await supabase
        .from('program_modules')
        .select('id')
        .eq('key', moduleKey)
        .maybeSingle();

      if (moduleError) throw moduleError;
      if (!module) {
        throw new Error('Program module not found');
      }

      const { error } = await supabase
        .from('program_configs')
        .upsert({
          module_id: module.id,
          config_json: {
            ...currentConfig,
            minBet,
            maxBet,
            freeSpinsPerDay,
            updatedAt: new Date().toISOString()
          },
          status: 'published',
          is_current: true
        }, {
          onConflict: 'module_id,is_current'
        });

      if (error) throw error;

      toast({
        title: "✓ Settings saved",
        description: "Spin Wheel configuration updated"
      });
    } catch (error) {
      console.error('Failed to save Spin Wheel config:', error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Minimum Bet (BSK)</Label>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-bold text-primary">{minBet}</span>
          </div>
        </div>
        <Slider
          value={[minBet]}
          onValueChange={([val]) => setMinBet(val)}
          min={1}
          max={100}
          step={1}
          className="w-full"
          disabled={saving}
          aria-label="Minimum bet"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 BSK</span>
          <span>100 BSK</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Maximum Bet (BSK)</Label>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 rounded-lg">
            <DollarSign className="w-3.5 h-3.5 text-success" />
            <span className="text-sm font-bold text-success">{maxBet}</span>
          </div>
        </div>
        <Slider
          value={[maxBet]}
          onValueChange={([val]) => setMaxBet(val)}
          min={100}
          max={10000}
          step={100}
          className="w-full"
          disabled={saving}
          aria-label="Maximum bet"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>100 BSK</span>
          <span>10,000 BSK</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Free Spins Per Day</Label>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 rounded-lg">
            <Coins className="w-3.5 h-3.5 text-warning" />
            <span className="text-sm font-bold text-warning">{freeSpinsPerDay}</span>
          </div>
        </div>
        <Slider
          value={[freeSpinsPerDay]}
          onValueChange={([val]) => setFreeSpinsPerDay(val)}
          min={0}
          max={10}
          step={1}
          className="w-full"
          disabled={saving}
          aria-label="Free spins per day"
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
        className="w-full min-h-[44px] mt-2"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
