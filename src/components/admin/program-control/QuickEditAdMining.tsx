import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, DollarSign, Timer, Gift } from "lucide-react";
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
  const [completionBonusEnabled, setCompletionBonusEnabled] = useState(currentConfig?.completionBonusEnabled ?? true);
  const [completionBonusPercent, setCompletionBonusPercent] = useState(currentConfig?.completionBonusPercent || 5);
  const [completionBonusDestination, setCompletionBonusDestination] = useState<'holding' | 'withdrawable'>(
    currentConfig?.completionBonusDestination || 'withdrawable'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setRewardPerAd(currentConfig.rewardPerAd || 10);
      setDailyLimit(currentConfig.dailyLimit || 50);
      setCompletionBonusEnabled(currentConfig.completionBonusEnabled ?? true);
      setCompletionBonusPercent(currentConfig.completionBonusPercent || 5);
      setCompletionBonusDestination(currentConfig.completionBonusDestination || 'withdrawable');
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
            completionBonusEnabled,
            completionBonusPercent,
            completionBonusDestination,
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

      <div className="border-t pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Completion Bonus
            </Label>
            <p className="text-xs text-muted-foreground">Reward users who complete full 100 days</p>
          </div>
          <Switch
            checked={completionBonusEnabled}
            onCheckedChange={setCompletionBonusEnabled}
            disabled={saving}
          />
        </div>

        {completionBonusEnabled && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Bonus Percentage</Label>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg">
                  <span className="text-sm font-bold text-primary">{completionBonusPercent}%</span>
                </div>
              </div>
              <Slider
                value={[completionBonusPercent]}
                onValueChange={([val]) => setCompletionBonusPercent(val)}
                min={0}
                max={100}
                step={5}
                className="w-full"
                disabled={saving}
                aria-label="Completion bonus percentage"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: 500 BSK tier → {Math.round(500 * completionBonusPercent / 100)} BSK bonus
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Bonus Destination</Label>
              <RadioGroup
                value={completionBonusDestination}
                onValueChange={(value) => setCompletionBonusDestination(value as 'holding' | 'withdrawable')}
                disabled={saving}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="holding" id="holding" />
                  <Label htmlFor="holding" className="text-sm font-normal cursor-pointer">
                    Holding Balance
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="withdrawable" id="withdrawable" />
                  <Label htmlFor="withdrawable" className="text-sm font-normal cursor-pointer">
                    Withdrawable Balance
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </>
        )}
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
