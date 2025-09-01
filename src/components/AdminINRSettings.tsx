import { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FiatSettings {
  id: string;
  enabled: boolean;
  bank_account_name: string | null;
  bank_account_number: string | null;
  ifsc: string | null;
  bank_name: string | null;
  upi_id: string | null;
  upi_name: string | null;
  notes: string | null;
  min_deposit: number;
  fee_percent: number;
  fee_fixed: number;
}

export default function AdminINRSettings() {
  const [settings, setSettings] = useState<FiatSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_settings_inr')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('fiat_settings_inr')
          .insert({
            enabled: false,
            min_deposit: 100,
            fee_percent: 0,
            fee_fixed: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error loading INR settings:', error);
      toast({
        title: "Error",
        description: "Failed to load INR settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('fiat_settings_inr')
        .update({
          enabled: settings.enabled,
          bank_account_name: settings.bank_account_name,
          bank_account_number: settings.bank_account_number,
          ifsc: settings.ifsc,
          bank_name: settings.bank_name,
          upi_id: settings.upi_id,
          upi_name: settings.upi_name,
          notes: settings.notes,
          min_deposit: settings.min_deposit,
          fee_percent: settings.fee_percent,
          fee_fixed: settings.fee_fixed
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "INR deposit settings have been updated",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save INR settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updates: Partial<FiatSettings>) => {
    if (settings) {
      setSettings({ ...settings, ...updates });
    }
  };

  if (loading) {
    return <div className="p-4">Loading INR settings...</div>;
  }

  if (!settings) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load INR settings. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">INR Deposit Settings</h2>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
            <Label htmlFor="enabled">Enable INR Deposits</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_deposit">Minimum Deposit (INR)</Label>
              <Input
                id="min_deposit"
                type="number"
                value={settings.min_deposit}
                onChange={(e) => updateSettings({ min_deposit: parseFloat(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fee_percent">Fee Percentage (%)</Label>
              <Input
                id="fee_percent"
                type="number"
                value={settings.fee_percent}
                onChange={(e) => updateSettings({ fee_percent: parseFloat(e.target.value) || 0 })}
                min={0}
                max={10}
                step={0.1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee_fixed">Fixed Fee (INR)</Label>
            <Input
              id="fee_fixed"
              type="number"
              value={settings.fee_fixed}
              onChange={(e) => updateSettings({ fee_fixed: parseFloat(e.target.value) || 0 })}
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Instructions/Notes for Users</Label>
            <Textarea
              id="notes"
              placeholder="Additional instructions for users..."
              value={settings.notes || ''}
              onChange={(e) => updateSettings({ notes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Transfer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                placeholder="e.g., HDFC Bank"
                value={settings.bank_name || ''}
                onChange={(e) => updateSettings({ bank_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account_name">Account Holder Name</Label>
              <Input
                id="bank_account_name"
                placeholder="Account holder name"
                value={settings.bank_account_name || ''}
                onChange={(e) => updateSettings({ bank_account_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_account_number">Account Number</Label>
              <Input
                id="bank_account_number"
                placeholder="Bank account number"
                value={settings.bank_account_number || ''}
                onChange={(e) => updateSettings({ bank_account_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifsc">IFSC Code</Label>
              <Input
                id="ifsc"
                placeholder="e.g., HDFC0001234"
                value={settings.ifsc || ''}
                onChange={(e) => updateSettings({ ifsc: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>UPI Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="upi_id">UPI ID</Label>
              <Input
                id="upi_id"
                placeholder="user@paytm"
                value={settings.upi_id || ''}
                onChange={(e) => updateSettings({ upi_id: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upi_name">UPI Name</Label>
              <Input
                id="upi_name"
                placeholder="Account holder name"
                value={settings.upi_name || ''}
                onChange={(e) => updateSettings({ upi_name: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {settings.enabled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            INR deposits are currently enabled. Users can now submit deposit requests using the configured bank/UPI details.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}