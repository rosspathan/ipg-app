import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2 } from 'lucide-react';

interface LevelConfig {
  id?: string;
  level: number;
  bsk_reward: number;
  balance_type: 'withdrawable' | 'holding';
  is_active: boolean;
}

export function Admin50LevelEditor() {
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('team_income_levels')
        .select('*')
        .order('level');
      
      if (error) throw error;
      
      // Fill missing levels 1-50
      const existingLevels = new Set((data || []).map(l => l.level));
      const allLevels: LevelConfig[] = [];
      
      for (let i = 1; i <= 50; i++) {
        const existing = data?.find(l => l.level === i);
        if (existing) {
          allLevels.push(existing as LevelConfig);
        } else {
          allLevels.push({
            level: i,
            bsk_reward: 0,
            balance_type: 'holding',
            is_active: false
          });
        }
      }
      
      setLevels(allLevels);
    } catch (error) {
      console.error('Error loading levels:', error);
      toast({
        title: "Error",
        description: "Failed to load team income levels",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLevel = (level: number, field: keyof LevelConfig, value: any) => {
    setLevels(levels.map(l => 
      l.level === level ? { ...l, [field]: value } : l
    ));
  };

  const saveAllLevels = async () => {
    setSaving(true);
    try {
      // Delete existing levels
      await supabase.from('team_income_levels').delete().neq('level', 0);
      
      // Insert all levels
      const { error } = await supabase
        .from('team_income_levels')
        .insert(levels.map(l => ({
          level: l.level,
          bsk_reward: l.bsk_reward,
          balance_type: l.balance_type,
          is_active: l.is_active
        })));
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "50 level rewards updated successfully"
      });
      
      await loadLevels();
    } catch (error) {
      console.error('Error saving levels:', error);
      toast({
        title: "Error",
        description: "Failed to save levels",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const quickSetRange = (start: number, end: number, reward: number, type: 'withdrawable' | 'holding') => {
    setLevels(levels.map(l => {
      if (l.level >= start && l.level <= end) {
        return { ...l, bsk_reward: reward, balance_type: type, is_active: true };
      }
      return l;
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading levels...</div>;
  }

  const activeLevels = levels.filter(l => l.is_active);
  const totalRewardsPotential = levels.reduce((sum, l) => sum + l.bsk_reward, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>50-Level Team Income Configuration</span>
          <Button onClick={saveAllLevels} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Levels'}
          </Button>
        </CardTitle>
        <CardDescription>
          Configure BSK rewards for each of the 50 referral levels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Set Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <Label className="text-xs text-muted-foreground">Quick Set</Label>
            <div className="space-y-2 mt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickSetRange(1, 10, 10, 'withdrawable')}
                className="w-full"
              >
                L1-L10: 10 BSK (W)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickSetRange(11, 30, 5, 'holding')}
                className="w-full"
              >
                L11-L30: 5 BSK (H)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickSetRange(31, 50, 2, 'holding')}
                className="w-full"
              >
                L31-L50: 2 BSK (H)
              </Button>
            </div>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Statistics</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="p-3 bg-background rounded border">
                <p className="text-xs text-muted-foreground">Active Levels</p>
                <p className="text-2xl font-bold">{activeLevels.length} / 50</p>
              </div>
              <div className="p-3 bg-background rounded border">
                <p className="text-xs text-muted-foreground">Total Potential Rewards</p>
                <p className="text-2xl font-bold">{totalRewardsPotential} BSK</p>
              </div>
            </div>
          </div>
        </div>

        {/* Levels Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Level</TableHead>
                <TableHead>BSK Reward</TableHead>
                <TableHead>Balance Type</TableHead>
                <TableHead className="w-24">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.map((level) => (
                <TableRow key={level.level} className={!level.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-mono font-bold">L{level.level}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={level.bsk_reward}
                      onChange={(e) => updateLevel(level.level, 'bsk_reward', parseFloat(e.target.value) || 0)}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={level.balance_type}
                      onValueChange={(value) => updateLevel(level.level, 'balance_type', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="withdrawable">Withdrawable</SelectItem>
                        <SelectItem value="holding">Holding</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={level.is_active}
                      onChange={(e) => updateLevel(level.level, 'is_active', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveAllLevels} disabled={saving} size="lg">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save All 50 Levels'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
