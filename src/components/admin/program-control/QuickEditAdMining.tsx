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
    
    // Show optimistic update
    toast({
      title: "Saving...",
      description: "Updating configuration"
    });
    
    try {
      // Get module ID from key
      const { data: module, error: moduleError } = await supabase
        .from('program_modules')
        .select('id')
        .eq('key', moduleKey)
        .maybeSingle();

      if (moduleError) throw moduleError;
      if (!module) {
        throw new Error('Program module not found');
      }

      // Upsert config (update if exists, insert if not)
      const { error } = await supabase
        .from('program_configs')
        .upsert({
          module_id: module.id,
          config_json: {
            ...currentConfig,
            rewardPerAd,
            dailyLimit,
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
        description: "Ad Mining configuration updated"
      });
    } catch (error) {
      console.error('Failed to save Ad Mining config:', error);
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
          <Label className="text-sm font-medium">Reward Per Ad (BSK)</Label>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 rounded-lg">
            <DollarSign className="w-3.5 h-3.5 text-success" />
            <span className="text-sm font-bold text-success">{rewardPerAd}</span>
          </div>
        </div>
        <Slider
          value={[rewardPerAd]}
          onValueChange={([val]) => setRewardPerAd(val)}
          min={1}
          max={100}
          step={1}
          className="w-full"
          disabled={saving}
          aria-label="Reward per ad"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 BSK</span>
          <span>100 BSK</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Daily Limit (ads/user)</Label>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg">
            <Timer className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-bold text-primary">{dailyLimit}</span>
          </div>
        </div>
        <Slider
          value={[dailyLimit]}
          onValueChange={([val]) => setDailyLimit(val)}
          min={10}
          max={200}
          step={10}
          className="w-full"
          disabled={saving}
          aria-label="Daily limit per user"
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
        className="w-full min-h-[44px] mt-2"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
