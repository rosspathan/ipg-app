import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus, Calculator, Clock, Coins, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PurchaseBonusRule {
  id: string;
  name: string;
  purchase_asset_id?: string | null;
  purchase_asset_symbol: string;
  bonus_asset_symbol: string;
  min_purchase_amount: number;
  max_purchase_amount?: number | null;
  bonus_ratio: number;
  vesting_days: number;
  vesting_enabled: boolean;
  rounding_mode: 'floor' | 'round' | 'ceil';
  max_bonus_per_user?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  is_active: boolean;
  description?: string | null;
  terms?: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminPurchaseBonuses() {
  const [selectedRule, setSelectedRule] = useState<PurchaseBonusRule | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [calculatorAmount, setCalculatorAmount] = useState<string>('');
  const [calculatorRuleId, setCalculatorRuleId] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch bonus rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['purchase-bonus-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_bonus_rules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as PurchaseBonusRule[];
    },
  });

  // Create/Update rule mutation
  const saveRuleMutation = useMutation({
    mutationFn: async (rule: Partial<PurchaseBonusRule>) => {
      if (rule.id) {
        const { id, created_at, updated_at, ...updateData } = rule;
        const { error } = await supabase
          .from('purchase_bonus_rules')
          .update(updateData as any)
          .eq('id', rule.id);
        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...insertData } = rule;
        const { error } = await supabase
          .from('purchase_bonus_rules')
          .insert(insertData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-bonus-rules'] });
      setIsRuleDialogOpen(false);
      setSelectedRule(null);
      toast.success(selectedRule?.id ? 'Rule updated successfully' : 'Rule created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to save rule: ${error.message}`);
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchase_bonus_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-bonus-rules'] });
      toast.success('Rule deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;
    saveRuleMutation.mutate(selectedRule);
  };

  const calculateBonus = (amount: number, rule: PurchaseBonusRule) => {
    if (amount < rule.min_purchase_amount) return 0;
    
    const rawBonus = amount * rule.bonus_ratio;
    let bonus = rawBonus;
    
    switch (rule.rounding_mode) {
      case 'floor':
        bonus = Math.floor(rawBonus);
        break;
      case 'ceil':
        bonus = Math.ceil(rawBonus);
        break;
      case 'round':
        bonus = Math.round(rawBonus);
        break;
    }
    
    if (rule.max_bonus_per_user && rule.max_bonus_per_user > 0) {
      bonus = Math.min(bonus, rule.max_bonus_per_user);
    }
    
    return bonus;
  };

  const selectedCalcRule = rules.find(r => r.id === calculatorRuleId);
  const calculatedBonus = selectedCalcRule && calculatorAmount 
    ? calculateBonus(parseFloat(calculatorAmount), selectedCalcRule)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Bonuses</h1>
          <p className="text-muted-foreground mt-1">
            Manage one-time purchase bonus campaigns with vesting periods
          </p>
        </div>
        <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setSelectedRule({
                  id: '',
                  name: '',
                  purchase_asset_symbol: 'IPG',
                  bonus_asset_symbol: 'BSK',
                  min_purchase_amount: 1000,
                  max_purchase_amount: 100000,
                  bonus_ratio: 1,
                  vesting_days: 100,
                  vesting_enabled: true,
                  rounding_mode: 'floor',
                  is_active: true,
                  created_at: '',
                  updated_at: '',
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedRule?.id ? 'Edit Bonus Rule' : 'Create Bonus Rule'}
              </DialogTitle>
            </DialogHeader>
            {selectedRule && (
              <form onSubmit={handleSaveRule} className="space-y-4">
                <div>
                  <Label htmlFor="name">Rule Name</Label>
                  <Input
                    id="name"
                    value={selectedRule.name}
                    onChange={(e) => setSelectedRule({ ...selectedRule, name: e.target.value })}
                    placeholder="e.g., IPG to BSK 1:1 Bonus"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchase_symbol">Purchase Asset Symbol</Label>
                    <Input
                      id="purchase_symbol"
                      value={selectedRule.purchase_asset_symbol}
                      onChange={(e) => setSelectedRule({ ...selectedRule, purchase_asset_symbol: e.target.value })}
                      placeholder="e.g., IPG, USDT, BTC"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bonus_symbol">Bonus Asset Symbol</Label>
                    <Input
                      id="bonus_symbol"
                      value={selectedRule.bonus_asset_symbol}
                      onChange={(e) => setSelectedRule({ ...selectedRule, bonus_asset_symbol: e.target.value })}
                      placeholder="e.g., BSK"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="min_purchase">Min Purchase Amount</Label>
                    <Input
                      id="min_purchase"
                      type="number"
                      step="0.01"
                      value={selectedRule.min_purchase_amount}
                      onChange={(e) => setSelectedRule({ ...selectedRule, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_purchase">Max Purchase Amount</Label>
                    <Input
                      id="max_purchase"
                      type="number"
                      step="0.01"
                      value={selectedRule.max_purchase_amount || ''}
                      onChange={(e) => setSelectedRule({ ...selectedRule, max_purchase_amount: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_bonus_user">Max Bonus Per User</Label>
                    <Input
                      id="max_bonus_user"
                      type="number"
                      step="0.01"
                      value={selectedRule.max_bonus_per_user || ''}
                      onChange={(e) => setSelectedRule({ ...selectedRule, max_bonus_per_user: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bonus_ratio">Bonus Ratio</Label>
                    <Input
                      id="bonus_ratio"
                      type="number"
                      step="0.000001"
                      value={selectedRule.bonus_ratio}
                      onChange={(e) => setSelectedRule({ ...selectedRule, bonus_ratio: parseFloat(e.target.value) || 0 })}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Bonus tokens per 1 purchase token (e.g., 1 = 1:1, 0.1 = 10:1)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="rounding">Rounding Mode</Label>
                    <Select
                      value={selectedRule.rounding_mode}
                      onValueChange={(value: 'floor' | 'round' | 'ceil') => 
                        setSelectedRule({ ...selectedRule, rounding_mode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="floor">Floor</SelectItem>
                        <SelectItem value="round">Round</SelectItem>
                        <SelectItem value="ceil">Ceil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vesting_days">Vesting Days</Label>
                    <Input
                      id="vesting_days"
                      type="number"
                      value={selectedRule.vesting_days}
                      onChange={(e) => setSelectedRule({ ...selectedRule, vesting_days: parseInt(e.target.value) || 0 })}
                      disabled={!selectedRule.vesting_enabled}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="vesting_enabled"
                    checked={selectedRule.vesting_enabled}
                    onCheckedChange={(checked) => setSelectedRule({ ...selectedRule, vesting_enabled: checked })}
                  />
                  <Label htmlFor="vesting_enabled">Enable Vesting (distribute over days)</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_at">Start Date (Optional)</Label>
                    <Input
                      id="start_at"
                      type="datetime-local"
                      value={selectedRule.start_at ? new Date(selectedRule.start_at).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setSelectedRule({ ...selectedRule, start_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_at">End Date (Optional)</Label>
                    <Input
                      id="end_at"
                      type="datetime-local"
                      value={selectedRule.end_at ? new Date(selectedRule.end_at).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setSelectedRule({ ...selectedRule, end_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={selectedRule.description || ''}
                    onChange={(e) => setSelectedRule({ ...selectedRule, description: e.target.value })}
                    placeholder="Describe this bonus campaign"
                  />
                </div>

                <div>
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    value={selectedRule.terms || ''}
                    onChange={(e) => setSelectedRule({ ...selectedRule, terms: e.target.value })}
                    placeholder="Terms and conditions for this bonus"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={selectedRule.is_active}
                    onCheckedChange={(checked) => setSelectedRule({ ...selectedRule, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveRuleMutation.isPending}>
                    {saveRuleMutation.isPending ? 'Saving...' : 'Save Rule'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Bonus Rules</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Purchase Bonus Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
              ) : rules.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No bonus rules found. Create your first rule to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{rule.name}</h3>
                            <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">
                            {rule.purchase_asset_symbol} → {rule.bonus_asset_symbol}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRule(rule);
                              setIsRuleDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this rule?')) {
                                deleteRuleMutation.mutate(rule.id);
                              }
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Bonus Ratio</p>
                            <p className="font-semibold">
                              {rule.bonus_ratio} {rule.bonus_asset_symbol} per 1 {rule.purchase_asset_symbol}
                            </p>
                            <p className="text-xs text-muted-foreground">{rule.rounding_mode} rounding</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Coins className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Purchase Range</p>
                            <p className="font-semibold">
                              {rule.min_purchase_amount.toLocaleString()} - {rule.max_purchase_amount?.toLocaleString() || '∞'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-purple-500 mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Vesting</p>
                            <p className="font-semibold">
                              {rule.vesting_enabled ? `${rule.vesting_days} days` : 'Instant'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Coins className="w-4 h-4 text-orange-500 mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Max Per User</p>
                            <p className="font-semibold">
                              {rule.max_bonus_per_user?.toLocaleString() || 'Unlimited'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {rule.description && (
                        <p className="text-sm text-muted-foreground border-t pt-3">
                          {rule.description}
                        </p>
                      )}

                      {(rule.start_at || rule.end_at) && (
                        <div className="text-xs text-muted-foreground border-t pt-3">
                          {rule.start_at && <span>From: {format(new Date(rule.start_at), 'MMM dd, yyyy HH:mm')}</span>}
                          {rule.start_at && rule.end_at && <span className="mx-2">•</span>}
                          {rule.end_at && <span>To: {format(new Date(rule.end_at), 'MMM dd, yyyy HH:mm')}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Bonus Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="calc_rule">Select Rule</Label>
                <Select value={calculatorRuleId} onValueChange={setCalculatorRuleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bonus rule" />
                  </SelectTrigger>
                  <SelectContent>
                    {rules.filter(r => r.is_active).map((rule) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="calc_amount">Purchase Amount</Label>
                <Input
                  id="calc_amount"
                  type="number"
                  step="0.01"
                  value={calculatorAmount}
                  onChange={(e) => setCalculatorAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              {selectedCalcRule && calculatorAmount && (
                <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Purchase Amount:</span>
                    <span className="font-semibold">
                      {parseFloat(calculatorAmount).toLocaleString()} {selectedCalcRule.purchase_asset_symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bonus Amount:</span>
                    <span className="font-semibold text-success text-lg">
                      {calculatedBonus.toLocaleString()} {selectedCalcRule.bonus_asset_symbol}
                    </span>
                  </div>
                  {selectedCalcRule.vesting_enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Vesting Period:</span>
                        <span className="font-medium">{selectedCalcRule.vesting_days} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Daily Release:</span>
                        <span className="font-medium">
                          {(calculatedBonus / selectedCalcRule.vesting_days).toFixed(4)} {selectedCalcRule.bonus_asset_symbol}/day
                        </span>
                      </div>
                    </>
                  )}
                  {!selectedCalcRule.vesting_enabled && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Distribution:</span>
                      <span className="font-medium text-success">Instant</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
