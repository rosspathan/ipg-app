import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Settings, DollarSign, Users, Award, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReferralProgram } from '@/hooks/useReferralProgram';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const AdminReferralProgram = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    bonusAssets,
    bonusPrices,
    referralSettings,
    referralEvents,
    bonusBalances,
    loading,
    updateReferralSettings,
    updateBonusPrice,
    createBonusAsset,
    adjustBonusBalance,
    getCurrentPrice,
    getBSKAsset,
    refetch
  } = useReferralProgram();

  const [programEnabled, setProgramEnabled] = useState(referralSettings?.enabled || false);
  const [selectedAsset, setSelectedAsset] = useState(referralSettings?.default_asset_id || '');
  const [levels, setLevels] = useState(
    (referralSettings?.levels as any) || [
      { level: 1, percentage: 10 },
      { level: 2, percentage: 5 }
    ]
  );
  const [qualifyingActions, setQualifyingActions] = useState(
    (referralSettings?.qualifying_actions as any) || ['signup', 'kyc', 'first_trade']
  );
  const [caps, setCaps] = useState(
    (referralSettings?.caps as any) || { daily_per_user: 100, global_daily: 10000 }
  );
  const [schedule, setSchedule] = useState(referralSettings?.schedule || 'instant');
  
  // BSK price management
  const [newPrice, setNewPrice] = useState('');
  const [priceReason, setPriceReason] = useState('');
  const [showPriceDialog, setShowPriceDialog] = useState(false);

  // Balance adjustment
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);

  React.useEffect(() => {
    if (referralSettings) {
      setProgramEnabled(referralSettings.enabled);
      setSelectedAsset(referralSettings.default_asset_id || '');
      setLevels((referralSettings.levels as any) || []);
      setQualifyingActions((referralSettings.qualifying_actions as any) || []);
      setCaps((referralSettings.caps as any) || {});
      setSchedule(referralSettings.schedule);
    }
  }, [referralSettings]);

  const handleSaveSettings = async () => {
    await updateReferralSettings({
      enabled: programEnabled,
      default_asset_id: selectedAsset,
      levels: levels,
      qualifying_actions: qualifyingActions,
      caps: caps,
      schedule: schedule
    });
  };

  const handleUpdateBSKPrice = async () => {
    const bskAsset = getBSKAsset();
    if (!bskAsset || !newPrice) return;
    
    await updateBonusPrice(bskAsset.id, parseFloat(newPrice), priceReason);
    setNewPrice('');
    setPriceReason('');
    setShowPriceDialog(false);
  };

  const handleAdjustBalance = async () => {
    const bskAsset = getBSKAsset();
    if (!bskAsset || !adjustUserId || !adjustAmount) return;
    
    await adjustBonusBalance(adjustUserId, bskAsset.id, parseFloat(adjustAmount), adjustReason);
    setAdjustUserId('');
    setAdjustAmount(''); 
    setAdjustReason('');
    setShowBalanceDialog(false);
  };

  const handleCreateBSK = async () => {
    await createBonusAsset({
      name: 'BSK Bonus',
      symbol: 'BSK',
      network: 'OFFCHAIN',
      contract_address: null,
      description: 'Platform bonus token for referral rewards',
      decimals: 8,
      status: 'active'
    });
  };

  const addLevel = () => {
    const nextLevel = levels.length + 1;
    setLevels([...levels, { level: nextLevel, percentage: 5 }]);
  };

  const removeLevel = (index: number) => {
    setLevels(levels.filter((_, i) => i !== index));
  };

  const updateLevel = (index: number, field: string, value: number) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setLevels(newLevels);
  };

  const bskAsset = getBSKAsset();
  const currentBSKPrice = bskAsset ? getCurrentPrice(bskAsset.id) : 0;
  const totalReferralEvents = referralEvents.length;
  const totalBSKRewarded = referralEvents.reduce((sum, event) => sum + event.amount_bonus, 0);
  const totalValueRewarded = referralEvents.reduce((sum, event) => sum + event.usd_value, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/admin/programs')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Referral Program</h1>
            <p className="text-muted-foreground">Manage BSK referral rewards and settings</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <StatusBadge enabled={programEnabled} />
          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">BSK Price</p>
              <p className="text-2xl font-bold">${currentBSKPrice.toFixed(4)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{totalReferralEvents}</p>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">BSK Rewarded</p>
              <p className="text-2xl font-bold">{totalBSKRewarded.toFixed(2)}</p>
            </div>
            <Award className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Value Rewarded</p>
              <p className="text-2xl font-bold">${totalValueRewarded.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Program Settings</TabsTrigger>
          <TabsTrigger value="bsk">BSK Management</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
        </TabsList>

        {/* Program Settings */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Program Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure referral program settings and reward structure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="program-enabled">Enable Referral Program</Label>
                  <p className="text-sm text-muted-foreground">Turn the referral program on or off</p>
                </div>
                <Switch
                  id="program-enabled"
                  checked={programEnabled}
                  onCheckedChange={setProgramEnabled}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Default Bonus Coin</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bonus asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {bonusAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex items-center space-x-2">
                          <span>{asset.symbol}</span>
                          <Badge variant="secondary">{asset.network}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!bskAsset && (
                  <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-orange-600">BSK asset not found.</span>
                    <Button size="sm" onClick={handleCreateBSK}>Create BSK</Button>
                  </div>
                )}
              </div>

              {/* Referral Levels */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Referral Levels & Percentages</Label>
                  <Button size="sm" onClick={addLevel}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Level
                  </Button>
                </div>
                {levels.map((level, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <Label className="w-16">L{level.level}:</Label>
                    <Input
                      type="number"
                      value={level.percentage}
                      onChange={(e) => updateLevel(index, 'percentage', parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <Button size="sm" variant="destructive" onClick={() => removeLevel(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label>Payout Schedule</Label>
                <Select value={schedule} onValueChange={setSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="hourly">Hourly Batch</SelectItem>
                    <SelectItem value="daily">Daily Batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Caps */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Daily Per User Cap</Label>
                  <Input
                    type="number"
                    value={caps.daily_per_user || ''}
                    onChange={(e) => setCaps({...caps, daily_per_user: parseFloat(e.target.value) || 0})}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Global Daily Cap</Label>
                  <Input
                    type="number"
                    value={caps.global_daily || ''}
                    onChange={(e) => setCaps({...caps, global_daily: parseFloat(e.target.value) || 0})}
                    placeholder="10000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BSK Management */}
        <TabsContent value="bsk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>BSK Token Management</CardTitle>
              <CardDescription>
                Manage BSK pricing, supply, and user balances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {bskAsset ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Current BSK Price</Label>
                      <div className="text-2xl font-bold">${currentBSKPrice.toFixed(4)} USDT</div>
                    </div>
                    <div>
                      <Label>Network</Label>
                      <Badge variant="secondary">{bskAsset.network}</Badge>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
                      <DialogTrigger asChild>
                        <Button>Update Price</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update BSK Price</DialogTitle>
                          <DialogDescription>
                            Set a new price for BSK token (in USDT)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>New Price (USDT)</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              placeholder="1.0000"
                            />
                          </div>
                          <div>
                            <Label>Reason</Label>
                            <Textarea
                              value={priceReason}
                              onChange={(e) => setPriceReason(e.target.value)}
                              placeholder="Price adjustment reason..."
                            />
                          </div>
                          <Button onClick={handleUpdateBSKPrice} disabled={!newPrice}>
                            Update Price
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">Adjust Balance</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adjust User BSK Balance</DialogTitle>
                          <DialogDescription>
                            Credit or debit BSK from a user's account
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>User ID</Label>
                            <Input
                              value={adjustUserId}
                              onChange={(e) => setAdjustUserId(e.target.value)}
                              placeholder="Enter user ID"
                            />
                          </div>
                          <div>
                            <Label>Amount (BSK)</Label>
                            <Input
                              type="number"
                              step="0.00000001"
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value)}
                              placeholder="100.00000000"
                            />
                          </div>
                          <div>
                            <Label>Reason</Label>
                            <Textarea
                              value={adjustReason}
                              onChange={(e) => setAdjustReason(e.target.value)}
                              placeholder="Balance adjustment reason..."
                            />
                          </div>
                          <Button onClick={handleAdjustBalance} disabled={!adjustUserId || !adjustAmount}>
                            Adjust Balance
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">BSK Asset Not Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create the BSK bonus asset to manage referral rewards
                  </p>
                  <Button onClick={handleCreateBSK}>Create BSK Asset</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Referral Analytics</CardTitle>
              <CardDescription>
                View referral program performance and user activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4" />
                  <p>Detailed analytics coming soon...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatusBadge = ({ enabled }: { enabled: boolean }) => (
  <Badge variant={enabled ? "default" : "secondary"}>
    {enabled ? "Active" : "Inactive"}
  </Badge>
);

export default AdminReferralProgram;