import React, { useState, useEffect } from 'react';
import { useAuthAdmin } from '@/hooks/useAuthAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Users, 
  TrendingUp, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

interface VestingConfig {
  id: string;
  is_enabled: boolean;
  vesting_duration_days: number;
  daily_release_percent: number;
  referral_reward_percent: number;
  min_ipg_swap_amount: number;
  max_ipg_swap_amount?: number;
  max_vesting_per_user?: number;
  anti_sybil_max_per_ip: number;
  eligible_chains: string[];
}

interface VestingStats {
  total_users: number;
  total_ipg_swapped: number;
  total_bsk_vested: number;
  total_bsk_released: number;
  active_schedules: number;
}

interface UserVesting {
  id: string;
  user_id: string;
  ipg_amount_swapped: number;
  bsk_total_amount: number;
  days_completed: number;
  bsk_released_total: number;
  bsk_pending_total: number;
  is_active: boolean;
  is_paused: boolean;
  start_date: string;
  created_at: string;
}

export function AdminBSKVesting() {
  const { user } = useAuthAdmin();
  const [config, setConfig] = useState<VestingConfig | null>(null);
  const [stats, setStats] = useState<VestingStats | null>(null);
  const [userVestings, setUserVestings] = useState<UserVesting[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Form states for config
  const [editConfig, setEditConfig] = useState<Partial<VestingConfig>>({});

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      // Fetch current config
      const { data: configData, error: configError } = await supabase
        .from('bsk_vesting_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        console.error('Error fetching config:', configError);
      } else if (configData) {
        setConfig(configData);
        setEditConfig(configData);
      }

      // Fetch vesting statistics
      const { data: vestingData, error: vestingError } = await supabase
        .from('user_bsk_vesting')
        .select(`
          id,
          user_id,
          ipg_amount_swapped,
          bsk_total_amount,
          days_completed,
          bsk_released_total,
          bsk_pending_total,
          is_active,
          is_paused,
          start_date,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (vestingError) {
        console.error('Error fetching vesting data:', vestingError);
      } else if (vestingData) {
        setUserVestings(vestingData);

        // Calculate stats
        const totalUsers = new Set(vestingData.map(v => v.user_id)).size;
        const totalIPG = vestingData.reduce((sum, v) => sum + Number(v.ipg_amount_swapped), 0);
        const totalBSK = vestingData.reduce((sum, v) => sum + Number(v.bsk_total_amount), 0);
        const totalReleased = vestingData.reduce((sum, v) => sum + Number(v.bsk_released_total), 0);
        const activeSchedules = vestingData.filter(v => v.is_active).length;

        setStats({
          total_users: totalUsers,
          total_ipg_swapped: totalIPG,
          total_bsk_vested: totalBSK,
          total_bsk_released: totalReleased,
          active_schedules: activeSchedules
        });
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!config) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bsk_vesting_config')
        .update(editConfig)
        .eq('id', config.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Configuration Updated",
        description: "BSK vesting configuration has been updated successfully.",
      });

      fetchData();

    } catch (error: any) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunDailyVesting = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bsk-daily-vesting');

      if (error) {
        throw error;
      }

      toast({
        title: "Daily Vesting Processed",
        description: `Processed ${data.processed_count} vesting releases`,
      });

      fetchData();

    } catch (error: any) {
      console.error('Error running daily vesting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process daily vesting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVestingStatus = async (vestingId: string, isPaused: boolean) => {
    try {
      const { error } = await supabase
        .from('user_bsk_vesting')
        .update({ is_paused: !isPaused })
        .eq('id', vestingId);

      if (error) {
        throw error;
      }

      toast({
        title: isPaused ? "Vesting Resumed" : "Vesting Paused",
        description: `Vesting schedule has been ${isPaused ? 'resumed' : 'paused'}.`,
      });

      fetchData();

    } catch (error: any) {
      console.error('Error toggling vesting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update vesting status",
        variant: "destructive",
      });
    }
  };

  if (dataLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BSK Vesting Management</h1>
          <p className="text-muted-foreground">
            Manage BSK vesting configurations and monitor user vesting schedules
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={config?.is_enabled ? "default" : "secondary"}>
            {config?.is_enabled ? "Enabled" : "Disabled"}
          </Badge>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-xl font-bold">{stats.total_users}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">IPG Swapped</p>
                  <p className="text-xl font-bold">{stats.total_ipg_swapped.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">BSK Vested</p>
                  <p className="text-xl font-bold">{stats.total_bsk_vested.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">BSK Released</p>
                  <p className="text-xl font-bold">{stats.total_bsk_released.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Active Schedules</p>
                  <p className="text-xl font-bold">{stats.active_schedules}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Vesting Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure BSK vesting parameters and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enable BSK Vesting</Label>
              <Switch
                id="enabled"
                checked={editConfig.is_enabled || false}
                onCheckedChange={(checked) => 
                  setEditConfig(prev => ({ ...prev, is_enabled: checked }))
                }
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Vesting Duration (Days)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={editConfig.vesting_duration_days || 100}
                  onChange={(e) => 
                    setEditConfig(prev => ({ 
                      ...prev, 
                      vesting_duration_days: parseInt(e.target.value) 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyPercent">Daily Release (%)</Label>
                <Input
                  id="dailyPercent"
                  type="number"
                  step="0.1"
                  value={editConfig.daily_release_percent || 1.0}
                  onChange={(e) => 
                    setEditConfig(prev => ({ 
                      ...prev, 
                      daily_release_percent: parseFloat(e.target.value) 
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referralPercent">Referral Reward (%)</Label>
                <Input
                  id="referralPercent"
                  type="number"
                  step="0.1"
                  value={editConfig.referral_reward_percent || 0.5}
                  onChange={(e) => 
                    setEditConfig(prev => ({ 
                      ...prev, 
                      referral_reward_percent: parseFloat(e.target.value) 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minAmount">Min IPG Amount</Label>
                <Input
                  id="minAmount"
                  type="number"
                  value={editConfig.min_ipg_swap_amount || 10}
                  onChange={(e) => 
                    setEditConfig(prev => ({ 
                      ...prev, 
                      min_ipg_swap_amount: parseFloat(e.target.value) 
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxAmount">Max IPG Amount (Optional)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  placeholder="No limit"
                  value={editConfig.max_ipg_swap_amount || ''}
                  onChange={(e) => 
                    setEditConfig(prev => ({ 
                      ...prev, 
                      max_ipg_swap_amount: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPerUser">Max BSK Per User (Optional)</Label>
                <Input
                  id="maxPerUser"
                  type="number"
                  placeholder="No limit"
                  value={editConfig.max_vesting_per_user || ''}
                  onChange={(e) => 
                    setEditConfig(prev => ({ 
                      ...prev, 
                      max_vesting_per_user: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={handleUpdateConfig}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Updating..." : "Update Configuration"}
              </Button>
              <Button 
                onClick={handleRunDailyVesting}
                disabled={loading}
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                Run Daily Vesting
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Actions */}
        <Card>
          <CardHeader>
            <CardTitle>System Actions</CardTitle>
            <CardDescription>Administrative actions and monitoring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Daily vesting processing should be automated via cron job. 
                Manual execution is for testing purposes only.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                onClick={handleRunDailyVesting}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Process Daily Vesting Releases
              </Button>

              <Button 
                onClick={fetchData}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All Data
              </Button>
            </div>

            {config && (
              <div className="p-3 bg-muted rounded space-y-2">
                <p className="text-sm font-medium">Current Configuration:</p>
                <div className="text-xs space-y-1">
                  <p>Duration: {config.vesting_duration_days} days</p>
                  <p>Daily Release: {config.daily_release_percent}%</p>
                  <p>Referral Reward: {config.referral_reward_percent}%</p>
                  <p>IPG Range: {config.min_ipg_swap_amount} - {config.max_ipg_swap_amount || '∞'}</p>
                  <p>Chains: {config.eligible_chains.join(', ')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Vesting Schedules */}
      <Card>
        <CardHeader>
          <CardTitle>User Vesting Schedules</CardTitle>
          <CardDescription>Monitor and manage individual vesting schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {userVestings.map((vesting) => (
                <div key={vesting.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      vesting.is_active 
                        ? vesting.is_paused 
                          ? 'bg-orange-500' 
                          : 'bg-green-500'
                        : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium">User: {vesting.user_id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(vesting.start_date), 'MMM dd, yyyy')} • 
                        Day {vesting.days_completed}/{config?.vesting_duration_days}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {vesting.bsk_total_amount.toFixed(2)} BSK
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Released: {vesting.bsk_released_total.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Badge variant={
                        vesting.is_active 
                          ? vesting.is_paused 
                            ? "secondary" 
                            : "default"
                          : "outline"
                      }>
                        {vesting.is_active 
                          ? vesting.is_paused 
                            ? "Paused" 
                            : "Active"
                          : "Completed"
                        }
                      </Badge>
                      
                      {vesting.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleVestingStatus(vesting.id, vesting.is_paused)}
                        >
                          {vesting.is_paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {userVestings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No vesting schedules found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}