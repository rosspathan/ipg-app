import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Settings,
  Shield,
  Wallet,
  Fuel,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Save,
  ExternalLink,
  Key,
  Clock,
  Wrench
} from 'lucide-react';

interface MigrationSettings {
  id: string;
  migration_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  migration_wallet_address: string | null;
  migration_fee_percent: number;
  gas_fee_model: 'fixed' | 'dynamic';
  fixed_gas_fee_bsk: number;
  min_amount_bsk: number;
  max_amount_bsk: number | null;
  required_confirmations: number;
  primary_rpc_url: string;
  fallback_rpc_url: string | null;
  token_decimals: number;
  min_hot_wallet_bsk: number;
  min_gas_balance_bnb: number;
  daily_migration_limit_bsk: number | null;
  per_user_daily_limit_bsk: number | null;
  updated_at: string;
}

interface HealthStatus {
  healthy: boolean;
  wallet_configured: boolean;
  private_key_configured: boolean;
  wallet_address: string | null;
  migration_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  hot_wallet_bsk_balance: number;
  gas_balance_bnb: number;
  rpc_status: 'ok' | 'error';
  rpc_latency_ms: number | null;
  issues: string[];
  warnings: string[];
  last_migration?: { id: string; tx_hash: string | null; completed_at: string | null } | null;
}

