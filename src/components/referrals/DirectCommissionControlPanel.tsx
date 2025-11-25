import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Info, Save } from 'lucide-react';

export function DirectCommissionControlPanel() {
  const [directCommissionPercent, setDirectCommissionPercent] = useState(10);
  const [level1Reward, setLevel1Reward] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Get subscription commission rate
      const { data: settings } = await supabase
        .from('team_referral_settings')
        .select('direct_commission_percent')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settings) {
        setDirectCommissionPercent(settings.direct_commission_percent);
      }

      // Get L1 level reward
      const { data: levelData } = await supabase
        .from('team_income_levels')
        .select('bsk_reward')
        .eq('level', 1)
        .maybeSingle();

      if (levelData) {
        setLevel1Reward(levelData.bsk_reward);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionRate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_referral_settings')
        .update({ direct_commission_percent: directCommissionPercent })
        .eq('id', (await supabase.from('team_referral_settings').select('id').single()).data?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription commission rate updated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update commission rate",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Level 1 (Direct) Commission Settings
        </CardTitle>
        <CardDescription>
          Direct sponsors receive TWO separate rewards for each badge purchase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Subscription Bonus */}
          <div className="p-4 border rounded-lg space-y-3">
            <div>
              <Label className="text-base font-semibold">1. Subscription Bonus (Variable)</Label>
              <p className="text-sm text-muted-foreground">
                Percentage of badge purchase amount → Withdrawable Balance
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={directCommissionPercent}
                  onChange={(e) => setDirectCommissionPercent(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <Button onClick={updateSubscriptionRate} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <Alert>
              <AlertDescription className="text-xs">
                Currently: {directCommissionPercent}% of purchase → Withdrawable
                <br />
                Example: VIP purchase (5,000 BSK) → Sponsor earns {(5000 * directCommissionPercent / 100).toFixed(0)} BSK
              </AlertDescription>
            </Alert>
          </div>

          {/* Level Reward */}
          <div className="p-4 border rounded-lg space-y-3">
            <div>
              <Label className="text-base font-semibold">2. Level 1 Reward (Fixed)</Label>
              <p className="text-sm text-muted-foreground">
                Fixed BSK amount → Holding Balance
              </p>
            </div>
            <div>
              <Label>BSK Amount</Label>
              <Input
                type="number"
                value={level1Reward}
                disabled
                className="mt-1 bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Edit this in the "50 Level Rewards" tab above
              </p>
            </div>
            <Alert>
              <AlertDescription className="text-xs">
                Fixed: {level1Reward} BSK → Holding Balance
                <br />
                This reward is paid regardless of purchase amount
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Total Example */}
        <Alert className="bg-primary/5 border-primary">
          <AlertDescription>
            <div className="font-semibold mb-2">Complete Example: VIP Purchase (5,000 BSK)</div>
            <div className="space-y-1 text-sm">
              <div>✅ Subscription Bonus: {(5000 * directCommissionPercent / 100).toFixed(0)} BSK → Withdrawable</div>
              <div>✅ Level 1 Reward: {level1Reward} BSK → Holding</div>
              <div className="font-semibold text-primary pt-2 border-t">
                Total L1 Sponsor Earnings: {(5000 * directCommissionPercent / 100 + level1Reward).toFixed(0)} BSK
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Subscription Bonus is configurable here (percentage-based)</p>
          <p>• Level Reward is configured in team_income_levels table</p>
          <p>• Both rewards are paid automatically when a badge is purchased</p>
          <p>• L2-L50 sponsors receive only level rewards (no subscription bonus)</p>
        </div>
      </CardContent>
    </Card>
  );
}
