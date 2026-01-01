/**
 * Place Order Edge Function
 * Phase 2.3: Added idempotency key support
 * Phase 2.4: Added atomic transaction handling
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract JWT token explicitly for proper auth
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
        auth: { persistSession: false }
      }
    );

    // Pass token explicitly to getUser
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[place-order] Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // PHASE 2.3: Check for idempotency key
    const idempotencyKey = req.headers.get('idempotency-key');
    
    if (idempotencyKey) {
      console.log('[place-order] Checking idempotency key:', idempotencyKey);
      
      const { data: existing } = await supabaseClient
        .from('idempotency_keys')
        .select('*')
        .eq('key', idempotencyKey)
        .eq('user_id', user.id)
        .eq('operation_type', 'order')
        .single();
      
      if (existing) {
        console.log('[place-order] Returning cached response for idempotency key');
        return new Response(
          JSON.stringify(existing.response_data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { symbol, side, type, quantity, price, trading_type, trading_mode } = await req.json();

    // Default to internal mode - on-chain mode should be explicitly requested
    const isOnchainMode = trading_mode === 'onchain';
    const FEE_PERCENT = 0.005; // 0.5% fee buffer for buy orders

    console.log('[place-order] Received order:', { user_id: user.id, symbol, side, type, quantity, price, trading_mode: isOnchainMode ? 'onchain' : 'internal' });

    // Validate inputs
    if (!symbol || !side || !type || !quantity || quantity <= 0) {
      throw new Error('Invalid order parameters');
    }

    if (type === 'limit' && (!price || price <= 0)) {
      throw new Error('Limit orders require a valid price');
    }

    // Parse symbol (e.g., "BTC/USDT" -> base: "BTC", quote: "USDT")
    const [base_symbol, quote_symbol] = symbol.split('/');
    if (!base_symbol || !quote_symbol) {
      throw new Error('Invalid symbol format. Expected: BASE/QUOTE');
    }

    // Calculate required balance WITH FEE BUFFER for buys
    const estimated_market_price = type === 'market' 
      ? (side === 'buy' ? price || 999999999 : price || 0.00000001) 
      : price!;
    const order_value = quantity * estimated_market_price;
    const required_asset = side === 'buy' ? quote_symbol : base_symbol;
    // Add 0.5% fee buffer for buy orders to ensure settlement works
    const required_amount = side === 'buy' ? order_value * (1 + FEE_PERCENT) : quantity;

    console.log('[place-order] Required:', { required_asset, required_amount, feeBuffer: side === 'buy' ? FEE_PERCENT : 0, skipBalanceCheck: isOnchainMode });

    // Balance validation - ALWAYS required for both modes
    if (isOnchainMode) {
      // ON-CHAIN MODE: Verify on-chain balance via BSC RPC
      console.log('[place-order] On-chain mode: Verifying on-chain balance');
      
      // 1. Get user's BSC wallet address
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('bsc_wallet_address')
        .eq('user_id', user.id)
        .single();
      
      if (profileError || !profile?.bsc_wallet_address) {
        console.error('[place-order] No wallet address:', profileError);
        throw new Error('No wallet connected. Please connect your wallet first.');
      }
      
      const walletAddress = profile.bsc_wallet_address;
      console.log('[place-order] User wallet:', walletAddress);
      
      // 2. Get asset details (contract address for ERC20 tokens)
      const { data: assetData, error: assetError } = await supabaseClient
        .from('assets')
        .select('id, contract_address, decimals, symbol')
        .eq('symbol', required_asset)
        .single();
      
      if (assetError || !assetData) {
        console.error('[place-order] Asset not found:', assetError);
        throw new Error(`Asset ${required_asset} not found`);
      }
      
      // 3. Fetch on-chain balance via BSC RPC
      let onchainBalance = 0;
      const RPC_URL = 'https://bsc-dataseed.binance.org';
      const decimals = assetData.decimals || 18;
      
      try {
        if (required_asset === 'BNB') {
          // Native BNB balance
          const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBalance',
              params: [walletAddress, 'latest'],
              id: 1
            })
          });
          const result = await response.json();
          if (result.result) {
            onchainBalance = parseInt(result.result, 16) / Math.pow(10, 18);
          }
        } else if (assetData.contract_address) {
          // ERC20 token balance
          const balanceOfSelector = '0x70a08231';
          const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, '0');
          const data = balanceOfSelector + paddedAddress;
          
          const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{ to: assetData.contract_address, data }, 'latest'],
              id: 1
            })
          });
          const result = await response.json();
          if (result.result && result.result !== '0x') {
            onchainBalance = parseInt(result.result, 16) / Math.pow(10, decimals);
          }
        } else {
          console.warn('[place-order] No contract address for asset:', required_asset);
          throw new Error(`Cannot verify on-chain balance for ${required_asset}`);
        }
      } catch (rpcError) {
        console.error('[place-order] RPC error:', rpcError);
        throw new Error('Failed to verify on-chain balance. Please try again.');
      }
      
      console.log('[place-order] On-chain balance:', { asset: required_asset, balance: onchainBalance, required: required_amount });
      
      // 4. Check for pending orders that would reduce available balance
      const { data: pendingOrders } = await supabaseClient
        .from('orders')
        .select('amount, price, side, symbol, status')
        .eq('user_id', user.id)
        .in('status', ['pending', 'partially_filled']);
      
      let totalPendingLocked = 0;
      if (pendingOrders && pendingOrders.length > 0) {
        totalPendingLocked = pendingOrders.reduce((sum, order) => {
          const [orderBase, orderQuote] = order.symbol.split('/');
          const orderAsset = order.side === 'buy' ? orderQuote : orderBase;
          if (orderAsset === required_asset) {
            const orderAmount = order.side === 'buy' 
              ? order.amount * (order.price || estimated_market_price)
              : order.amount;
            return sum + orderAmount;
          }
          return sum;
        }, 0);
      }
      
      console.log('[place-order] Pending locked:', { totalPendingLocked, availableAfterPending: onchainBalance - totalPendingLocked });
      
      // 5. Validate sufficient balance
      const availableBalance = onchainBalance - totalPendingLocked;
      if (availableBalance < required_amount) {
        const shortfall = required_amount - availableBalance;
        throw new Error(
          `Insufficient ${required_asset} balance. ` +
          `Available: ${availableBalance.toFixed(6)} ${required_asset}, ` +
          `Required: ${required_amount.toFixed(6)} ${required_asset}. ` +
          `Short by: ${shortfall.toFixed(6)} ${required_asset}`
        );
      }
      
      console.log('[place-order] On-chain balance verified successfully');
      
    } else {
      // INTERNAL MODE: Use wallet_balances table
      // PHASE 2.4: Atomic balance locking for limit orders
      if (type === 'limit') {
        const { data: lockSuccess, error: lockError } = await supabaseClient.rpc(
          'lock_balance_for_order',
          {
            p_user_id: user.id,
            p_asset_symbol: required_asset,
            p_amount: required_amount,
          }
        );

        if (lockError || !lockSuccess) {
          console.error('[place-order] Lock balance failed:', lockError);
          throw new Error('Insufficient balance or lock failed');
        }

        console.log('[place-order] Balance locked successfully');
      }

      // For market orders, validate balance
      if (type === 'market') {
        const { data: assetData } = await supabaseClient
          .from('assets')
          .select('id')
          .eq('symbol', required_asset)
          .single();

        if (!assetData) {
          throw new Error(`Asset ${required_asset} not found`);
        }

        const { data: balanceData } = await supabaseClient
          .from('wallet_balances')
          .select('available')
          .eq('user_id', user.id)
          .eq('asset_id', assetData.id)
          .single();

        if (!balanceData || balanceData.available < required_amount) {
          throw new Error('Insufficient balance');
        }
      }
    }

    // Insert order (use 'amount' column, not 'quantity')
    // Note: remaining_amount is a generated column, filled_amount has default 0
    const { data: order, error: insertError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        symbol,
        side,
        order_type: type,
        amount: quantity,
        price: price || null,
        status: 'pending',
        trading_type: trading_type || 'spot',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[place-order] Insert failed:', insertError);
      
      // Rollback: unlock balance if limit order insert failed (only for internal mode)
      if (type === 'limit' && !isOnchainMode) {
        await supabaseClient.rpc('unlock_balance_for_order', {
          p_user_id: user.id,
          p_asset_symbol: required_asset,
          p_amount: required_amount,
        });
      }
      
      throw new Error('Failed to create order');
    }

    console.log('[place-order] Order created:', order.id);

    // Trigger matching engine after order creation
    const matchingAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    try {
      // Check if auto-matching is enabled
      const { data: settings } = await matchingAdminClient
        .from('trading_engine_settings')
        .select('auto_matching_enabled, circuit_breaker_active')
        .single();
      
      if (settings?.auto_matching_enabled && !settings?.circuit_breaker_active) {
        console.log('[place-order] Triggering matching engine...');
        
        // Call match-orders function internally using service role
        const matchResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/match-orders`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({})
          }
        );
        
        if (matchResponse.ok) {
          const matchResult = await matchResponse.json();
          console.log('[place-order] Matching result:', matchResult);
        } else {
          console.warn('[place-order] Matching engine returned error');
        }
      }
    } catch (matchErr) {
      console.warn('[place-order] Matching engine call failed:', matchErr);
      // Don't fail the order - matching can happen asynchronously
    }

    const responseData = {
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.order_type,
        quantity: order.amount,
        price: order.price,
        status: order.status,
        created_at: order.created_at,
      },
    };

    // PHASE 2.3: Store idempotency key after successful operation
    if (idempotencyKey) {
      await supabaseClient.from('idempotency_keys').insert({
        key: idempotencyKey,
        user_id: user.id,
        operation_type: 'order',
        resource_id: order.id,
        response_data: responseData,
      }).catch(err => {
        // Non-fatal: log but don't fail the request
        console.warn('[place-order] Failed to store idempotency key:', err);
      });
    }
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[place-order] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
