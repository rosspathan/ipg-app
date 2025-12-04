import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Save, DollarSign, Timer, Gift, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuickEditAdMiningProps {
  moduleKey: string;
  currentConfig?: any;
}

export function QuickEditAdMining({ moduleKey, currentConfig }: QuickEditAdMiningProps) {
  const { toast } = useToast();
  const [rewardPerAd, setRewardPerAd] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [completionBonusEnabled, setCompletionBonusEnabled] = useState(true);
  const [completionBonusPercent, setCompletionBonusPercent] = useState(5);
  const [completionBonusDestination, setCompletionBonusDestination] = useState<'holding' | 'withdrawable'>('withdrawable');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Load settings from ad_mining_settings table (the actual source of truth)
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('ad_mining_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettingsId(data.id);
          setRewardPerAd(data.free_daily_reward_bsk || 10);
          setDailyLimit(data.max_free_per_day || 50);
          // Note: completion bonus settings are not in ad_mining_settings yet
          // They would need to be added as columns or stored elsewhere
        }
      } catch (error) {
        console.error('Failed to load ad mining settings:', error);
        toast({
          title: "Failed to load settings",
          description: "Using default values",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      if (!settingsId) {
        throw new Error('Settings not found');
      }

      // Save to ad_mining_settings table (the actual backend source)
      const { error } = await supabase
        .from('ad_mining_settings')
        .update({
          free_daily_reward_bsk: rewardPerAd,
          max_free_per_day: dailyLimit,
          updated_at: new Date().toISOString()
        })
        .eq('id', settingsId);

      if (error) throw error;

      // Also save completion bonus settings to program_configs for UI consistency
      const { data: module } = await supabase
        .from('program_modules')
        .select('id')
        .eq('key', moduleKey)
        .maybeSingle();

      if (module) {
        await supabase
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
      }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          min={1}
          max={200}
          step={1}
          className="w-full"
          disabled={saving}
          aria-label="Daily limit per user"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 ad</span>
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
