import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ReferralConfig {
  id: string;
  levels: number;
  l1_percent: number;
  l2_percent: number;
  l3_percent: number;
  l4_percent: number;
  l5_percent: number;
  cap_usd: number;
  vip_multiplier: number;
  updated_at: string;
}

const AdminReferrals = () => {
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadConfig = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('referrals_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setConfig(data);
      } else {
        // Create default config if none exists
        const defaultConfig = {
          levels: 3,
          l1_percent: 0.05,
          l2_percent: 0.03,
          l3_percent: 0.01,
          l4_percent: 0,
          l5_percent: 0,
          cap_usd: 0,
          vip_multiplier: 1,
        };
        
        const { data: newData, error: insertError } = await (supabase as any)
          .from('referrals_config')
          .insert(defaultConfig)
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig(newData);
      }
    } catch (error: any) {
      console.error('Error loading referral config:', error);
      toast({
        title: "Error",
        description: "Failed to load referral configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const updateData = {
        levels: config.levels,
        l1_percent: config.l1_percent,
        l2_percent: config.l2_percent,
        l3_percent: config.l3_percent,
        l4_percent: config.l4_percent,
        l5_percent: config.l5_percent,
        cap_usd: config.cap_usd,
        vip_multiplier: config.vip_multiplier,
        updated_at: new Date().toISOString(),
      };

      await (supabase as any)
        .from('referrals_config')
        .update(updateData)
        .eq('id', config.id);

      await (supabase as any)
        .from('admin_audit')
        .insert({
          actor: 'admin',
          action: 'referrals_config_updated',
          entity: 'referrals_config',
          entity_id: config.id,
          after: updateData,
        });

      toast({
        title: "Success",
        description: "Referral configuration updated successfully",
      });

      loadConfig();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof ReferralConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const getLevelPercentage = (level: number): number => {
    if (!config) return 0;
    switch (level) {
      case 1: return config.l1_percent;
      case 2: return config.l2_percent;
      case 3: return config.l3_percent;
      case 4: return config.l4_percent;
      case 5: return config.l5_percent;
      default: return 0;
    }
  };

  const setLevelPercentage = (level: number, value: number) => {
    if (!config) return;
    const field = `l${level}_percent` as keyof ReferralConfig;
    updateConfig(field, value);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading referral configuration...</div>;
  }

  if (!config) {
    return <div className="flex items-center justify-center h-64">No configuration found</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Referral Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium block mb-2">Number of Referral Levels</label>
            <Select
              value={config.levels.toString()}
              onValueChange={(value) => updateConfig('levels', parseInt(value))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} Level{num > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Commission Percentages</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: config.levels }, (_, i) => i + 1).map((level) => (
                <div key={level}>
                  <label className="text-sm font-medium block mb-2">
                    Level {level} Commission (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={getLevelPercentage(level)}
                    onChange={(e) => setLevelPercentage(level, parseFloat(e.target.value) || 0)}
                    placeholder="0.05"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(getLevelPercentage(level) * 100).toFixed(2)}% commission
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium block mb-2">
                Earning Cap (USD)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={config.cap_usd}
                onChange={(e) => updateConfig('cap_usd', parseFloat(e.target.value) || 0)}
                placeholder="0 (no cap)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {config.cap_usd > 0 
                  ? `Maximum ${config.cap_usd} USD per referral`
                  : 'No earning cap'
                }
              </p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                VIP Multiplier
              </label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={config.vip_multiplier}
                onChange={(e) => updateConfig('vip_multiplier', parseFloat(e.target.value) || 1)}
                placeholder="1.0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {config.vip_multiplier}x multiplier for VIP users
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Configuration Preview</h3>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm"><strong>Levels:</strong> {config.levels}</p>
              <p className="text-sm">
                <strong>Commissions:</strong> {
                  Array.from({ length: config.levels }, (_, i) => i + 1)
                    .map(level => `L${level}: ${(getLevelPercentage(level) * 100).toFixed(2)}%`)
                    .join(', ')
                }
              </p>
              <p className="text-sm">
                <strong>Cap:</strong> {config.cap_usd > 0 ? `$${config.cap_usd} USD` : 'No cap'}
              </p>
              <p className="text-sm">
                <strong>VIP Multiplier:</strong> {config.vip_multiplier}x
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button
              variant="outline"
              onClick={loadConfig}
              disabled={saving}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferrals;