import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, Trophy, Gift, Users, TrendingUp, Save, Edit, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReferralTreeRebuildTool } from "@/components/admin/ReferralTreeRebuildTool";

interface TeamReferralSettings {
  enabled: boolean;
  direct_referral_percent: number;
  cooloff_hours: number;
  bsk_inr_rate: number;
  spillover_to_next_eligible_upline: boolean;
}

interface TeamIncomeLevel {
  id: string;
  level: number;
  bsk_reward: number;
  balance_type: 'withdrawable' | 'holding';
  is_active: boolean;
}

interface BadgeThreshold {
  id: string;
  badge_name: string;
  bsk_threshold: number;
  unlock_levels: number;
  bonus_bsk_holding: number;
  description?: string;
  is_active: boolean;
}

interface VIPMilestone {
  id: string;
  vip_count_threshold: number;
  reward_type: 'bsk' | 'physical';
  reward_inr_value: number;
  reward_description: string;
  requires_kyc: boolean;
  is_active: boolean;
}

const AdminReferralsNova = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [settings, setSettings] = useState<TeamReferralSettings>({
    enabled: true,
    direct_referral_percent: 10,
    cooloff_hours: 24,
    bsk_inr_rate: 1.0,
    spillover_to_next_eligible_upline: false,
  });

  const [incomeLevels, setIncomeLevels] = useState<TeamIncomeLevel[]>([]);
  const [badges, setBadges] = useState<BadgeThreshold[]>([]);
  const [vipMilestones, setVipMilestones] = useState<VIPMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingLevel, setEditingLevel] = useState<TeamIncomeLevel | null>(null);
  const [editingBadge, setEditingBadge] = useState<BadgeThreshold | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<VIPMilestone | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, levelsRes, badgesRes, milestonesRes] = await Promise.all([
        supabase.from('team_referral_settings').select('*').single(),
        supabase.from('team_income_levels').select('*').order('level'),
        supabase.from('badge_thresholds').select('*').eq('is_active', true).order('bsk_threshold'),
        supabase.from('vip_milestones').select('*').eq('is_active', true).order('vip_count_threshold'),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data as any);
      if (levelsRes.data) setIncomeLevels(levelsRes.data as any);
      if (badgesRes.data) setBadges(badgesRes.data as any);
      if (milestonesRes.data) setVipMilestones(milestonesRes.data as any);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load referral data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('team_referral_settings')
        .update(settings)
        .eq('id', (await supabase.from('team_referral_settings').select('id').single()).data?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const saveLevel = async (level: Partial<TeamIncomeLevel>) => {
    try {
      if (level.id) {
        const { error } = await supabase
          .from('team_income_levels')
          .update({ bsk_reward: level.bsk_reward, balance_type: level.balance_type })
          .eq('id', level.id);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Level updated successfully",
      });
      
      loadData();
      setEditingLevel(null);
    } catch (error) {
      console.error('Error saving level:', error);
      toast({
        title: "Error",
        description: "Failed to save level",
        variant: "destructive",
      });
    }
  };

  const saveBadge = async (badge: Partial<BadgeThreshold>) => {
    try {
      if (badge.id) {
        const { error } = await supabase
          .from('badge_thresholds')
          .update({
            bsk_threshold: badge.bsk_threshold,
            unlock_levels: badge.unlock_levels,
            bonus_bsk_holding: badge.bonus_bsk_holding,
            description: badge.description,
          })
          .eq('id', badge.id);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Badge updated successfully",
      });
      
      loadData();
      setEditingBadge(null);
    } catch (error) {
      console.error('Error saving badge:', error);
      toast({
        title: "Error",
        description: "Failed to save badge",
        variant: "destructive",
      });
    }
  };

  const saveMilestone = async (milestone: Partial<VIPMilestone>) => {
    try {
      if (milestone.id) {
        // Update existing milestone
        const { error } = await supabase
          .from('vip_milestones')
          .update({
            vip_count_threshold: milestone.vip_count_threshold,
            reward_inr_value: milestone.reward_inr_value,
            reward_description: milestone.reward_description,
          })
          .eq('id', milestone.id);
        if (error) throw error;
      } else {
        // Create new milestone
        const { error } = await supabase
          .from('vip_milestones')
          .insert({
            vip_count_threshold: milestone.vip_count_threshold,
            reward_inr_value: milestone.reward_inr_value,
            reward_description: milestone.reward_description,
            reward_type: milestone.reward_type || 'bsk',
            requires_kyc: milestone.requires_kyc || false,
            is_active: true,
          });
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: milestone.id ? "Milestone updated successfully" : "Milestone created successfully",
      });
      
      loadData();
      setEditingMilestone(null);
    } catch (error) {
      console.error('Error saving milestone:', error);
      toast({
        title: "Error",
        description: "Failed to save milestone",
        variant: "destructive",
      });
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    try {
      const { error } = await supabase
        .from('vip_milestones')
        .update({ is_active: false })
        .eq('id', milestoneId);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Milestone deleted successfully",
      });
      
      loadData();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast({
        title: "Error",
        description: "Failed to delete milestone",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-4 text-muted-foreground">Loading referral configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Referral Program</h1>
            <p className="text-sm text-muted-foreground">Manage BSK referral rewards and settings</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="default"
            onClick={() => navigate('/app/admin/retroactive-commission-fix')}
            className="bg-gradient-primary"
          >
            <Settings className="w-4 h-4 mr-2" />
            Fix Commissions
          </Button>
          <Badge variant="secondary" className="text-xs">
            {settings.enabled ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{badges.length}</p>
            <p className="text-xs text-muted-foreground">Badge Tiers</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">50</p>
            <p className="text-xs text-muted-foreground">Income Levels</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Gift className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{vipMilestones.length}</p>
            <p className="text-xs text-muted-foreground">VIP Milestones</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{settings.direct_referral_percent}%</p>
            <p className="text-xs text-muted-foreground">Direct Bonus</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="flex-1">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="settings">Program Settings</TabsTrigger>
          <TabsTrigger value="badges">Badge Configuration</TabsTrigger>
          <TabsTrigger value="levels">Income Levels</TabsTrigger>
          <TabsTrigger value="milestones">VIP Milestones</TabsTrigger>
          <TabsTrigger value="tools">System Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Program Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Program Enabled</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable the referral program</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Direct Referral Bonus (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.direct_referral_percent}
                  onChange={(e) => setSettings({ ...settings, direct_referral_percent: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of badge purchase paid to direct referrer (withdrawable BSK)
                </p>
              </div>

              <div className="space-y-2">
                <Label>BSK to INR Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.bsk_inr_rate}
                  onChange={(e) => setSettings({ ...settings, bsk_inr_rate: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Current exchange rate for calculations</p>
              </div>

              <div className="space-y-2">
                <Label>Cool-off Period (Hours)</Label>
                <Input
                  type="number"
                  value={settings.cooloff_hours}
                  onChange={(e) => setSettings({ ...settings, cooloff_hours: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Hours before rewards are settled</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Spillover to Next Eligible Upline</Label>
                  <p className="text-sm text-muted-foreground">Pass rewards if earner's badge doesn't unlock levels</p>
                </div>
                <Switch
                  checked={settings.spillover_to_next_eligible_upline}
                  onCheckedChange={(checked) => setSettings({ ...settings, spillover_to_next_eligible_upline: checked })}
                />
              </div>

              <Button onClick={saveSettings} className="w-full gap-2">
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Badge Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {badges.map((badge) => (
                  <div key={badge.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{badge.badge_name}</Badge>
                        <span className="text-sm text-muted-foreground">→ Unlocks L1-L{badge.unlock_levels}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Cost:</strong> {badge.bsk_threshold.toLocaleString()} BSK</p>
                        {badge.bonus_bsk_holding > 0 && (
                          <p className="text-green-600"><strong>Bonus:</strong> +{badge.bonus_bsk_holding.toLocaleString()} BSK (holding)</p>
                        )}
                        <p className="text-muted-foreground">{badge.description}</p>
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setEditingBadge(badge)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit {badge.badge_name} Badge</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>BSK Cost</Label>
                            <Input
                              type="number"
                              value={editingBadge?.bsk_threshold || badge.bsk_threshold}
                              onChange={(e) => setEditingBadge({ ...badge, bsk_threshold: parseFloat(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label>Unlock Levels</Label>
                            <Input
                              type="number"
                              value={editingBadge?.unlock_levels || badge.unlock_levels}
                              onChange={(e) => setEditingBadge({ ...badge, unlock_levels: parseInt(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label>Bonus BSK (Holding)</Label>
                            <Input
                              type="number"
                              value={editingBadge?.bonus_bsk_holding || badge.bonus_bsk_holding}
                              onChange={(e) => setEditingBadge({ ...badge, bonus_bsk_holding: parseFloat(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Input
                              value={editingBadge?.description || badge.description || ''}
                              onChange={(e) => setEditingBadge({ ...badge, description: e.target.value })}
                            />
                          </div>
                          <Button onClick={() => editingBadge && saveBadge(editingBadge)} className="w-full">
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle>50-Level Income Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>BSK Reward</TableHead>
                    <TableHead>Balance Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeLevels.slice(0, 10).map((level) => (
                    <TableRow key={level.id}>
                      <TableCell>
                        <Badge variant="outline">L{level.level}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{level.bsk_reward} BSK</TableCell>
                      <TableCell>
                        <Badge variant={level.balance_type === 'holding' ? 'secondary' : 'default'}>
                          {level.balance_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingLevel(level)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Level {level.level}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>BSK Reward</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={editingLevel?.bsk_reward || level.bsk_reward}
                                  onChange={(e) => setEditingLevel({ ...level, bsk_reward: parseFloat(e.target.value) })}
                                />
                              </div>
                              <div>
                                <Label>Balance Type</Label>
                                <Select
                                  value={editingLevel?.balance_type || level.balance_type}
                                  onValueChange={(value: 'withdrawable' | 'holding') => 
                                    setEditingLevel({ ...level, balance_type: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="withdrawable">Withdrawable</SelectItem>
                                    <SelectItem value="holding">Holding</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button onClick={() => editingLevel && saveLevel(editingLevel)} className="w-full">
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Showing first 10 levels. Total: {incomeLevels.length} levels configured.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  VIP Direct-Referral Milestones
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      onClick={() => setEditingMilestone({
                        id: '',
                        vip_count_threshold: 10,
                        reward_inr_value: 10000,
                        reward_description: 'BSK reward for VIP referrals',
                        reward_type: 'bsk',
                        requires_kyc: false,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      } as VIPMilestone)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Milestone
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMilestone?.id ? 'Edit' : 'Add New'} VIP Milestone</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="vip_count">VIP Referral Count</Label>
                        <Input
                          id="vip_count"
                          type="number"
                          min="1"
                          value={editingMilestone?.vip_count_threshold || 10}
                          onChange={(e) => editingMilestone && setEditingMilestone({ 
                            ...editingMilestone, 
                            vip_count_threshold: parseInt(e.target.value) || 10 
                          })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Number of direct VIP referrals required
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="bsk_reward">BSK Reward Amount</Label>
                        <Input
                          id="bsk_reward"
                          type="number"
                          min="0"
                          step="1000"
                          value={editingMilestone?.reward_inr_value || 10000}
                          onChange={(e) => editingMilestone && setEditingMilestone({ 
                            ...editingMilestone, 
                            reward_inr_value: parseFloat(e.target.value) || 10000 
                          })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          BSK amount to reward when milestone is reached
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          placeholder="e.g., BSK reward for 10 VIP referrals"
                          value={editingMilestone?.reward_description || ''}
                          onChange={(e) => editingMilestone && setEditingMilestone({ 
                            ...editingMilestone, 
                            reward_description: e.target.value 
                          })}
                        />
                      </div>
                      <Button 
                        onClick={() => editingMilestone && saveMilestone(editingMilestone)} 
                        className="w-full gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {editingMilestone?.id ? 'Update' : 'Create'} Milestone
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vipMilestones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No VIP milestones configured</p>
                    <p className="text-sm">Click "Add Milestone" to create your first milestone</p>
                  </div>
                ) : (
                  vipMilestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-3 p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default" className="bg-purple-500">
                            {milestone.vip_count_threshold} VIPs
                          </Badge>
                          <span className="text-sm text-muted-foreground">{milestone.reward_description}</span>
                        </div>
                        <p className="text-lg font-bold text-primary">
                          {milestone.reward_inr_value.toLocaleString()} BSK
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingMilestone(milestone)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit VIP Milestone</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit_vip_count">VIP Referral Count</Label>
                                <Input
                                  id="edit_vip_count"
                                  type="number"
                                  min="1"
                                  value={editingMilestone?.vip_count_threshold || milestone.vip_count_threshold}
                                  onChange={(e) => setEditingMilestone({ 
                                    ...milestone, 
                                    vip_count_threshold: parseInt(e.target.value) || 10 
                                  })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_bsk_reward">BSK Reward Amount</Label>
                                <Input
                                  id="edit_bsk_reward"
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={editingMilestone?.reward_inr_value || milestone.reward_inr_value}
                                  onChange={(e) => setEditingMilestone({ 
                                    ...milestone, 
                                    reward_inr_value: parseFloat(e.target.value) || 10000 
                                  })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_description">Description</Label>
                                <Input
                                  id="edit_description"
                                  value={editingMilestone?.reward_description || milestone.reward_description}
                                  onChange={(e) => setEditingMilestone({ 
                                    ...milestone, 
                                    reward_description: e.target.value 
                                  })}
                                />
                              </div>
                              <Button 
                                onClick={() => editingMilestone && saveMilestone(editingMilestone)} 
                                className="w-full gap-2"
                              >
                                <Save className="w-4 h-4" />
                                Update Milestone
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm(`Delete milestone for ${milestone.vip_count_threshold} VIPs?`)) {
                              deleteMilestone(milestone.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <ReferralTreeRebuildTool />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReferralsNova;