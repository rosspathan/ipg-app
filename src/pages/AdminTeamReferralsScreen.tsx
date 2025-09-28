import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, Trophy, Gift, Users, TrendingUp, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTeamReferrals } from "@/hooks/useTeamReferrals";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    per_downline_event_cap: settings?.per_downline_event_cap ?? ''
  });

  const handleSave = async () => {
    try {
      await updateSettings({
        ...formData,
        daily_cap_per_earner: formData.daily_cap_per_earner ? parseFloat(formData.daily_cap_per_earner) : null,
        weekly_cap_per_earner: formData.weekly_cap_per_earner ? parseFloat(formData.weekly_cap_per_earner) : null,
        per_downline_event_cap: formData.per_downline_event_cap ? parseFloat(formData.per_downline_event_cap) : null
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
            <h1 className="text-2xl font-bold text-foreground">Team & Referrals</h1>
            <p className="text-sm text-muted-foreground">Manage comprehensive referral program settings</p>
          </div>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{totalEarnings.toFixed(2)} BSK</p>
            <p className="text-xs text-muted-foreground">Total Earnings</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Gift className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{pendingEarnings.toFixed(2)} BSK</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{settledEarnings.toFixed(2)} BSK</p>
            <p className="text-xs text-muted-foreground">Settled</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{teamIncomeEntries}</p>
            <p className="text-xs text-muted-foreground">Team Rewards</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Gift className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{directBonusEntries}</p>
            <p className="text-xs text-muted-foreground">Direct Bonuses</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Program Settings</TabsTrigger>
          <TabsTrigger value="badges">Badge Configuration</TabsTrigger>
          <TabsTrigger value="milestones">VIP Milestones</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Team Referral Program Settings
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

              {/* Direct Referral Percentage */}
              <div className="space-y-2">
                <Label htmlFor="direct_referral_percent">Direct Referral Percentage (%)</Label>
                <Input
                  id="direct_referral_percent"
                  type="number"
                  step="0.1"
                  value={formData.direct_referral_percent}
                  onChange={(e) => setFormData({...formData, direct_referral_percent: parseFloat(e.target.value)})}
                />
                <p className="text-xs text-muted-foreground">Percentage of badge purchase amount paid to direct referrer</p>
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

          {/* Team Income Levels */}
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle>Team Income Levels (L1-L50)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {teamIncomeLevels.filter(level => level.is_active).map((level) => (
                  <div key={level.id} className="text-center p-3 border border-border rounded-lg">
                    <Badge variant="outline" className="mb-2">L{level.level}</Badge>
                    <p className="text-lg font-bold text-primary">{level.bsk_reward} BSK</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{(level.bsk_reward * formData.bsk_inr_rate).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Level rewards are distributed based on the earner's badge unlock levels
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Badge Thresholds & Unlock Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {badgeThresholds.map((badge) => (
                  <div key={badge.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-sm">
                        {badge.badge_name}
                      </Badge>
                      <div>
                        <p className="font-medium">₹{badge.inr_threshold.toLocaleString()} INR Threshold</p>
                        <p className="text-sm text-muted-foreground">
                          Unlocks earning from {badge.unlock_levels} levels
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">L1-L{badge.unlock_levels}</p>
                      {badge.vip_bonus_inr > 0 && (
                        <p className="text-sm text-green-600">
                          +₹{badge.vip_bonus_inr.toLocaleString()} VIP Bonus
                        </p>
                      )}
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
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                VIP Direct-Referral Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vipMilestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={milestone.reward_type === 'physical' ? 'default' : 'secondary'}
                        className="text-sm"
                      >
                        {milestone.vip_count_threshold} VIPs
                      </Badge>
                      <div>
                        <p className="font-medium">{milestone.reward_description}</p>
                        <p className="text-sm text-muted-foreground">
                          {milestone.reward_type === 'physical' ? 'Physical Reward' : 'BSK Reward'}
                          {milestone.requires_kyc && ' • Requires KYC'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        ₹{milestone.reward_inr_value.toLocaleString()}
                      </p>
                      {milestone.reward_type === 'bsk' && (
                        <p className="text-sm text-muted-foreground">
                          {(milestone.reward_inr_value / formData.bsk_inr_rate).toFixed(0)} BSK
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
              <CardTitle>Recent Referral Activity</CardTitle>
            </CardHeader>
            <CardContent>
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
    </div>
  );
};

export default AdminTeamReferralsScreen;