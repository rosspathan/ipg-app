import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ProgramConfig {
  id: string;
  name: string;
  enabled: boolean;
  params: Record<string, any>;
}

const PROGRAMS = [
  { 
    id: 'spin', 
    name: 'Spin Wheel',
    params: {
      free_spins_daily: { type: 'number', label: 'Free Spins/Day', min: 0, max: 100 },
      min_bet_bsk: { type: 'number', label: 'Min Bet (BSK)', min: 1, max: 1000 }
    }
  },
  { 
    id: 'lucky_draw', 
    name: 'Lucky Draw',
    params: {
      pool_size: { type: 'number', label: 'Pool Size', min: 10, max: 1000 },
      ticket_price_bsk: { type: 'number', label: 'Ticket Price (BSK)', min: 1, max: 100 }
    }
  },
  { 
    id: 'referrals', 
    name: 'Referral Program',
    params: {
      direct_commission_percent: { type: 'number', label: 'Direct Commission %', min: 0, max: 50 },
      max_levels: { type: 'number', label: 'Max Levels', min: 1, max: 50 }
    }
  },
  { 
    id: 'ad_mining', 
    name: 'Ad Mining',
    params: {
      reward_per_ad_bsk: { type: 'number', label: 'Reward/Ad (BSK)', min: 0.1, max: 10 },
      max_ads_daily: { type: 'number', label: 'Max Ads/Day', min: 1, max: 100 }
    }
  },
  { 
    id: 'insurance', 
    name: 'Trading Insurance',
    params: {
      coverage_percent: { type: 'number', label: 'Coverage %', min: 10, max: 100 },
      max_claim_amount: { type: 'number', label: 'Max Claim', min: 100, max: 10000 }
    }
  },
  { 
    id: 'kyc', 
    name: 'KYC Verification',
    params: {
      min_age_years: { type: 'number', label: 'Min Age', min: 13, max: 100 },
      manual_review: { type: 'boolean', label: 'Manual Review Required' }
    }
  }
];

export default function AdminProgramsControl() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<ProgramConfig[]>([]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      
      // Load from system_settings table
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', PROGRAMS.map(p => `program_${p.id}_enabled`));

      if (error) throw error;

      // Initialize with defaults
      const configs = PROGRAMS.map(prog => {
        const enabledSetting = data?.find(s => s.key === `program_${prog.id}_enabled`);
        return {
          id: prog.id,
          name: prog.name,
          enabled: enabledSetting?.value === 'true',
          params: prog.params ? Object.keys(prog.params).reduce((acc, key) => {
            acc[key] = prog.params[key].type === 'number' ? 10 : true;
            return acc;
          }, {} as Record<string, any>) : {}
        };
      });

      setPrograms(configs);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load program settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (programId: string, enabled: boolean) => {
    setPrograms(prev => prev.map(p => 
      p.id === programId ? { ...p, enabled } : p
    ));
  };

  const handleParamChange = (programId: string, paramKey: string, value: any) => {
    setPrograms(prev => prev.map(p => 
      p.id === programId 
        ? { ...p, params: { ...p.params, [paramKey]: value } }
        : p
    ));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Save each program's enabled state
      for (const prog of programs) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: `program_${prog.id}_enabled`,
            value: prog.enabled.toString(),
            description: `${prog.name} program toggle`
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      console.log('PROGRAMS_READY');
      
      toast({
        title: 'Success',
        description: 'Program settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving programs:', error);
      toast({
        title: 'Error',
        description: 'Failed to save program settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Programs Control</span>
          </button>
          <Button onClick={handleSave} disabled={saving || loading} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 pt-6 px-4">
        <p className="text-sm text-muted-foreground mb-4">
          Enable or disable programs and configure their parameters
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          programs.map(prog => (
            <Card key={prog.id} className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{prog.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {prog.enabled ? 'Active' : 'Disabled'}
                  </p>
                </div>
                <Switch
                  checked={prog.enabled}
                  onCheckedChange={(checked) => handleToggle(prog.id, checked)}
                  disabled={saving}
                />
              </div>

              {/* Parameters */}
              {Object.keys(prog.params).length > 0 && prog.enabled && (
                <div className="space-y-3 pt-4 border-t border-border/40">
                  {Object.entries(prog.params).map(([key, config]: [string, any]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`${prog.id}_${key}`}>{config.label}</Label>
                      {config.type === 'number' ? (
                        <Input
                          id={`${prog.id}_${key}`}
                          type="number"
                          value={prog.params[key]}
                          onChange={(e) => handleParamChange(prog.id, key, parseFloat(e.target.value) || 0)}
                          disabled={saving}
                          min={config.min}
                          max={config.max}
                        />
                      ) : (
                        <Switch
                          checked={prog.params[key]}
                          onCheckedChange={(checked) => handleParamChange(prog.id, key, checked)}
                          disabled={saving}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
