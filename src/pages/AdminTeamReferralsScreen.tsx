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
              <CardTitle className="text-base md:text-lg">Team Income Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {teamIncomeLevels.filter(level => level.is_active).slice(0, 10).map((level) => (
                  <div key={level.id} className="text-center p-3 border border-border rounded-lg">
                    <Badge variant="outline" className="mb-2">L{level.level}</Badge>
                    <p className="text-lg font-bold text-primary">{level.bsk_reward} BSK</p>
                    <p className="text-xs text-muted-foreground">
                      {(level as any).balance_type === 'holding' ? 'Holding' : 'Withdrawable'}
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
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                <span className="truncate">Badge Thresholds</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {badgeThresholds.map((badge) => (
                  <div key={badge.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border border-border rounded-lg gap-3">
                    <div className="flex items-start md:items-center gap-2 md:gap-4">
                      <Badge variant="secondary" className="text-xs md:text-sm shrink-0">
                        {badge.badge_name}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium text-sm md:text-base">{badge.bsk_threshold.toLocaleString()} BSK</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Unlocks L1-L{badge.unlock_levels}
                        </p>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-base md:text-lg font-bold text-primary">L1-L{badge.unlock_levels}</p>
                      {badge.bonus_bsk_holding > 0 && (
                        <p className="text-xs md:text-sm text-green-600">
                          +{badge.bonus_bsk_holding.toLocaleString()} BSK Bonus
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
    </div>
  );
};

export default AdminTeamReferralsScreen;