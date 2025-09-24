import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Play, Settings, TestTube, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SpinSettings {
  id: string;
  free_spins_default: number;
  fee_bp_after_free: number;
  min_bet_usdt: number;
  max_bet_usdt: number;
  segments: any;
  is_enabled: boolean;
  cooldown_seconds: number;
  created_at: string;
  updated_at: string;
}

interface SpinResult {
  id: string;
  user_id: string;
  bet_amount: number;
  bsk_delta: number;
  fee_bsk: number;
  segment_label: string;
  is_free_spin: boolean;
  auth_method: string;
  created_at: string;
}

export default function AdminSpinSettingsScreen() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SpinSettings | null>(null);
  const [recentResults, setRecentResults] = useState<SpinResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSpinning, setTestSpinning] = useState(false);
  const [segmentJson, setSegmentJson] = useState('');

  useEffect(() => {
    loadSettings();
    loadRecentResults();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('spin_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setSegmentJson(JSON.stringify(data.segments, null, 2));
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast({
        title: "Error",
        description: "Failed to load spin settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentResults = async () => {
    try {
      const { data } = await supabase
        .from('spin_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setRecentResults(data);
      }
    } catch (error) {
      console.error('Failed to load recent results:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      let segments;
      try {
        segments = JSON.parse(segmentJson);
      } catch {
        throw new Error('Invalid JSON in segments configuration');
      }

      const { error } = await supabase
        .from('spin_settings')
        .update({
          free_spins_default: settings.free_spins_default,
          fee_bp_after_free: settings.fee_bp_after_free,
          min_bet_usdt: settings.min_bet_usdt,
          max_bet_usdt: settings.max_bet_usdt,
          segments: segments,
          is_enabled: settings.is_enabled,
          cooldown_seconds: settings.cooldown_seconds,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Spin settings updated successfully"
      });

      loadSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testSpin = async () => {
    setTestSpinning(true);
    try {
      const { data, error } = await supabase.functions.invoke('spin-execute', {
        body: {
          bet_amount: 1,
          test_mode: true
        }
      });

      if (error) throw error;

      toast({
        title: "Test Spin Complete",
        description: `Result: ${data.segment?.label || 'Unknown'} (${data.bsk_delta > 0 ? '+' : ''}${data.bsk_delta} BSK)`,
        variant: data.bsk_delta > 0 ? "default" : "destructive"
      });

      loadRecentResults();
    } catch (error: any) {
      toast({
        title: "Test Spin Failed",
        description: error.message || "Failed to execute test spin",
        variant: "destructive"
      });
    } finally {
      setTestSpinning(false);
    }
  };

  const updateSetting = (key: keyof SpinSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading spin settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">Spin Settings</h1>
          </div>
          
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No spin settings found. Create initial configuration.</p>
              <Button onClick={() => window.location.reload()}>
                Reload Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">Spin Settings</h1>
            <Badge variant={settings.is_enabled ? "default" : "secondary"}>
              {settings.is_enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={testSpin} 
              disabled={testSpinning || !settings.is_enabled}
            >
              <TestTube className="w-4 h-4 mr-2" />
              {testSpinning ? "Testing..." : "Test Spin"}
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              <Settings className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
              <CardDescription>Core spin system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">System Enabled</Label>
                <Switch
                  id="enabled"
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => updateSetting('is_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="free-spins">Free Spins Per Day</Label>
                <Input
                  id="free-spins"
                  type="number"
                  value={settings.free_spins_default}
                  onChange={(e) => updateSetting('free_spins_default', parseInt(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldown">Cooldown (seconds)</Label>
                <Input
                  id="cooldown"
                  type="number"
                  value={settings.cooldown_seconds}
                  onChange={(e) => updateSetting('cooldown_seconds', parseInt(e.target.value))}
                  min="0"
                  max="86400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee">Fee After Free Spins (%)</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.1"
                  value={settings.fee_bp_after_free}
                  onChange={(e) => updateSetting('fee_bp_after_free', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bet Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Bet Limits</CardTitle>
              <CardDescription>Minimum and maximum bet amounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="min-bet">Minimum Bet (USDT)</Label>
                <Input
                  id="min-bet"
                  type="number"
                  step="0.01"
                  value={settings.min_bet_usdt}
                  onChange={(e) => updateSetting('min_bet_usdt', parseFloat(e.target.value))}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-bet">Maximum Bet (USDT)</Label>
                <Input
                  id="max-bet"
                  type="number"
                  step="0.01"
                  value={settings.max_bet_usdt}
                  onChange={(e) => updateSetting('max_bet_usdt', parseFloat(e.target.value))}
                  min="0"
                />
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Fee calculation: {settings.min_bet_usdt} USDT × {settings.fee_bp_after_free}% = {((settings.min_bet_usdt * settings.fee_bp_after_free) / 100).toFixed(2)} BSK
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Spins</CardTitle>
              <CardDescription>Latest spin results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <div>
                      <span className="font-medium">{result.segment_label}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {result.auth_method}
                      </Badge>
                      {result.is_free_spin && (
                        <Badge variant="secondary" className="ml-1 text-xs">Free</Badge>
                      )}
                    </div>
                    <div className={`font-mono ${result.bsk_delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.bsk_delta > 0 ? '+' : ''}{result.bsk_delta} BSK
                    </div>
                  </div>
                ))}
                {recentResults.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No recent spins</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segments Configuration */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Wheel Segments Configuration</CardTitle>
            <CardDescription>JSON configuration for wheel segments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                value={segmentJson}
                onChange={(e) => setSegmentJson(e.target.value)}
                placeholder="Enter segments JSON configuration..."
                className="min-h-64 font-mono text-sm"
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span>
                  Current segments: {Array.isArray(settings.segments) ? settings.segments.length : 0} configured
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}