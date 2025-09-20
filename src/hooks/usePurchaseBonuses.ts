import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PurchaseBonusRule {
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

export interface PurchaseBonusEvent {
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

export function usePurchaseBonusRules() {
  return useQuery({
    queryKey: ['purchase-bonus-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_bonus_rules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PurchaseBonusRule[];
    },
  });
}

export function useActiveBonusRule(baseSymbol: string) {
  return useQuery({
    queryKey: ['active-bonus-rule', baseSymbol],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('purchase_bonus_rules')
        .select('*')
        .eq('base_symbol', baseSymbol)
        .eq('is_active', true)
        .or(`start_at.is.null,start_at.lte.${now}`)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data ? {
        ...data,
        rounding_mode: data.rounding_mode as 'floor' | 'round' | 'ceil'
      } as PurchaseBonusRule : null;
    },
    enabled: !!baseSymbol,
  });
}

export function usePurchaseBonusEvents(userId?: string) {
  return useQuery({
    queryKey: ['purchase-bonus-events', userId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_bonus_events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      return data as PurchaseBonusEvent[];
    },
    enabled: !!userId,
  });
}

export function calculateBonusAmount(
  baseAmount: number, 
  rule: PurchaseBonusRule, 
  tierMultiplier: number = 1.0
): number {
  if (!rule || baseAmount < rule.min_fill_amount) return 0;
  
  const rawBonus = (baseAmount / rule.ratio_base_per_bonus) * tierMultiplier;
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
  
  return Math.max(0, bonus);
}

export function useTriggerBonusCalculation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      orderId, 
      baseSymbol, 
      baseFilled 
    }: { 
      userId: string; 
      orderId: string; 
      baseSymbol: string; 
      baseFilled: number; 
    }) => {
      // This would typically be done by an edge function on order fills
      // For now, we'll simulate the bonus calculation
      
      // Get active rule for this base symbol
      const now = new Date().toISOString();
      const { data: rule, error: ruleError } = await supabase
        .from('purchase_bonus_rules')
        .select('*')
        .eq('base_symbol', baseSymbol)
        .eq('is_active', true)
        .or(`start_at.is.null,start_at.lte.${now}`)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .limit(1)
        .single();
      
      if (ruleError || !rule) return null;
      
      // Calculate bonus amount
      const bonusAmount = calculateBonusAmount(baseFilled, {
        ...rule,
        rounding_mode: rule.rounding_mode as 'floor' | 'round' | 'ceil'
      } as PurchaseBonusRule);
      
      if (bonusAmount <= 0) return null;
      
      // Check daily limits if applicable
      if (rule.max_bonus_per_day_user > 0) {
        const today = new Date().toISOString().split('T')[0];
        const { data: todayEvents } = await supabase
          .from('purchase_bonus_events')
          .select('bonus_amount')
          .eq('user_id', userId)
          .eq('bonus_symbol', rule.bonus_symbol)
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`);
        
        const todayTotal = todayEvents?.reduce((sum, event) => sum + event.bonus_amount, 0) || 0;
        
        if (todayTotal + bonusAmount > rule.max_bonus_per_day_user) {
          return null; // Would exceed daily limit
        }
      }
      
      // Create bonus event
      const { data: eventData, error: eventError } = await supabase
        .from('purchase_bonus_events')
        .insert({
          user_id: userId,
          order_id: orderId,
          rule_id: rule.id,
          base_symbol: baseSymbol,
          base_filled: baseFilled,
          bonus_symbol: rule.bonus_symbol,
          bonus_amount: bonusAmount,
          status: 'granted'
        })
        .select()
        .single();
      
      if (eventError) throw eventError;
      
      // Update bonus balance
      const { error: balanceError } = await supabase
        .from('wallet_bonus_balances')
        .upsert({
          user_id: userId,
          asset_id: rule.bonus_symbol, // This should be the actual asset ID
          balance: bonusAmount
        }, {
          onConflict: 'user_id,asset_id',
          ignoreDuplicates: false
        });
      
      if (balanceError) throw balanceError;
      
      // Create ledger entry
      const { error: ledgerError } = await supabase
        .from('bonus_ledger')
        .insert({
          user_id: userId,
          amount_bsk: bonusAmount,
          type: 'purchase_bonus',
          asset: rule.bonus_symbol,
          meta_json: {
            source: 'purchase_bonus',
            rule_id: rule.id,
            order_id: orderId,
            base_symbol: baseSymbol,
            base_filled: baseFilled
          }
        });
      
      if (ledgerError) throw ledgerError;
      
      return eventData;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['purchase-bonus-events'] });
        queryClient.invalidateQueries({ queryKey: ['wallet-bonus-balances'] });
        queryClient.invalidateQueries({ queryKey: ['bonus-ledger'] });
        
        toast.success(`+${data.bonus_amount} ${data.bonus_symbol} bonus awarded!`);
      }
    },
    onError: (error: any) => {
      console.error('Bonus calculation error:', error);
      toast.error('Failed to calculate purchase bonus');
    },
  });
}