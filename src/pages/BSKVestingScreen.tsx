import React, { useState, useEffect } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { AlertCircle, Calendar, Clock, TrendingUp, Users, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow, format } from 'date-fns';

interface VestingConfig {
  id: string;
  is_enabled: boolean;
  vesting_duration_days: number;
  daily_release_percent: number;
  referral_reward_percent: number;
  min_ipg_swap_amount: number;
  max_ipg_swap_amount?: number;
  eligible_chains: string[];
}

interface UserVesting {
  id: string;
  ipg_amount_swapped: number;
  bsk_total_amount: number;
  bsk_daily_amount: number;
  start_date: string;
  end_date: string;
  days_completed: number;
  bsk_released_total: number;
  bsk_pending_total: number;
  is_active: boolean;
  is_paused: boolean;
  created_at: string;
}

interface VestingRelease {
  id: string;
  release_date: string;
  bsk_amount: number;
  day_number: number;
  referrer_reward_amount?: number;
}

export default function BSKVestingScreen() {
  const { user } = useAuthUser();
  const [config, setConfig] = useState<VestingConfig | null>(null);
  const [vestingSchedules, setVestingSchedules] = useState<UserVesting[]>([]);
  const [vestingReleases, setVestingReleases] = useState<VestingRelease[]>([]);
  const [ipgAmount, setIpgAmount] = useState('');
  const [bskRate, setBskRate] = useState('2.5'); // Default BSK exchange rate
  const [selectedChain, setSelectedChain] = useState('BEP20');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      // Fetch vesting config
      const { data: configData, error: configError } = await supabase
        .from('bsk_vesting_config')
        .select('*')
        .eq('is_enabled', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        console.error('Error fetching config:', configError);
      } else if (configData) {
        setConfig(configData);
        setSelectedChain(configData.eligible_chains[0] || 'BEP20');
      }

      // Fetch user's vesting schedules
      const { data: vestingData, error: vestingError } = await supabase
        .from('user_bsk_vesting')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (vestingError) {
        console.error('Error fetching vesting:', vestingError);
      } else {
        setVestingSchedules(vestingData || []);
      }

      // Fetch vesting releases
      const { data: releasesData, error: releasesError } = await supabase
        .from('bsk_vesting_releases')
        .select('*')
        .eq('user_id', user?.id)
        .order('release_date', { ascending: false })
        .limit(50);

      if (releasesError) {
        console.error('Error fetching releases:', releasesError);
      } else {
        setVestingReleases(releasesData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateVesting = async () => {
    if (!config || !user) return;

    const amount = parseFloat(ipgAmount);
    if (isNaN(amount) || amount < config.min_ipg_swap_amount) {
      toast({
        title: "Invalid Amount",
        description: `Minimum IPG amount is ${config.min_ipg_swap_amount}`,
        variant: "destructive",
      });
      return;
    }

    if (config.max_ipg_swap_amount && amount > config.max_ipg_swap_amount) {
      toast({
        title: "Invalid Amount", 
        description: `Maximum IPG amount is ${config.max_ipg_swap_amount}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bsk-vesting-swap', {
        body: {
          ipg_amount: amount,
          bsk_exchange_rate: parseFloat(bskRate),
          chain: selectedChain,
          tx_hash: txHash || undefined
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Vesting Schedule Created",
        description: "Your BSK vesting schedule has been created successfully!",
      });

      // Reset form
      setIpgAmount('');
      setTxHash('');
      
      // Refresh data
      fetchData();

    } catch (error: any) {
      console.error('Error creating vesting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create vesting schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            BSK vesting is currently disabled. Please check back later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeVesting = vestingSchedules.find(v => v.is_active && !v.is_paused);
  const totalBSKVested = vestingSchedules.reduce((sum, v) => sum + v.bsk_total_amount, 0);
  const totalBSKReleased = vestingSchedules.reduce((sum, v) => sum + v.bsk_released_total, 0);
  const totalBSKPending = vestingSchedules.reduce((sum, v) => sum + v.bsk_pending_total, 0);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BSK Vesting Program</h1>
          <p className="text-muted-foreground">
            Swap IPG for BSK with {config.vesting_duration_days}-day vesting schedule
          </p>
        </div>
        <Badge variant={config.is_enabled ? "default" : "secondary"}>
          {config.is_enabled ? "Active" : "Disabled"}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total BSK Vested</p>
                <p className="text-xl font-bold">{totalBSKVested.toFixed(2)}</p>
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
                <p className="text-xl font-bold text-green-500">{totalBSKReleased.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">BSK Pending</p>
                <p className="text-xl font-bold text-blue-500">{totalBSKPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Referral Reward</p>
                <p className="text-xl font-bold text-purple-500">{config.referral_reward_percent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Vesting Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Create Vesting Schedule</CardTitle>
            <CardDescription>
              Swap IPG for BSK with {config.vesting_duration_days}-day vesting at {config.daily_release_percent}% daily
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipgAmount">IPG Amount</Label>
                <Input
                  id="ipgAmount"
                  type="number"
                  placeholder={`Min: ${config.min_ipg_swap_amount}`}
                  value={ipgAmount}
                  onChange={(e) => setIpgAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bskRate">BSK Exchange Rate</Label>
                <Input
                  id="bskRate"
                  type="number"
                  step="0.1"
                  value={bskRate}
                  onChange={(e) => setBskRate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chain">Chain</Label>
              <select
                id="chain"
                className="w-full p-2 border rounded"
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
              >
                {config.eligible_chains.map(chain => (
                  <option key={chain} value={chain}>{chain}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="txHash">Transaction Hash (Optional)</Label>
              <Input
                id="txHash"
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />
            </div>

            {ipgAmount && (
              <div className="p-3 bg-muted rounded space-y-2">
                <p className="text-sm font-medium">Vesting Preview:</p>
                <p className="text-sm">
                  BSK Total: {(parseFloat(ipgAmount) * parseFloat(bskRate)).toFixed(2)} BSK
                </p>
                <p className="text-sm">
                  Daily Release: {((parseFloat(ipgAmount) * parseFloat(bskRate)) * config.daily_release_percent / 100).toFixed(2)} BSK
                </p>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={handleCreateVesting}
              disabled={loading || !ipgAmount || parseFloat(ipgAmount) < config.min_ipg_swap_amount}
            >
              {loading ? "Creating..." : "Create Vesting Schedule"}
            </Button>
          </CardContent>
        </Card>

        {/* Active Vesting Schedule */}
        {activeVesting && (
          <Card>
            <CardHeader>
              <CardTitle>Active Vesting Schedule</CardTitle>
              <CardDescription>
                Started {format(new Date(activeVesting.start_date), 'MMM dd, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{activeVesting.days_completed}/{config.vesting_duration_days} days</span>
                </div>
                <Progress 
                  value={(activeVesting.days_completed / config.vesting_duration_days) * 100} 
                  className="h-2"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">IPG Swapped</p>
                  <p className="font-medium">{activeVesting.ipg_amount_swapped}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">BSK Total</p>
                  <p className="font-medium">{activeVesting.bsk_total_amount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Daily Amount</p>
                  <p className="font-medium">{activeVesting.bsk_daily_amount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-medium">{format(new Date(activeVesting.end_date), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Released</span>
                  <span className="text-sm font-medium text-green-500">
                    {activeVesting.bsk_released_total.toFixed(2)} BSK
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="text-sm font-medium text-blue-500">
                    {activeVesting.bsk_pending_total.toFixed(2)} BSK
                  </span>
                </div>
              </div>

              {activeVesting.days_completed < config.vesting_duration_days && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Next release: {formatDistanceToNow(new Date(Date.now() + 24 * 60 * 60 * 1000), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Vesting History */}
      {vestingReleases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vesting History</CardTitle>
            <CardDescription>Recent BSK releases</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {vestingReleases.map((release) => (
                  <div key={release.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Day {release.day_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(release.release_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-500">
                        +{release.bsk_amount.toFixed(2)} BSK
                      </p>
                      {release.referrer_reward_amount && release.referrer_reward_amount > 0 && (
                        <p className="text-xs text-purple-500">
                          Referral: +{release.referrer_reward_amount.toFixed(2)} BSK
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}