export default function BSKMigrationSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<MigrationSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['bsk-migration-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_migration_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as MigrationSettings;
    }
  });

  // Fetch health status
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['bsk-migration-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('user-migrate-bsk-onchain', {
        body: { action: 'get_health' }
      });
      
      if (error) throw error;
      return data as HealthStatus;
    },
    refetchInterval: 30000
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<MigrationSettings>) => {
      const { error } = await supabase
        .from('bsk_migration_settings')
        .update(updates)
        .eq('id', settings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['bsk-migration-settings'] });
      refetchHealth();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings');
    }
  });

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field: keyof MigrationSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!settings?.id) return;
    
    const updates: Partial<MigrationSettings> = {
      migration_enabled: formData.migration_enabled,
      maintenance_mode: formData.maintenance_mode,
      maintenance_message: formData.maintenance_message || null,
      migration_wallet_address: formData.migration_wallet_address || null,
      migration_fee_percent: Number(formData.migration_fee_percent),
      gas_fee_model: formData.gas_fee_model,
      fixed_gas_fee_bsk: Number(formData.fixed_gas_fee_bsk),
      min_amount_bsk: Number(formData.min_amount_bsk),
      max_amount_bsk: formData.max_amount_bsk ? Number(formData.max_amount_bsk) : null,
      required_confirmations: Number(formData.required_confirmations),
      primary_rpc_url: formData.primary_rpc_url,
      fallback_rpc_url: formData.fallback_rpc_url || null,
      min_hot_wallet_bsk: Number(formData.min_hot_wallet_bsk),
      min_gas_balance_bnb: Number(formData.min_gas_balance_bnb),
      daily_migration_limit_bsk: formData.daily_migration_limit_bsk ? Number(formData.daily_migration_limit_bsk) : null,
      per_user_daily_limit_bsk: formData.per_user_daily_limit_bsk ? Number(formData.per_user_daily_limit_bsk) : null,
    };
    
    updateMutation.mutate(updates);
  };

  const isLoading = settingsLoading || healthLoading;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              BSK Migration Settings
            </h1>
            <p className="text-muted-foreground">
              Configure on-chain migration parameters and monitor system health
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Health Status Card */}
        <Card className={health?.healthy ? 'border-green-500/50' : 'border-destructive/50'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>
                  Real-time status of the migration system
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={health?.healthy ? 'default' : 'destructive'}>
                  {health?.healthy ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Healthy
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Issues Detected
                    </>
                  )}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => refetchHealth()}
                  disabled={healthLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Health Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Wallet className="h-4 w-4" />
                  Wallet Address
                </div>
                <div className="flex items-center gap-2">
                  {health?.wallet_configured ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">
                    {health?.wallet_configured ? 'Configured' : 'Not Set'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Key className="h-4 w-4" />
                  Private Key
                </div>
                <div className="flex items-center gap-2">
                  {health?.private_key_configured ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">
                    {health?.private_key_configured ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Fuel className="h-4 w-4" />
                  Gas (BNB)
                </div>
                <div className={`text-lg font-bold ${
                  (health?.gas_balance_bnb || 0) < Number(formData.min_gas_balance_bnb || 0.05) 
                    ? 'text-destructive' 
                    : 'text-green-500'
                }`}>
                  {health?.gas_balance_bnb?.toFixed(4) || '0.0000'}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">BSK Balance</div>
                <div className={`text-lg font-bold ${
                  (health?.hot_wallet_bsk_balance || 0) < Number(formData.min_hot_wallet_bsk || 1000) 
                    ? 'text-destructive' 
                    : 'text-green-500'
                }`}>
                  {health?.hot_wallet_bsk_balance?.toLocaleString() || '0'}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">RPC Status</div>
                <div className="flex items-center gap-2">
                  {health?.rpc_status === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-medium">
                    {health?.rpc_status === 'ok' ? 'Connected' : 'Error'}
                  </span>
                  {health?.rpc_latency_ms && (
                    <span className="text-xs text-muted-foreground">
                      ({health.rpc_latency_ms}ms)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Issues List */}
            {health?.issues && health.issues.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Critical Issues (Blocking)</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {health.issues.map((issue, i) => (
                      <li key={i} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings List */}
            {health?.warnings && health.warnings.length > 0 && (
              <Alert className="border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Warnings (Non-blocking)</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {health.warnings.map((warning, i) => (
                      <li key={i} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Wallet Address */}
            {health?.wallet_address && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <span className="text-sm text-muted-foreground">Hot Wallet:</span>
                  <span className="font-mono text-sm ml-2">{health.wallet_address}</span>
                </div>
                <a
                  href={`https://bscscan.com/address/${health.wallet_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  View on BSCScan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Last Migration */}
            {health?.last_migration && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Last Migration:</span>
                  <span className="text-sm">
                    {health.last_migration.completed_at 
                      ? new Date(health.last_migration.completed_at).toLocaleString()
                      : 'In progress'}
                  </span>
                </div>
                {health.last_migration.tx_hash && (
                  <a
                    href={`https://bscscan.com/tx/${health.last_migration.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    View TX
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Control</CardTitle>
            <CardDescription>
              Enable or disable the migration feature for all users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div>
                <Label className="text-base font-medium">Migration Enabled</Label>
                <p className="text-sm text-muted-foreground">
                  When disabled, users cannot initiate new migrations
                </p>
              </div>
              <Switch
                checked={formData.migration_enabled ?? true}
                onCheckedChange={(checked) => handleChange('migration_enabled', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/20">
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-warning" />
                  Maintenance Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Shows maintenance message to users
                </p>
              </div>
              <Switch
                checked={formData.maintenance_mode ?? false}
                onCheckedChange={(checked) => handleChange('maintenance_mode', checked)}
              />
            </div>

            {formData.maintenance_mode && (
              <div className="space-y-2">
                <Label>Maintenance Message</Label>
                <Textarea
                  value={formData.maintenance_message ?? ''}
                  onChange={(e) => handleChange('maintenance_message', e.target.value)}
                  placeholder="Migration is temporarily unavailable for scheduled maintenance. Please check back in a few hours."
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wallet Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Configuration</CardTitle>
            <CardDescription>
              Configure the migration hot wallet address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Migration Wallet Address</Label>
              <Input
                value={formData.migration_wallet_address ?? ''}
                onChange={(e) => handleChange('migration_wallet_address', e.target.value)}
                placeholder="0x..."
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                This wallet address will be used to send BSK tokens to users
              </p>
            </div>

            <Alert>
              <Key className="h-4 w-4" />
              <AlertTitle>Private Key Configuration</AlertTitle>
              <AlertDescription>
                <p className="text-sm">
                  The private key for this wallet must be set as a Supabase secret named{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">MIGRATION_WALLET_PRIVATE_KEY</code>.
                </p>
                <p className="text-sm mt-2">
                  Status: {health?.private_key_configured ? (
                    <span className="text-green-500 font-medium">✓ Configured</span>
                  ) : (
                    <span className="text-destructive font-medium">✗ Missing</span>
                  )}
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Fee Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Configuration</CardTitle>
            <CardDescription>
              Configure migration fees and gas fee model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Migration Fee (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  value={formData.migration_fee_percent ?? 5}
                  onChange={(e) => handleChange('migration_fee_percent', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Percentage deducted from migration amount
                </p>
              </div>

              <div className="space-y-2">
                <Label>Gas Fee Model</Label>
                <Select
                  value={formData.gas_fee_model ?? 'dynamic'}
                  onValueChange={(value) => handleChange('gas_fee_model', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dynamic">Dynamic (from RPC)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.gas_fee_model === 'fixed' && (
              <div className="space-y-2">
                <Label>Fixed Gas Fee (BSK)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fixed_gas_fee_bsk ?? 5}
                  onChange={(e) => handleChange('fixed_gas_fee_bsk', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Migration Limits</CardTitle>
            <CardDescription>
              Configure minimum and maximum amounts for migrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Minimum Amount (BSK)</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.min_amount_bsk ?? 100}
                  onChange={(e) => handleChange('min_amount_bsk', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum Amount (BSK)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="No limit"
                  value={formData.max_amount_bsk ?? ''}
                  onChange={(e) => handleChange('max_amount_bsk', e.target.value || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no maximum limit
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Daily Global Limit (BSK)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="No limit"
                  value={formData.daily_migration_limit_bsk ?? ''}
                  onChange={(e) => handleChange('daily_migration_limit_bsk', e.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label>Per-User Daily Limit (BSK)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="No limit"
                  value={formData.per_user_daily_limit_bsk ?? ''}
                  onChange={(e) => handleChange('per_user_daily_limit_bsk', e.target.value || null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Balance Thresholds</CardTitle>
            <CardDescription>
              Minimum balances required for the system to operate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Minimum Hot Wallet BSK</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.min_hot_wallet_bsk ?? 1000}
                  onChange={(e) => handleChange('min_hot_wallet_bsk', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Warning shown when BSK balance falls below this
                </p>
              </div>

              <div className="space-y-2">
                <Label>Minimum Gas Balance (BNB)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.min_gas_balance_bnb ?? 0.05}
                  onChange={(e) => handleChange('min_gas_balance_bnb', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Warning shown when BNB balance falls below this
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blockchain Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Blockchain Configuration</CardTitle>
            <CardDescription>
              Configure RPC endpoints and confirmation requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Primary RPC URL</Label>
                <Input
                  value={formData.primary_rpc_url ?? 'https://bsc-dataseed.binance.org'}
                  onChange={(e) => handleChange('primary_rpc_url', e.target.value)}
                  placeholder="https://bsc-dataseed.binance.org"
                />
              </div>

              <div className="space-y-2">
                <Label>Fallback RPC URL</Label>
                <Input
                  value={formData.fallback_rpc_url ?? ''}
                  onChange={(e) => handleChange('fallback_rpc_url', e.target.value)}
                  placeholder="https://bsc-dataseed1.binance.org"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Required Confirmations</Label>
              <Input
                type="number"
                step="1"
                min="1"
                max="100"
                value={formData.required_confirmations ?? 3}
                onChange={(e) => handleChange('required_confirmations', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Number of block confirmations to wait before marking migration as complete
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
