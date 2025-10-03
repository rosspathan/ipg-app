import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CommissionPreviewCalculatorProps {
  settings: {
    direct_commission_percent: number;
    min_referrer_badge_required: string;
    max_daily_direct_commission_bsk: number;
  };
  badges: Array<{
    badge_name: string;
    bsk_threshold: number;
  }>;
}

const CommissionPreviewCalculator = ({ settings, badges }: CommissionPreviewCalculatorProps) => {
  const [referrerBadge, setReferrerBadge] = useState<string>('SILVER');
  const [fromBadge, setFromBadge] = useState<string>('NONE');
  const [toBadge, setToBadge] = useState<string>('SILVER');

  // Calculate commissionable amount
  const getBadgePrice = (badgeName: string) => {
    const badge = badges.find(b => b.badge_name === badgeName);
    return badge?.bsk_threshold || 0;
  };

  const toPrice = getBadgePrice(toBadge);
  const fromPrice = fromBadge === 'NONE' ? 0 : getBadgePrice(fromBadge);
  const commissionableAmount = toPrice - fromPrice;

  // Check eligibility
  const badgeTiers: Record<string, number> = {
    'VIP': 5,
    'DIAMOND': 4,
    'PLATINUM': 3,
    'GOLD': 2,
    'SILVER': 1,
    'NONE': 0
  };

  const referrerTier = badgeTiers[referrerBadge] || 0;
  const requiredTier = settings.min_referrer_badge_required === 'ANY_BADGE' 
    ? 1 
    : badgeTiers[settings.min_referrer_badge_required] || 0;

  const isEligible = referrerTier >= requiredTier;
  const commission = isEligible ? (commissionableAmount * settings.direct_commission_percent) / 100 : 0;

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Calculator className="w-4 h-4 md:w-5 md:h-5" />
          Commission Preview Calculator
        </CardTitle>
        <CardDescription>
          Calculate expected commission based on referrer badge and downline action
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Referrer Badge</Label>
            <Select value={referrerBadge} onValueChange={setReferrerBadge}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No Badge</SelectItem>
                <SelectItem value="SILVER">Silver</SelectItem>
                <SelectItem value="GOLD">Gold</SelectItem>
                <SelectItem value="PLATINUM">Platinum</SelectItem>
                <SelectItem value="DIAMOND">Diamond</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Downline From Badge</Label>
            <Select value={fromBadge} onValueChange={setFromBadge}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None (New Purchase)</SelectItem>
                {badges.map(badge => (
                  <SelectItem key={badge.badge_name} value={badge.badge_name}>
                    {badge.badge_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Downline To Badge</Label>
            <Select value={toBadge} onValueChange={setToBadge}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {badges.map(badge => (
                  <SelectItem key={badge.badge_name} value={badge.badge_name}>
                    {badge.badge_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Badge Price ({toBadge}):</span>
            <span className="font-medium">{toPrice.toLocaleString()} BSK</span>
          </div>
          {fromBadge !== 'NONE' && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm">Current Badge ({fromBadge}):</span>
                <span className="font-medium">-{fromPrice.toLocaleString()} BSK</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium">Commissionable Amount:</span>
            <span className="font-bold">{commissionableAmount.toLocaleString()} BSK</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Commission Rate:</span>
            <span>{settings.direct_commission_percent}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Eligibility:</span>
            <Badge variant={isEligible ? "default" : "destructive"}>
              {isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
            </Badge>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Expected Commission:</span>
            <span className="text-xl font-bold text-primary">
              {commission.toFixed(2)} BSK
            </span>
          </div>
        </div>

        {!isEligible && (
          <div className="text-xs text-destructive p-3 bg-destructive/10 rounded-lg">
            ⚠️ Referrer badge <strong>{referrerBadge}</strong> does not meet minimum requirement <strong>{settings.min_referrer_badge_required}</strong>. 
            No commission will be paid.
          </div>
        )}

        {isEligible && commission > settings.max_daily_direct_commission_bsk && settings.max_daily_direct_commission_bsk > 0 && (
          <div className="text-xs text-amber-600 p-3 bg-amber-600/10 rounded-lg">
            ⚠️ Commission exceeds daily cap of {settings.max_daily_direct_commission_bsk.toLocaleString()} BSK. 
            Actual payout may be capped.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommissionPreviewCalculator;
