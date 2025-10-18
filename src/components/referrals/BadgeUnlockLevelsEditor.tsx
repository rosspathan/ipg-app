import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Shield, Star, Gem, Sparkles, Crown } from 'lucide-react';

interface BadgeConfig {
  id: string;
  badge_name: string;
  bsk_threshold: number;
  unlock_levels: number;
  bonus_bsk_holding: number;
  description?: string;
  is_active: boolean;
}

const badgeIcons: Record<string, any> = {
  'SILVER': Shield,
  'GOLD': Star,
  'PLATINUM': Gem,
  'DIAMOND': Sparkles,
  'VIP': Crown
};

export function BadgeUnlockLevelsEditor() {
  const [badges, setBadges] = useState<BadgeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badge_thresholds')
        .select('*')
        .order('bsk_threshold');
      
      if (error) throw error;
      setBadges((data || []) as BadgeConfig[]);
    } catch (error) {
      console.error('Error loading badges:', error);
      toast({
        title: "Error",
        description: "Failed to load badge thresholds",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBadge = (id: string, field: keyof BadgeConfig, value: any) => {
    setBadges(badges.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const saveBadges = async () => {
    setSaving(true);
    try {
      for (const badge of badges) {
        const { error } = await supabase
          .from('badge_thresholds')
          .update({
            bsk_threshold: badge.bsk_threshold,
            unlock_levels: badge.unlock_levels,
            bonus_bsk_holding: badge.bonus_bsk_holding,
            description: badge.description,
            is_active: badge.is_active
          })
          .eq('id', badge.id);
        
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Badge configurations updated successfully"
      });
      
      await loadBadges();
    } catch (error) {
      console.error('Error saving badges:', error);
      toast({
        title: "Error",
        description: "Failed to save badge configurations",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading badge configuration...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Badge Tier Unlock Levels</span>
          <Button onClick={saveBadges} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardTitle>
        <CardDescription>
          Configure BSK thresholds, unlock levels (1-50), and holding bonuses for each badge tier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Badge</TableHead>
              <TableHead>BSK Threshold</TableHead>
              <TableHead>Unlock Levels</TableHead>
              <TableHead>Holding Bonus</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {badges.map((badge) => {
              const Icon = badgeIcons[badge.badge_name] || Shield;
              return (
                <TableRow key={badge.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold">{badge.badge_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={badge.bsk_threshold}
                      onChange={(e) => updateBadge(badge.id, 'bsk_threshold', parseInt(e.target.value) || 0)}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      max="50"
                      value={badge.unlock_levels}
                      onChange={(e) => updateBadge(badge.id, 'unlock_levels', parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={badge.bonus_bsk_holding}
                      onChange={(e) => updateBadge(badge.id, 'bonus_bsk_holding', parseInt(e.target.value) || 0)}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={badge.description || ''}
                      onChange={(e) => updateBadge(badge.id, 'description', e.target.value)}
                      placeholder="Optional description"
                      className="w-64"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={badge.is_active}
                      onChange={(e) => updateBadge(badge.id, 'is_active', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Current Configuration Summary</h4>
          <ul className="space-y-1 text-sm">
            {badges.filter(b => b.is_active).map(b => (
              <li key={b.id}>
                <strong>{b.badge_name}:</strong> {b.bsk_threshold.toLocaleString()} BSK → 
                Unlocks L1-L{b.unlock_levels} ({b.unlock_levels} levels) + 
                {b.bonus_bsk_holding.toLocaleString()} BSK holding bonus
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
