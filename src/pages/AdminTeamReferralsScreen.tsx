import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, Trophy, Gift, Users, TrendingUp, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTeamReferrals, BadgeThreshold } from "@/hooks/useTeamReferrals";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CommissionPreviewCalculator from "@/components/admin/CommissionPreviewCalculator";
import { supabase } from "@/integrations/supabase/client";

const AdminTeamReferralsScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    settings,
    teamIncomeLevels,
    badgeThresholds,
    vipMilestones,
    referralLedger,
    loading,
    updateSettings
  } = useTeamReferrals();

  const [formData, setFormData] = useState({
    enabled: settings?.enabled ?? true,
    trigger_event: settings?.trigger_event ?? 'badge_purchase_or_upgrade',
    spillover_to_next_eligible_upline: settings?.spillover_to_next_eligible_upline ?? false,
    direct_referral_percent: settings?.direct_referral_percent ?? 10,
    cooloff_hours: settings?.cooloff_hours ?? 24,
    bsk_inr_rate: settings?.bsk_inr_rate ?? 1.0,
    daily_cap_per_earner: settings?.daily_cap_per_earner ?? '',
    weekly_cap_per_earner: settings?.weekly_cap_per_earner ?? '',
    per_downline_event_cap: settings?.per_downline_event_cap ?? '',
    // NEW: Badge-holder eligibility
    direct_commission_percent: settings?.direct_commission_percent ?? 10,
    min_referrer_badge_required: settings?.min_referrer_badge_required ?? 'ANY_BADGE',
    eligibility_policy: settings?.eligibility_policy ?? 'REQUIRE_AT_EVENT_NO_RETRO',
    retro_window_hours: settings?.retro_window_hours ?? 0,
    commission_scope: settings?.commission_scope ?? 'BADGE_PURCHASES_AND_UPGRADES',
    payout_destination: settings?.payout_destination ?? 'WITHDRAWABLE',
    apply_requirement_to_vip_milestones: settings?.apply_requirement_to_vip_milestones ?? true,
    cooloff_hours_for_clawback: settings?.cooloff_hours_for_clawback ?? 24,
    max_daily_direct_commission_bsk: settings?.max_daily_direct_commission_bsk ?? 100000
  });

  // Keep form in sync when settings load/update
  useEffect(() => {
    if (!settings) return;
    setFormData({
      enabled: settings.enabled,
      trigger_event: settings.trigger_event,
      spillover_to_next_eligible_upline: settings.spillover_to_next_eligible_upline,
      direct_referral_percent: settings.direct_referral_percent,
      cooloff_hours: settings.cooloff_hours,
      bsk_inr_rate: settings.bsk_inr_rate,
      daily_cap_per_earner: settings.daily_cap_per_earner ?? '',
      weekly_cap_per_earner: settings.weekly_cap_per_earner ?? '',
      per_downline_event_cap: settings.per_downline_event_cap ?? '',
      direct_commission_percent: settings.direct_commission_percent,
      min_referrer_badge_required: settings.min_referrer_badge_required,
      eligibility_policy: settings.eligibility_policy,
      retro_window_hours: settings.retro_window_hours,
      commission_scope: settings.commission_scope,
      payout_destination: settings.payout_destination,
      apply_requirement_to_vip_milestones: settings.apply_requirement_to_vip_milestones,
      cooloff_hours_for_clawback: settings.cooloff_hours_for_clawback,
      max_daily_direct_commission_bsk: settings.max_daily_direct_commission_bsk,
    });
  }, [settings]);

  const [editingLevels, setEditingLevels] = useState<Record<string, { bsk_reward: number; balance_type: string }>>({});
  const [editingBadge, setEditingBadge] = useState<BadgeThreshold | null>(null);

  const handleSave = async () => {
    try {
      await updateSettings({
        ...formData,
    daily_cap_per_earner: formData.daily_cap_per_earner ? parseFloat(formData.daily_cap_per_earner.toString()) : null,
    weekly_cap_per_earner: formData.weekly_cap_per_earner ? parseFloat(formData.weekly_cap_per_earner.toString()) : null,
    per_downline_event_cap: formData.per_downline_event_cap ? parseFloat(formData.per_downline_event_cap.toString()) : null
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-4 text-muted-foreground">Loading team referral settings...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalEarnings = referralLedger.reduce((sum, entry) => sum + entry.bsk_amount, 0);
  const pendingEarnings = referralLedger.filter(e => e.status === 'pending').reduce((sum, entry) => sum + entry.bsk_amount, 0);
  const settledEarnings = referralLedger.filter(e => e.status === 'settled').reduce((sum, entry) => sum + entry.bsk_amount, 0);
  const teamIncomeEntries = referralLedger.filter(e => e.ledger_type === 'team_income').length;
  const directBonusEntries = referralLedger.filter(e => e.ledger_type === 'direct_badge_bonus').length;

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3">
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
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Team & Referrals</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Manage referral program</p>
          </div>
        </div>
        <Button onClick={handleSave} className="gap-2 w-full md:w-auto text-sm">
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-3 md:p-4 text-center">
            <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-primary mx-auto mb-1 md:mb-2" />
            <p className="text-sm md:text-lg font-bold text-foreground">{totalEarnings.toFixed(1)}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Total BSK</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-3 md:p-4 text-center">
            <Gift className="w-4 h-4 md:w-6 md:h-6 text-yellow-500 mx-auto mb-1 md:mb-2" />
            <p className="text-sm md:text-lg font-bold text-foreground">{pendingEarnings.toFixed(1)}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-3 md:p-4 text-center">
            <Trophy className="w-4 h-4 md:w-6 md:h-6 text-green-500 mx-auto mb-1 md:mb-2" />
            <p className="text-sm md:text-lg font-bold text-foreground">{settledEarnings.toFixed(1)}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Settled</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-3 md:p-4 text-center">
            <Users className="w-4 h-4 md:w-6 md:h-6 text-blue-500 mx-auto mb-1 md:mb-2" />
            <p className="text-sm md:text-lg font-bold text-foreground">{teamIncomeEntries}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Team</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-3 md:p-4 text-center">
            <Gift className="w-4 h-4 md:w-6 md:h-6 text-purple-500 mx-auto mb-1 md:mb-2" />
            <p className="text-sm md:text-lg font-bold text-foreground">{directBonusEntries}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Direct</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="flex-1">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
          <TabsTrigger value="settings" className="text-xs md:text-sm px-2">Settings</TabsTrigger>
          <TabsTrigger value="badges" className="text-xs md:text-sm px-2">Badges</TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs md:text-sm px-2">Milestones</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs md:text-sm px-2">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
                <span className="truncate">Team Referral Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Program Status */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Program Enabled</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable the entire referral program</p>
                </div>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
                />
              </div>

              <Separator />

              {/* Trigger Event */}
              <div className="space-y-2">
                <Label htmlFor="trigger_event">Team Income Trigger Event</Label>
                <Select 
                  value={formData.trigger_event} 
                  onValueChange={(value) => setFormData({...formData, trigger_event: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signup_verified">On Signup Verified</SelectItem>
                    <SelectItem value="first_deposit">On First Deposit</SelectItem>
                    <SelectItem value="badge_purchase_or_upgrade">On Badge Purchase/Upgrade (Default)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Event that triggers team income distribution</p>
              </div>

              {/* Direct Commission Percent */}
              <div className="space-y-2">
                <Label htmlFor="direct_commission_percent">Direct Commission Percentage (0-50%)</Label>
                <Input
                  id="direct_commission_percent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.direct_commission_percent}
                  onChange={(e) => setFormData({...formData, direct_commission_percent: parseFloat(e.target.value)})}
                />
                <p className="text-xs text-muted-foreground">
                  Commission paid on badge purchases/upgrades (only if referrer holds required badge)
                </p>
              </div>

              {/* Minimum Badge Required */}
              <div className="space-y-2">
                <Label htmlFor="min_badge">Minimum Referrer Badge Required</Label>
                <Select 
                  value={formData.min_referrer_badge_required} 
                  onValueChange={(value) => setFormData({...formData, min_referrer_badge_required: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY_BADGE">Any Badge</SelectItem>
                    <SelectItem value="SILVER">Silver or Higher</SelectItem>
                    <SelectItem value="GOLD">Gold or Higher</SelectItem>
                    <SelectItem value="PLATINUM">Platinum or Higher</SelectItem>
                    <SelectItem value="DIAMOND">Diamond or Higher</SelectItem>
                    <SelectItem value="VIP">VIP Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Referrer must hold this badge (or higher) at event time to earn commission
                </p>
              </div>

              {/* Commission Scope */}
              <div className="space-y-2">
                <Label htmlFor="commission_scope">Commission Scope</Label>
                <Select 
                  value={formData.commission_scope} 
                  onValueChange={(value) => setFormData({...formData, commission_scope: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BADGE_PURCHASES_AND_UPGRADES">Purchases & Upgrades (pay on delta)</SelectItem>
                    <SelectItem value="BADGE_PURCHASES_ONLY">Purchases Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Upgrades pay only on incremental amount
                </p>
              </div>

              {/* Payout Destination */}
              <div className="space-y-2">
                <Label htmlFor="payout_destination">Payout Destination</Label>
                <Select 
                  value={formData.payout_destination} 
                  onValueChange={(value) => setFormData({...formData, payout_destination: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WITHDRAWABLE">Withdrawable Balance</SelectItem>
                    <SelectItem value="HOLDING">Holding Balance</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Where to credit commission BSK
                </p>
              </div>

              <Separator />

              {/* Daily Cap */}
              <div className="space-y-2">
                <Label htmlFor="max_daily_commission">Max Daily Direct Commission (BSK)</Label>
                <Input
                  id="max_daily_commission"
                  type="number"
                  step="1"
                  placeholder="100000 (0 = no limit)"
                  value={formData.max_daily_direct_commission_bsk}
                  onChange={(e) => setFormData({...formData, max_daily_direct_commission_bsk: parseFloat(e.target.value) || 0})}
                />
                <p className="text-xs text-muted-foreground">
                  Per-user daily commission cap (set to 0 for no limit)
                </p>
              </div>

              {/* Cooloff for Clawback */}
              <div className="space-y-2">
                <Label htmlFor="cooloff_clawback">Cool-off for Clawback (Hours)</Label>
                <Input
                  id="cooloff_clawback"
                  type="number"
                  value={formData.cooloff_hours_for_clawback}
                  onChange={(e) => setFormData({...formData, cooloff_hours_for_clawback: parseInt(e.target.value)})}
                />
                <p className="text-xs text-muted-foreground">
                  Hours to allow clawback if payment refunded
                </p>
              </div>

              {/* Apply to VIP Milestones */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="apply_vip">Apply Badge Requirement to VIP Milestones</Label>
                  <p className="text-sm text-muted-foreground">
                    If enabled, VIP milestone rewards also require badge eligibility
                  </p>
                </div>
                <Switch
                  id="apply_vip"
                  checked={formData.apply_requirement_to_vip_milestones}
                  onCheckedChange={(checked) => setFormData({...formData, apply_requirement_to_vip_milestones: checked})}
                />
              </div>

              {/* BSK/INR Rate */}
              <div className="space-y-2">
                <Label htmlFor="bsk_inr_rate">BSK to INR Rate</Label>
                <Input
                  id="bsk_inr_rate"
                  type="number"
                  step="0.01"
                  value={formData.bsk_inr_rate}
                  onChange={(e) => setFormData({...formData, bsk_inr_rate: parseFloat(e.target.value)})}
                />
                <p className="text-xs text-muted-foreground">Current BSK to INR conversion rate</p>
              </div>

              {/* Spillover */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="spillover">Spillover to Next Eligible Upline</Label>
                  <p className="text-sm text-muted-foreground">If earner's badge doesn't unlock enough levels, pass to next eligible upline</p>
                </div>
                <Switch
                  id="spillover"
                  checked={formData.spillover_to_next_eligible_upline}
                  onCheckedChange={(checked) => setFormData({...formData, spillover_to_next_eligible_upline: checked})}
                />
              </div>

              {/* Cool-off Period */}
              <div className="space-y-2">
                <Label htmlFor="cooloff_hours">Cool-off Period (Hours)</Label>
                <Input
                  id="cooloff_hours"
                  type="number"
                  value={formData.cooloff_hours}
                  onChange={(e) => setFormData({...formData, cooloff_hours: parseInt(e.target.value)})}
                />
                <p className="text-xs text-muted-foreground">Hours before rewards are settled (allows for clawback)</p>
              </div>

              {/* Caps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily_cap">Daily Cap per Earner (BSK)</Label>
                  <Input
                    id="daily_cap"
                    type="number"
                    step="0.01"
                    placeholder="No limit"
                    value={formData.daily_cap_per_earner}
                    onChange={(e) => setFormData({...formData, daily_cap_per_earner: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly_cap">Weekly Cap per Earner (BSK)</Label>
                  <Input
                    id="weekly_cap"
                    type="number"
                    step="0.01"
                    placeholder="No limit"
                    value={formData.weekly_cap_per_earner}
                    onChange={(e) => setFormData({...formData, weekly_cap_per_earner: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_cap">Per Downline Event Cap (BSK)</Label>
                  <Input
                    id="event_cap"
                    type="number"
                    step="0.01"
                    placeholder="No limit"
                    value={formData.per_downline_event_cap}
                    onChange={(e) => setFormData({...formData, per_downline_event_cap: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission Preview Calculator */}
          <CommissionPreviewCalculator 
            settings={{
              direct_commission_percent: formData.direct_commission_percent,
              min_referrer_badge_required: formData.min_referrer_badge_required,
              max_daily_direct_commission_bsk: formData.max_daily_direct_commission_bsk
            }}
            badges={badgeThresholds}
          />

          {/* Team Income Levels - Full Management */}
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <CardTitle className="text-base md:text-lg">Team Income Levels (All 50)</CardTitle>
                <Button
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    
                    const nextLevel = Math.max(...teamIncomeLevels.map(l => l.level), 0) + 1;
                    const { error } = await supabase.from('team_income_levels').insert({
                      level: nextLevel,
                      bsk_reward: 0,
                      balance_type: 'withdrawable',
                      is_active: true
                    });
                    
                    if (error) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Success", description: `Level ${nextLevel} added` });
                      window.location.reload();
                    }
                  }}
                  size="sm"
                  className="gap-2"
                >
                  <Users className="w-4 h-4" />
                  Add Level
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {teamIncomeLevels.sort((a, b) => a.level - b.level).map((level) => {
                  const isEditing = editingLevels[level.id];
                  return (
                    <div key={level.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <Badge variant="outline" className="shrink-0 w-16 justify-center">
                        L{level.level}
                      </Badge>
                      
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            step="0.01"
                            value={isEditing.bsk_reward}
                            onChange={(e) => setEditingLevels({
                              ...editingLevels,
                              [level.id]: { ...isEditing, bsk_reward: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-32"
                            placeholder="BSK Reward"
                          />
                          <Select
                            value={isEditing.balance_type}
                            onValueChange={(value) => setEditingLevels({
                              ...editingLevels,
                              [level.id]: { ...isEditing, balance_type: value }
                            })}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="withdrawable">Withdrawable</SelectItem>
                              <SelectItem value="holding">Holding</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('team_income_levels')
                                .update({
                                  bsk_reward: isEditing.bsk_reward,
                                  balance_type: isEditing.balance_type
                                })
                                .eq('id', level.id);
                              
                              if (error) {
                                toast({ title: "Error", description: error.message, variant: "destructive" });
                              } else {
                                toast({ title: "Success", description: `Level ${level.level} updated` });
                                const newEditing = { ...editingLevels };
                                delete newEditing[level.id];
                                setEditingLevels(newEditing);
                                window.location.reload();
                              }
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const newEditing = { ...editingLevels };
                              delete newEditing[level.id];
                              setEditingLevels(newEditing);
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="font-medium">{level.bsk_reward} BSK</p>
                            <p className="text-xs text-muted-foreground">
                              {(level as any).balance_type === 'holding' ? 'Holding' : 'Withdrawable'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingLevels({
                              ...editingLevels,
                              [level.id]: {
                                bsk_reward: level.bsk_reward,
                                balance_type: (level as any).balance_type || 'withdrawable'
                              }
                            })}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (!confirm(`Delete Level ${level.level}?`)) return;
                              
                              const { error } = await supabase
                                .from('team_income_levels')
                                .update({ is_active: false })
                                .eq('id', level.id);
                              
                              if (error) {
                                toast({ title: "Error", description: error.message, variant: "destructive" });
                              } else {
                                toast({ title: "Success", description: `Level ${level.level} deleted` });
                                window.location.reload();
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground pt-3 border-t">
                Levels are distributed to upline based on badge unlock levels. Edit BSK rewards and balance type for each level.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="truncate">Badge Subscription Pricing</span>
                </CardTitle>
                <Button onClick={() => setEditingBadge({
                  id: 'new',
                  badge_name: '',
                  bsk_threshold: 0,
                  unlock_levels: 0,
                  bonus_bsk_holding: 0,
                  description: '',
                  is_active: true,
                  created_at: '',
                  updated_at: ''
                })}>
                  Add New Badge
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Control badge subscription prices and benefits. Users subscribe via Badge Subscription screen.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {badgeThresholds.map((badge) => (
                  <div key={badge.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-sm">
                          {badge.badge_name}
                        </Badge>
                        <Badge variant={badge.is_active ? 'default' : 'outline'}>
                          {badge.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingBadge(badge)}
                      >
                        Edit
                      </Button>
                    </div>
                    {badge.description && (
                      <p className="text-sm text-muted-foreground mb-3">{badge.description}</p>
                    )}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Subscription Price</p>
                        <p className="text-lg font-bold text-primary">{badge.bsk_threshold.toLocaleString()} BSK</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Unlocks Levels</p>
                        <p className="text-lg font-bold">L1-L{badge.unlock_levels}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bonus BSK (Holding)</p>
                        <p className="text-lg font-bold text-green-600">+{badge.bonus_bsk_holding.toLocaleString()} BSK</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Gift className="w-4 h-4 md:w-5 md:h-5" />
                <span className="truncate">VIP Milestones</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vipMilestones.map((milestone) => (
                  <div key={milestone.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border border-border rounded-lg gap-3">
                    <div className="flex items-start gap-2 md:gap-4">
                      <Badge 
                        variant={milestone.reward_type === 'physical' ? 'default' : 'secondary'}
                        className="text-xs md:text-sm shrink-0"
                      >
                        {milestone.vip_count_threshold} VIPs
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium text-sm md:text-base truncate">{milestone.reward_description}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {milestone.reward_type === 'physical' ? 'Physical' : 'BSK'}
                          {milestone.requires_kyc && ' • KYC'}
                        </p>
                      </div>
                    </div>
                    <div className="text-left md:text-right shrink-0">
                      <p className="text-base md:text-lg font-bold text-primary">
                        {milestone.reward_inr_value.toLocaleString()} BSK
                      </p>
                      {milestone.reward_type === 'bsk' && (
                        <p className="text-xs md:text-sm text-muted-foreground">
                          ₹{(milestone.reward_inr_value * formData.bsk_inr_rate).toFixed(0)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>BSK Amount</TableHead>
                    <TableHead>INR Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralLedger.slice(0, 10).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">
                        {entry.user_id.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {entry.ledger_type.replace('_', ' ')}
                          {entry.depth && ` L${entry.depth}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.bsk_amount.toFixed(4)} BSK
                      </TableCell>
                      <TableCell>
                        ₹{entry.inr_amount_snapshot.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            entry.status === 'settled' ? 'default' :
                            entry.status === 'pending' ? 'secondary' :
                            entry.status === 'void' ? 'destructive' : 'outline'
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Badge Edit Dialog */}
      <Dialog open={editingBadge !== null} onOpenChange={() => setEditingBadge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBadge?.id === 'new' ? 'Add New Badge' : 'Edit Badge'}</DialogTitle>
            <DialogDescription>
              Configure badge subscription pricing and benefits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="badge_name">Badge Name</Label>
              <Input
                id="badge_name"
                value={editingBadge?.badge_name || ''}
                onChange={(e) => setEditingBadge(editingBadge ? {...editingBadge, badge_name: e.target.value} : null)}
                placeholder="e.g., PLATINUM"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingBadge?.description || ''}
                onChange={(e) => setEditingBadge(editingBadge ? {...editingBadge, description: e.target.value} : null)}
                placeholder="Brief description of the badge benefits"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bsk_threshold">Price (BSK)</Label>
                <Input
                  id="bsk_threshold"
                  type="number"
                  value={editingBadge?.bsk_threshold || 0}
                  onChange={(e) => setEditingBadge(editingBadge ? {...editingBadge, bsk_threshold: parseFloat(e.target.value)} : null)}
                />
              </div>
              <div>
                <Label htmlFor="unlock_levels">Unlock Levels (1-50)</Label>
                <Input
                  id="unlock_levels"
                  type="number"
                  min="1"
                  max="50"
                  value={editingBadge?.unlock_levels || 0}
                  onChange={(e) => setEditingBadge(editingBadge ? {...editingBadge, unlock_levels: parseInt(e.target.value)} : null)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bonus_bsk">Bonus BSK (Holding)</Label>
              <Input
                id="bonus_bsk"
                type="number"
                value={editingBadge?.bonus_bsk_holding || 0}
                onChange={(e) => setEditingBadge(editingBadge ? {...editingBadge, bonus_bsk_holding: parseFloat(e.target.value)} : null)}
              />
              <p className="text-xs text-muted-foreground mt-1">One-time bonus added to holding balance on purchase</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={editingBadge?.is_active ?? true}
                onCheckedChange={(checked) => setEditingBadge(editingBadge ? {...editingBadge, is_active: checked} : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBadge(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editingBadge) return;
              
              try {
                if (editingBadge.id === 'new') {
                  const { error } = await supabase
                    .from('badge_thresholds')
                    .insert({
                      badge_name: editingBadge.badge_name,
                      bsk_threshold: editingBadge.bsk_threshold,
                      unlock_levels: editingBadge.unlock_levels,
                      bonus_bsk_holding: editingBadge.bonus_bsk_holding,
                      description: editingBadge.description,
                      is_active: editingBadge.is_active,
                    });
                  
                  if (error) throw error;
                  toast({ title: "Success", description: "Badge created successfully" });
                } else {
                  const { error } = await supabase
                    .from('badge_thresholds')
                    .update({
                      badge_name: editingBadge.badge_name,
                      bsk_threshold: editingBadge.bsk_threshold,
                      unlock_levels: editingBadge.unlock_levels,
                      bonus_bsk_holding: editingBadge.bonus_bsk_holding,
                      description: editingBadge.description,
                      is_active: editingBadge.is_active,
                    })
                    .eq('id', editingBadge.id);
                  
                  if (error) throw error;
                  toast({ title: "Success", description: "Badge updated successfully" });
                }
                
                setEditingBadge(null);
                window.location.reload();
              } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
              }
            }}>
              Save Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTeamReferralsScreen;