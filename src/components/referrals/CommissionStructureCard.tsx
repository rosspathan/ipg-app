import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function CommissionStructureCard() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Direct Referral Badge Commission</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Earn 10% commission when your direct referrals (Level 1) purchase or upgrade their badges
      </p>
      <div className="p-4 rounded-lg bg-primary/20 border-2 border-primary/30">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-lg">Direct Referral (Level 1)</span>
          <span className="text-2xl font-bold text-primary">10%</span>
        </div>
      </div>
      <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
        <p className="font-medium mb-1">Example:</p>
        <p className="text-muted-foreground">
          If your direct referral purchases a 10,000 BSK badge, you earn 1,000 BSK (10%)
        </p>
      </div>
      <div className="mt-3 p-3 bg-accent/10 rounded-lg text-sm border border-accent/20">
        <p className="font-medium mb-1 text-accent-foreground">Important:</p>
        <p className="text-muted-foreground">
          Badge purchase commissions are only paid to your direct sponsor. The 50-level referral tree is used for tracking your team structure.
        </p>
      </div>
    </Card>
  );
}