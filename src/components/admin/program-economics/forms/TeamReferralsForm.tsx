import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Users,
  DollarSign,
  Award,
  Settings
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

const teamReferralsSchema = z.object({
  enabled: z.boolean(),
  max_levels: z.number().min(1).max(50),
  trigger_event: z.enum(['badge_purchase_or_upgrade', 'deposit', 'trade', 'all']),
  
  // Commission Structure
  direct_commission_percent: z.number().min(0).max(100),
  level_commissions: z.array(z.number().min(0).max(100)),
  
  // Badge Requirements
  min_referrer_badge_required: z.enum(['none', 'ANY_BADGE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'VIP']),
  apply_requirement_to_vip_milestones: z.boolean(),
  
  // Balance Slab System
  balance_slabs_enabled: z.boolean(),
  
  // Commission Limits
  daily_cap_per_earner: z.number().optional(),
  weekly_cap_per_earner: z.number().optional(),
  max_daily_direct_commission_bsk: z.number().optional(),
  per_downline_event_cap: z.number().optional(),
  
  // Settings
  spillover_to_next_eligible_upline: z.boolean(),
  cooloff_hours: z.number().min(0).max(168),
  cooloff_hours_for_clawback: z.number().min(0).max(168),
  retro_window_hours: z.number().min(0).max(720),
  
  // Payout
  payout_destination: z.enum(['WITHDRAWABLE', 'HOLDING']),
  commission_scope: z.enum(['BADGE_PURCHASES_AND_UPGRADES', 'DEPOSITS', 'TRADES', 'ALL_EVENTS']),
  eligibility_policy: z.enum(['REQUIRE_AT_EVENT_NO_RETRO', 'REQUIRE_AT_EVENT_WITH_RETRO', 'LENIENT_ALLOW_LATE']),
  
  // Rates
  bsk_inr_rate: z.number().min(0.1),
  
  // Regional
  region_enabled: z.object({
    IN: z.boolean(),
    US: z.boolean(),
    EU: z.boolean(),
    GLOBAL: z.boolean()
  })
});

type TeamReferralsFormData = z.infer<typeof teamReferralsSchema>;

interface TeamReferralsFormProps {
  initialData?: Partial<TeamReferralsFormData>;
  onSubmit: (data: TeamReferralsFormData) => void;
  isSubmitting?: boolean;
}

export function TeamReferralsForm({ 
  initialData, 
  onSubmit, 
  isSubmitting = false 
}: TeamReferralsFormProps) {
  const [maxLevels, setMaxLevels] = useState(initialData?.max_levels || 10);
  
  const form = useForm<TeamReferralsFormData>({
    resolver: zodResolver(teamReferralsSchema),
    defaultValues: {
      enabled: initialData?.enabled ?? true,
      max_levels: initialData?.max_levels ?? 10,
      trigger_event: initialData?.trigger_event ?? 'badge_purchase_or_upgrade',
      direct_commission_percent: initialData?.direct_commission_percent ?? 10,
      level_commissions: initialData?.level_commissions ?? Array(50).fill(0).map((_, i) => 
        i === 0 ? 10 : Math.max(0, 10 - i * 0.5)
      ),
      min_referrer_badge_required: initialData?.min_referrer_badge_required ?? 'ANY_BADGE',
      apply_requirement_to_vip_milestones: initialData?.apply_requirement_to_vip_milestones ?? true,
      balance_slabs_enabled: initialData?.balance_slabs_enabled ?? false,
      daily_cap_per_earner: initialData?.daily_cap_per_earner,
      weekly_cap_per_earner: initialData?.weekly_cap_per_earner,
      max_daily_direct_commission_bsk: initialData?.max_daily_direct_commission_bsk ?? 100000,
      per_downline_event_cap: initialData?.per_downline_event_cap,
      spillover_to_next_eligible_upline: initialData?.spillover_to_next_eligible_upline ?? false,
      cooloff_hours: initialData?.cooloff_hours ?? 24,
      cooloff_hours_for_clawback: initialData?.cooloff_hours_for_clawback ?? 24,
      retro_window_hours: initialData?.retro_window_hours ?? 0,
      payout_destination: initialData?.payout_destination ?? 'WITHDRAWABLE',
      commission_scope: initialData?.commission_scope ?? 'BADGE_PURCHASES_AND_UPGRADES',
      eligibility_policy: initialData?.eligibility_policy ?? 'REQUIRE_AT_EVENT_NO_RETRO',
      bsk_inr_rate: initialData?.bsk_inr_rate ?? 1.0,
      region_enabled: initialData?.region_enabled ?? {
        IN: true,
        US: false,
        EU: false,
        GLOBAL: true
      }
    }
  });

  const watchedValues = form.watch();
  
  useEffect(() => {
    setMaxLevels(watchedValues.max_levels);
  }, [watchedValues.max_levels]);

  // Real-time Calculations
  const calculations = useMemo(() => {
    const activeLevels = watchedValues.level_commissions.slice(0, watchedValues.max_levels);
    const totalPayout = activeLevels.reduce((sum, rate) => sum + rate, 0);
    const avgCommission = totalPayout / watchedValues.max_levels;
    
    // Budget impact for 100 users with 1000 INR event
    const eventValue = 1000;
    const bskPerEvent = eventValue / watchedValues.bsk_inr_rate;
    const commissionPerEvent = (bskPerEvent * totalPayout) / 100;
    const budgetFor100Users = commissionPerEvent * 100;
    const budgetFor1000Users = commissionPerEvent * 1000;
    
    // Check for decreasing percentages
    let isDecreasing = true;
    for (let i = 1; i < activeLevels.length; i++) {
      if (activeLevels[i] > activeLevels[i-1]) {
        isDecreasing = false;
        break;
      }
    }
    
    return {
      totalPayout,
      avgCommission,
      commissionPerEvent,
      budgetFor100Users,
      budgetFor1000Users,
      isDecreasing,
      isHealthy: totalPayout <= 50 && isDecreasing
    };
  }, [watchedValues.level_commissions, watchedValues.max_levels, watchedValues.bsk_inr_rate]);

  const handleLevelCommissionChange = (level: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const currentCommissions = [...watchedValues.level_commissions];
    currentCommissions[level] = Math.min(100, Math.max(0, numValue));
    form.setValue('level_commissions', currentCommissions);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* System Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Control
          </CardTitle>
          <CardDescription>Enable or disable the entire referral system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>System Enabled</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, no new commissions will be generated
              </p>
            </div>
            <Switch
              checked={watchedValues.enabled}
              onCheckedChange={(checked) => form.setValue('enabled', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Max Referral Levels (1-50)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[watchedValues.max_levels]}
                onValueChange={([value]) => form.setValue('max_levels', value)}
                min={1}
                max={50}
                step={1}
                className="flex-1"
              />
              <div className="w-16 text-center font-semibold text-lg">
                {watchedValues.max_levels}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Users can earn commissions from up to {watchedValues.max_levels} levels deep in their network
            </p>
          </div>

          <div className="space-y-2">
            <Label>Trigger Event</Label>
            <Select
              value={watchedValues.trigger_event}
              onValueChange={(value: any) => form.setValue('trigger_event', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="badge_purchase_or_upgrade">Badge Purchase/Upgrade</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="trade">Trades</SelectItem>
                <SelectItem value="all">All Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Commission Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Commission Structure
          </CardTitle>
          <CardDescription>Configure commission percentages for each level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Direct Referral Commission (Level 0)</Label>
            <Input
              type="number"
              step="0.1"
              value={watchedValues.direct_commission_percent}
              onChange={(e) => form.setValue('direct_commission_percent', parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Commission for direct referrals (people you directly invited)
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Level-by-Level Commissions (%)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newCommissions = Array(50).fill(0).map((_, i) => {
                    if (i === 0) return watchedValues.direct_commission_percent;
                    return Math.max(0, watchedValues.direct_commission_percent - i * 0.5);
                  });
                  form.setValue('level_commissions', newCommissions);
                }}
              >
                Auto-Fill Decreasing
              </Button>
            </div>

            <div className="grid grid-cols-5 gap-3 max-h-[300px] overflow-y-auto p-2 border rounded-lg">
              {Array.from({ length: watchedValues.max_levels }).map((_, index) => (
                <div key={index} className="space-y-1">
                  <Label className="text-xs">L{index + 1}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={watchedValues.level_commissions[index] || 0}
                    onChange={(e) => handleLevelCommissionChange(index, e.target.value)}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Calculations */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-semibold text-sm">Real-Time Analysis</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total Payout</p>
                <p className="font-semibold text-lg">{calculations.totalPayout.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Commission</p>
                <p className="font-semibold text-lg">{calculations.avgCommission.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Per Event (1000 INR)</p>
                <p className="font-semibold">{calculations.commissionPerEvent.toFixed(2)} BSK</p>
              </div>
              <div>
                <p className="text-muted-foreground">Budget (100 users)</p>
                <p className="font-semibold">{calculations.budgetFor100Users.toFixed(0)} BSK</p>
              </div>
            </div>
          </div>

          {/* Validation Alerts */}
          {!calculations.isDecreasing && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Commissions should decrease with each level for healthy economics
              </AlertDescription>
            </Alert>
          )}

          {calculations.totalPayout > 50 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Total payout of {calculations.totalPayout.toFixed(1)}% is very high. Consider reducing to under 50%.
              </AlertDescription>
            </Alert>
          )}

          {calculations.isHealthy && (
            <Alert className="border-success bg-success/5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Commission structure looks healthy! Decreasing percentages and reasonable total payout.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Badge Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badge Requirements
          </CardTitle>
          <CardDescription>Set badge thresholds for earning commissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Minimum Referrer Badge</Label>
            <Select
              value={watchedValues.min_referrer_badge_required}
              onValueChange={(value: any) => form.setValue('min_referrer_badge_required', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Anyone)</SelectItem>
                <SelectItem value="ANY_BADGE">Any Badge</SelectItem>
                <SelectItem value="SILVER">Silver or Higher</SelectItem>
                <SelectItem value="GOLD">Gold or Higher</SelectItem>
                <SelectItem value="PLATINUM">Platinum or Higher</SelectItem>
                <SelectItem value="DIAMOND">Diamond or Higher</SelectItem>
                <SelectItem value="VIP">VIP Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Apply to VIP Milestones</Label>
              <p className="text-sm text-muted-foreground">
                Require badge for VIP milestone commissions
              </p>
            </div>
            <Switch
              checked={watchedValues.apply_requirement_to_vip_milestones}
              onCheckedChange={(checked) => form.setValue('apply_requirement_to_vip_milestones', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Balance Slabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Balance Slab System
          </CardTitle>
          <CardDescription>Unlock levels based on user balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Balance Slabs</Label>
              <p className="text-sm text-muted-foreground">
                Users unlock more levels as their balance grows
              </p>
            </div>
            <Switch
              checked={watchedValues.balance_slabs_enabled}
              onCheckedChange={(checked) => form.setValue('balance_slabs_enabled', checked)}
            />
          </div>

          {watchedValues.balance_slabs_enabled && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Balance slabs are configured separately in the referral settings.
                Users will only earn from levels they've unlocked based on their balance tier.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Commission Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Commission Limits
          </CardTitle>
          <CardDescription>Set daily/weekly caps to control costs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Daily Cap (BSK)</Label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={watchedValues.daily_cap_per_earner || ''}
                onChange={(e) => form.setValue('daily_cap_per_earner', parseFloat(e.target.value) || undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label>Weekly Cap (BSK)</Label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={watchedValues.weekly_cap_per_earner || ''}
                onChange={(e) => form.setValue('weekly_cap_per_earner', parseFloat(e.target.value) || undefined)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Max Daily Direct Commission (BSK)</Label>
            <Input
              type="number"
              value={watchedValues.max_daily_direct_commission_bsk}
              onChange={(e) => form.setValue('max_daily_direct_commission_bsk', parseFloat(e.target.value) || undefined)}
            />
          </div>

          <div className="space-y-2">
            <Label>Per Downline Event Cap (BSK)</Label>
            <Input
              type="number"
              placeholder="Unlimited"
              value={watchedValues.per_downline_event_cap || ''}
              onChange={(e) => form.setValue('per_downline_event_cap', parseFloat(e.target.value) || undefined)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Spillover to Next Eligible</Label>
              <p className="text-sm text-muted-foreground">
                If user is ineligible, pass commission to next eligible upline
              </p>
            </div>
            <Switch
              checked={watchedValues.spillover_to_next_eligible_upline}
              onCheckedChange={(checked) => form.setValue('spillover_to_next_eligible_upline', checked)}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cooloff (hours)</Label>
              <Input
                type="number"
                value={watchedValues.cooloff_hours}
                onChange={(e) => form.setValue('cooloff_hours', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Clawback Cooloff</Label>
              <Input
                type="number"
                value={watchedValues.cooloff_hours_for_clawback}
                onChange={(e) => form.setValue('cooloff_hours_for_clawback', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Retro Window</Label>
              <Input
                type="number"
                value={watchedValues.retro_window_hours}
                onChange={(e) => form.setValue('retro_window_hours', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payout Destination</Label>
              <Select
                value={watchedValues.payout_destination}
                onValueChange={(value: any) => form.setValue('payout_destination', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WITHDRAWABLE">Withdrawable</SelectItem>
                  <SelectItem value="HOLDING">Holding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Commission Scope</Label>
              <Select
                value={watchedValues.commission_scope}
                onValueChange={(value: any) => form.setValue('commission_scope', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BADGE_PURCHASES_AND_UPGRADES">Badge Purchases</SelectItem>
                  <SelectItem value="DEPOSITS">Deposits</SelectItem>
                  <SelectItem value="TRADES">Trades</SelectItem>
                  <SelectItem value="ALL_EVENTS">All Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Eligibility Policy</Label>
            <Select
              value={watchedValues.eligibility_policy}
              onValueChange={(value: any) => form.setValue('eligibility_policy', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REQUIRE_AT_EVENT_NO_RETRO">Require at Event (No Retro)</SelectItem>
                <SelectItem value="REQUIRE_AT_EVENT_WITH_RETRO">Require at Event (With Retro)</SelectItem>
                <SelectItem value="LENIENT_ALLOW_LATE">Lenient (Allow Late)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>BSK/INR Rate</Label>
            <Input
              type="number"
              step="0.01"
              value={watchedValues.bsk_inr_rate}
              onChange={(e) => form.setValue('bsk_inr_rate', parseFloat(e.target.value) || 1)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Availability</CardTitle>
          <CardDescription>Enable referrals in specific regions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(watchedValues.region_enabled).map(([region, enabled]) => (
            <div key={region} className="flex items-center justify-between">
              <Label>{region}</Label>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => 
                  form.setValue('region_enabled', {
                    ...watchedValues.region_enabled,
                    [region]: checked
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || !calculations.isHealthy}
        >
          {isSubmitting ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      {!calculations.isHealthy && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix validation issues before saving
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
