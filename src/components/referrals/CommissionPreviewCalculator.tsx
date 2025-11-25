import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, Lock, Unlock } from 'lucide-react';

interface BadgeConfig {
  name: string;
  price: number;
  unlocksLevels: number;
}

interface LevelReward {
  level: number;
  bsk_reward: number;
  balance_type: string;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  { name: 'Silver', price: 1000, unlocksLevels: 10 },
  { name: 'Gold', price: 2000, unlocksLevels: 20 },
  { name: 'Platinum', price: 3000, unlocksLevels: 30 },
  { name: 'Diamond', price: 4000, unlocksLevels: 40 },
  { name: 'VIP', price: 5000, unlocksLevels: 50 },
];

export function CommissionPreviewCalculator() {
  const [selectedBadge, setSelectedBadge] = useState('VIP');
  const [directCommissionPercent, setDirectCommissionPercent] = useState(10);
  const [levelRewards, setLevelRewards] = useState<LevelReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get subscription commission rate
      const { data: settings } = await supabase
        .from('team_referral_settings')
        .select('direct_commission_percent')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settings) {
        setDirectCommissionPercent(settings.direct_commission_percent);
      }

      // Get all level rewards
      const { data: levels } = await supabase
        .from('team_income_levels')
        .select('level, bsk_reward, balance_type')
        .eq('is_active', true)
        .order('level');

      if (levels) {
        setLevelRewards(levels);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const badge = BADGE_CONFIGS.find(b => b.name === selectedBadge);
  if (!badge || loading) {
    return <div className="p-4">Loading...</div>;
  }

  const subscriptionBonus = badge.price * (directCommissionPercent / 100);
  const l1LevelReward = levelRewards.find(l => l.level === 1)?.bsk_reward || 0;

  // Calculate rewards for each level range
  const calculateRangeRewards = (start: number, end: number, requiredBadge: string) => {
    const rewards = levelRewards.filter(l => l.level >= start && l.level <= end);
    const total = rewards.reduce((sum, l) => sum + l.bsk_reward, 0);
    const count = rewards.length;
    return { total, count, requiredBadge };
  };

  const ranges = [
    calculateRangeRewards(2, 10, 'Silver'),
    calculateRangeRewards(11, 20, 'Gold'),
    calculateRangeRewards(21, 30, 'Platinum'),
    calculateRangeRewards(31, 40, 'Diamond'),
    calculateRangeRewards(41, 50, 'VIP'),
  ];

  const totalPossible = subscriptionBonus + l1LevelReward + ranges.reduce((sum, r) => sum + r.total, 0);
  const totalLevelsActive = ranges.reduce((sum, r) => sum + r.count, 0) + 1; // +1 for L1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Commission Preview Calculator
        </CardTitle>
        <CardDescription>
          Calculate total commission distribution for badge purchases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Badge Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Select Badge</label>
          <Select value={selectedBadge} onValueChange={setSelectedBadge}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BADGE_CONFIGS.map(badge => (
                <SelectItem key={badge.name} value={badge.name}>
                  {badge.name} ({badge.price.toLocaleString()} BSK)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Commission Breakdown */}
        <div className="space-y-4">
          <div className="font-semibold text-lg border-b pb-2">
            Badge: {selectedBadge} ({badge.price.toLocaleString()} BSK)
          </div>

          {/* Level 1 Direct */}
          <div className="p-4 bg-primary/5 rounded-lg space-y-2 border-l-4 border-primary">
            <div className="font-semibold flex items-center gap-2">
              <Unlock className="w-4 h-4 text-primary" />
              Level 1 (Direct Sponsor)
            </div>
            <div className="space-y-1 text-sm pl-6">
              <div className="flex justify-between">
                <span>└─ Subscription Bonus ({directCommissionPercent}%):</span>
                <span className="font-bold">{subscriptionBonus.toFixed(0)} BSK</span>
              </div>
              <div className="flex justify-between">
                <span>└─ Level Reward:</span>
                <span className="font-bold">{l1LevelReward} BSK</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-primary font-bold">
                <span>Total L1:</span>
                <span>{(subscriptionBonus + l1LevelReward).toFixed(0)} BSK</span>
              </div>
            </div>
          </div>

          {/* Multi-Level Ranges */}
          {ranges.map((range, idx) => {
            const start = idx === 0 ? 2 : (idx * 10) + 1;
            const end = (idx + 1) * 10;
            const isLocked = end > badge.unlocksLevels;
            
            return (
              <div 
                key={idx}
                className={`p-4 rounded-lg space-y-2 border-l-4 ${
                  isLocked 
                    ? 'bg-muted/50 border-muted opacity-50' 
                    : 'bg-success/5 border-success'
                }`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Unlock className="w-4 h-4 text-success" />
                    )}
                    Levels {start}-{end}
                  </div>
                  <Badge variant={isLocked ? "secondary" : "default"}>
                    {range.requiredBadge}+ Required
                  </Badge>
                </div>
                <div className="text-sm pl-6">
                  {isLocked ? (
                    <div className="text-muted-foreground">
                      🔒 Sponsor needs {range.requiredBadge} or higher to earn
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>└─ {range.count} levels × reward each:</span>
                      <span className="font-bold">{range.total.toFixed(1)} BSK</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand Total */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">Maximum Distribution (All 50 Levels):</span>
              <span className="text-2xl font-bold text-primary">{totalPossible.toFixed(0)} BSK</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• {totalLevelsActive} active levels configured</div>
              <div>• {((totalPossible / badge.price) * 100).toFixed(2)}% total commission rate</div>
              <div>• Actual payout depends on sponsor badge levels</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
          <strong>Note:</strong> This calculator shows maximum potential commissions if all 50 levels 
          have sponsors with sufficient badge tiers. Actual payouts depend on:
          <ul className="list-disc list-inside mt-1 ml-2 space-y-0.5">
            <li>Sponsor badge levels (determines unlocked levels)</li>
            <li>Referral tree depth (how many levels exist)</li>
            <li>Active level configurations in database</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
