import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderFillEvent {
  orderId: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  filledAmount: number;
  timestamp: string;
}

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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { orderFill }: { orderFill: OrderFillEvent } = await req.json();
    
    console.log('Processing order fill for purchase bonus:', orderFill);

    // Only process BUY orders
    if (orderFill.side !== 'buy') {
      return new Response(
        JSON.stringify({ message: 'Only buy orders are eligible for purchase bonuses' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract base symbol from trading pair (e.g., 'IPGUSDT' -> 'IPG')
    const baseSymbol = orderFill.symbol.replace('USDT', '').replace('BTC', '').replace('ETH', '');
    
    console.log('Looking for bonus rules for base symbol:', baseSymbol);

    // Find active bonus rules for this base symbol
    const now = new Date().toISOString();
    const { data: rules, error: rulesError } = await supabaseClient
      .from('purchase_bonus_rules')
      .select('*')
      .eq('base_symbol', baseSymbol)
      .eq('is_active', true)
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gte.${now}`);

    if (rulesError) {
      console.error('Error fetching bonus rules:', rulesError);
      throw rulesError;
    }

    if (!rules || rules.length === 0) {
      console.log('No active bonus rules found for', baseSymbol);
      return new Response(
        JSON.stringify({ message: 'No active bonus rules for this symbol' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Process each applicable rule
    for (const rule of rules as PurchaseBonusRule[]) {
      console.log('Processing rule:', rule.id, 'for', rule.base_symbol, '->', rule.bonus_symbol);

      // Check minimum fill amount
      if (orderFill.filledAmount < rule.min_fill_amount) {
        console.log('Fill amount', orderFill.filledAmount, 'below minimum', rule.min_fill_amount);
        continue;
      }

      // Get user's subscription tier multiplier (default to 1.0)
      let tierMultiplier = 1.0;
      if (rule.subscriber_tier_multipliers) {
        // This would need to be implemented based on your subscription system
        // For now, we'll use the default multiplier
      }

      // Calculate raw bonus amount
      const rawBonus = (orderFill.filledAmount / rule.ratio_base_per_bonus) * tierMultiplier;
      
      // Apply rounding mode
      let bonusAmount: number;
      switch (rule.rounding_mode) {
        case 'floor':
          bonusAmount = Math.floor(rawBonus);
          break;
        case 'ceil':
          bonusAmount = Math.ceil(rawBonus);
          break;
        case 'round':
          bonusAmount = Math.round(rawBonus);
          break;
        default:
          bonusAmount = Math.floor(rawBonus);
      }

      // Apply per-order limit
      if (rule.max_bonus_per_order > 0) {
        bonusAmount = Math.min(bonusAmount, rule.max_bonus_per_order);
      }

      if (bonusAmount <= 0) {
        console.log('Calculated bonus amount is 0, skipping');
        continue;
      }

      // Check daily limit
      if (rule.max_bonus_per_day_user > 0) {
        const today = new Date().toISOString().split('T')[0];
        const { data: todayEvents } = await supabaseClient
          .from('purchase_bonus_events')
          .select('bonus_amount')
          .eq('user_id', orderFill.userId)
          .eq('bonus_symbol', rule.bonus_symbol)
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`)
          .eq('status', 'granted');

        const todayTotal = todayEvents?.reduce((sum, event) => sum + event.bonus_amount, 0) || 0;
        
        if (todayTotal + bonusAmount > rule.max_bonus_per_day_user) {
          console.log('Daily limit would be exceeded:', todayTotal + bonusAmount, '>', rule.max_bonus_per_day_user);
          bonusAmount = Math.max(0, rule.max_bonus_per_day_user - todayTotal);
          if (bonusAmount <= 0) continue;
        }
      }

      console.log('Awarding bonus:', bonusAmount, rule.bonus_symbol);

      // Create bonus event record
      const { data: eventData, error: eventError } = await supabaseClient
        .from('purchase_bonus_events')
        .insert({
          user_id: orderFill.userId,
          order_id: orderFill.orderId,
          rule_id: rule.id,
          base_symbol: baseSymbol,
          base_filled: orderFill.filledAmount,
          bonus_symbol: rule.bonus_symbol,
          bonus_amount: bonusAmount,
          status: 'granted'
        })
        .select()
        .single();

      if (eventError) {
        console.error('Error creating bonus event:', eventError);
        throw eventError;
      }

      // Get or create bonus asset
      let { data: bonusAsset } = await supabaseClient
        .from('bonus_assets')
        .select('id')
        .eq('symbol', rule.bonus_symbol)
        .single();

      if (!bonusAsset) {
        console.log('Creating bonus asset for', rule.bonus_symbol);
        const { data: newAsset, error: assetError } = await supabaseClient
          .from('bonus_assets')
          .insert({
            symbol: rule.bonus_symbol,
            name: `${rule.bonus_symbol} Bonus Token`,
            network: 'OFFCHAIN',
            status: 'active'
          })
          .select()
          .single();

        if (assetError) {
          console.error('Error creating bonus asset:', assetError);
          throw assetError;
        }
        
        bonusAsset = newAsset;
      }

      // Update user's bonus balance
      const { error: balanceError } = await supabaseClient
        .from('wallet_bonus_balances')
        .upsert({
          user_id: orderFill.userId,
          asset_id: bonusAsset.id,
          balance: bonusAmount
        }, {
          onConflict: 'user_id,asset_id',
          ignoreDuplicates: false
        });

      if (balanceError) {
        console.error('Error updating bonus balance:', balanceError);
        // Note: We don't throw here as the event was already recorded
      }

      // Create bonus ledger entry
      const { error: ledgerError } = await supabaseClient
        .from('bonus_ledger')
        .insert({
          user_id: orderFill.userId,
          amount_bsk: bonusAmount,
          type: 'purchase_bonus',
          asset: rule.bonus_symbol,
          meta_json: {
            source: 'purchase_bonus',
            rule_id: rule.id,
            order_id: orderFill.orderId,
            base_symbol: baseSymbol,
            base_filled: orderFill.filledAmount,
            trading_pair: orderFill.symbol
          }
        });

      if (ledgerError) {
        console.error('Error creating ledger entry:', ledgerError);
        // Note: We don't throw here as the event and balance were already recorded
      }

      results.push({
        rule_id: rule.id,
        bonus_symbol: rule.bonus_symbol,
        bonus_amount: bonusAmount,
        event_id: eventData.id
      });

      console.log('Successfully processed bonus for rule', rule.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.length} bonus awards`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in purchase-bonus-handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});