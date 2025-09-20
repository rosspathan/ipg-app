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
import { Trash2, Edit, Plus, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PurchaseBonusRule {
  id: string;
  base_symbol: string;
  bonus_symbol: string;
  ratio_base_per_bonus: number;
  min_fill_amount: number;
  rounding_mode: 'floor' | 'round' | 'ceil';
  max_bonus_per_order: number;
  max_bonus_per_day_user: number;
  start_at?: string;
  end_at?: string;
  is_active: boolean;
  subscriber_tier_multipliers?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseBonusEvent {
  id: string;
  user_id: string;
  order_id?: string;
  rule_id?: string;
  base_symbol: string;
  base_filled: number;
  bonus_symbol: string;
  bonus_amount: number;
  status: 'granted' | 'reversed';
  created_at: string;
}

export default function AdminPurchaseBonuses() {
  const [selectedRule, setSelectedRule] = useState<PurchaseBonusRule | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [calculatorAmount, setCalculatorAmount] = useState<string>('');
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
      return data as PurchaseBonusRule[];
    },
  });

  // Fetch bonus events for reporting
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['purchase-bonus-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_bonus_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as PurchaseBonusEvent[];
    },
  });

  // Create/Update rule mutation
  const saveRuleMutation = useMutation({
    mutationFn: async (rule: Partial<PurchaseBonusRule>) => {
      if (rule.id) {
        const { id, created_at, updated_at, ...updateData } = rule;
        const { error } = await supabase
          .from('purchase_bonus_rules')
          .update(updateData)
          .eq('id', rule.id);
        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...insertData } = rule;
        if (!insertData.base_symbol || !insertData.ratio_base_per_bonus) {
          throw new Error('Base symbol and ratio are required');
        }
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
      toast.success(selectedRule ? 'Rule updated successfully' : 'Rule created successfully');
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

  // Toggle rule active status
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('purchase_bonus_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-bonus-rules'] });
      toast.success('Rule status updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update rule status: ${error.message}`);
    },
  });

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;

    saveRuleMutation.mutate({
      ...selectedRule,
      ratio_base_per_bonus: Number(selectedRule.ratio_base_per_bonus),
      min_fill_amount: Number(selectedRule.min_fill_amount),
      max_bonus_per_order: Number(selectedRule.max_bonus_per_order),
      max_bonus_per_day_user: Number(selectedRule.max_bonus_per_day_user),
    });
  };

  const calculateBonus = (amount: number, rule: PurchaseBonusRule) => {
    if (amount < rule.min_fill_amount) return 0;
    
    const rawBonus = amount / rule.ratio_base_per_bonus;
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
    
    if (rule.max_bonus_per_order > 0) {
      bonus = Math.min(bonus, rule.max_bonus_per_order);
    }
    
    return bonus;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Bonuses</h1>
        <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setSelectedRule({
                  id: '',
                  base_symbol: '',
                  bonus_symbol: 'BSK',
                  ratio_base_per_bonus: 1000,
                  min_fill_amount: 0,
                  rounding_mode: 'floor',
                  max_bonus_per_order: 0,
                  max_bonus_per_day_user: 0,
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedRule?.id ? 'Edit Bonus Rule' : 'Create Bonus Rule'}
              </DialogTitle>
            </DialogHeader>
            {selectedRule && (
              <form onSubmit={handleSaveRule} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="base_symbol">Base Symbol (Buy Coin)</Label>
                    <Input
                      id="base_symbol"
                      value={selectedRule.base_symbol}
                      onChange={(e) => setSelectedRule({ ...selectedRule, base_symbol: e.target.value })}
                      placeholder="e.g., IPG"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bonus_symbol">Bonus Symbol (Reward Coin)</Label>
                    <Input
                      id="bonus_symbol"
                      value={selectedRule.bonus_symbol}
                      onChange={(e) => setSelectedRule({ ...selectedRule, bonus_symbol: e.target.value })}
                      placeholder="e.g., BSK"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ratio">Base Units per 1 Bonus</Label>
                    <Input
                      id="ratio"
                      type="number"
                      value={selectedRule.ratio_base_per_bonus}
                      onChange={(e) => setSelectedRule({ ...selectedRule, ratio_base_per_bonus: Number(e.target.value) })}
                      placeholder="1000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_fill">Min Fill Amount</Label>
                    <Input
                      id="min_fill"
                      type="number"
                      value={selectedRule.min_fill_amount}
                      onChange={(e) => setSelectedRule({ ...selectedRule, min_fill_amount: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                    <Label htmlFor="max_per_order">Max Bonus Per Order (0=unlimited)</Label>
                    <Input
                      id="max_per_order"
                      type="number"
                      value={selectedRule.max_bonus_per_order}
                      onChange={(e) => setSelectedRule({ ...selectedRule, max_bonus_per_order: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_per_day">Max Bonus Per Day (0=unlimited)</Label>
                    <Input
                      id="max_per_day"
                      type="number"
                      value={selectedRule.max_bonus_per_day_user}
                      onChange={(e) => setSelectedRule({ ...selectedRule, max_bonus_per_day_user: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_at">Start Date (Optional)</Label>
                    <Input
                      id="start_at"
                      type="datetime-local"
                      value={selectedRule.start_at ? selectedRule.start_at.slice(0, 16) : ''}
                      onChange={(e) => setSelectedRule({ ...selectedRule, start_at: e.target.value ? `${e.target.value}:00.000Z` : undefined })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_at">End Date (Optional)</Label>
                    <Input
                      id="end_at"
                      type="datetime-local"
                      value={selectedRule.end_at ? selectedRule.end_at.slice(0, 16) : ''}
                      onChange={(e) => setSelectedRule({ ...selectedRule, end_at: e.target.value ? `${e.target.value}:00.000Z` : undefined })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={selectedRule.notes || ''}
                    onChange={(e) => setSelectedRule({ ...selectedRule, notes: e.target.value })}
                    placeholder="Optional notes about this rule"
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

                <div className="flex justify-end space-x-2">
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
          <TabsTrigger value="events">Event History</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Bonus Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div>Loading rules...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Base → Bonus</TableHead>
                      <TableHead>Ratio</TableHead>
                      <TableHead>Limits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div className="font-medium">
                            {rule.base_symbol} → {rule.bonus_symbol}
                          </div>
                          {rule.notes && (
                            <div className="text-sm text-muted-foreground">{rule.notes}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            1 {rule.bonus_symbol} per {rule.ratio_base_per_bonus} {rule.base_symbol}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {rule.rounding_mode} rounding
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            {rule.min_fill_amount > 0 && (
                              <div>Min: {rule.min_fill_amount}</div>
                            )}
                            {rule.max_bonus_per_order > 0 && (
                              <div>Max/order: {rule.max_bonus_per_order}</div>
                            )}
                            {rule.max_bonus_per_day_user > 0 && (
                              <div>Max/day: {rule.max_bonus_per_day_user}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {rule.start_at && (
                              <div>From: {format(new Date(rule.start_at), 'MMM dd, yyyy')}</div>
                            )}
                            {rule.end_at && (
                              <div>To: {format(new Date(rule.end_at), 'MMM dd, yyyy')}</div>
                            )}
                            {!rule.start_at && !rule.end_at && (
                              <div className="text-muted-foreground">Always active</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRule(rule);
                                setIsRuleDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRuleMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                            >
                              <Switch checked={rule.is_active} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bonus Events</CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div>Loading events...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Base Purchase</TableHead>
                      <TableHead>Bonus Awarded</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {event.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {event.base_filled} {event.base_symbol}
                        </TableCell>
                        <TableCell>
                          {event.bonus_amount} {event.bonus_symbol}
                        </TableCell>
                        <TableCell>
                          <Badge variant={event.status === 'granted' ? 'default' : 'destructive'}>
                            {event.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle>Bonus Calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="calc_amount">Purchase Amount</Label>
                  <Input
                    id="calc_amount"
                    type="number"
                    value={calculatorAmount}
                    onChange={(e) => setCalculatorAmount(e.target.value)}
                    placeholder="Enter amount to calculate bonus"
                  />
                </div>
                
                {calculatorAmount && Number(calculatorAmount) > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Bonus Calculations:</h4>
                    {rules
                      .filter(rule => rule.is_active)
                      .map((rule) => {
                        const amount = Number(calculatorAmount);
                        const bonus = calculateBonus(amount, rule);
                        return (
                          <div key={rule.id} className="p-3 border rounded-lg">
                            <div className="font-medium">
                              {rule.base_symbol} → {rule.bonus_symbol}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Buy {amount} {rule.base_symbol} → Get {bonus} {rule.bonus_symbol}
                            </div>
                            {amount < rule.min_fill_amount && (
                              <div className="text-xs text-destructive">
                                Below minimum fill amount ({rule.min_fill_amount})
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}