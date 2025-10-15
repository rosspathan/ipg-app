import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Save, DollarSign, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuickEditAdMiningProps {
  moduleKey: string;
  currentConfig?: any;
}

export function QuickEditAdMining({ moduleKey, currentConfig }: QuickEditAdMiningProps) {
  const { toast } = useToast();
  const [rewardPerAd, setRewardPerAd] = useState(currentConfig?.rewardPerAd || 10);
  const [dailyLimit, setDailyLimit] = useState(currentConfig?.dailyLimit || 50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setRewardPerAd(currentConfig.rewardPerAd || 10);
      setDailyLimit(currentConfig.dailyLimit || 50);
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
            rewardPerAd,
            dailyLimit
          },
          status: 'published',
          is_current: true
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Ad Mining configuration updated successfully"
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
          <Label className="text-xs">Reward Per Ad (BSK)</Label>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-success" />
            <span className="text-sm font-semibold">{rewardPerAd}</span>
          </div>
        </div>
        <Slider
          value={[rewardPerAd]}
          onValueChange={([val]) => setRewardPerAd(val)}
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
          <Label className="text-xs">Daily Limit (ads/user)</Label>
          <div className="flex items-center gap-1">
            <Timer className="w-3 h-3 text-primary" />
            <span className="text-sm font-semibold">{dailyLimit}</span>
          </div>
        </div>
        <Slider
          value={[dailyLimit]}
          onValueChange={([val]) => setDailyLimit(val)}
          min={10}
          max={200}
          step={10}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10 ads</span>
          <span>200 ads</span>
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
