import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function CommissionStructureCard() {
  const structure = [
    { levels: '1', rate: '10%', color: 'bg-primary/20' },
    { levels: '2', rate: '5%', color: 'bg-primary/15' },
    { levels: '3', rate: '3%', color: 'bg-primary/12' },
    { levels: '4-5', rate: '2%', color: 'bg-primary/10' },
    { levels: '6-10', rate: '1%', color: 'bg-primary/8' },
    { levels: '11-50', rate: '0.5%', color: 'bg-primary/5' },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">50-Level Commission Structure</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Earn commissions from badge purchases throughout your 50-level deep referral network
      </p>
      <div className="space-y-2">
        {structure.map((tier, idx) => (
          <div key={idx} className={`p-3 rounded-lg ${tier.color}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Level {tier.levels}</span>
              <span className="text-lg font-bold text-primary">{tier.rate}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
        <p className="font-medium mb-1">Example:</p>
        <p className="text-muted-foreground">
          If someone 3 levels below you purchases a 10,000 BSK badge, you earn 300 BSK (3%)
        </p>
      </div>
    </Card>
  );
}