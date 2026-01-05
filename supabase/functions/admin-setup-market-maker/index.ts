/**
 * Admin Setup Market Maker
 * Creates or configures the market maker user and enables the system.
 * Requires admin role.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MARKET_MAKER_EMAIL = 'market-maker@system.internal';
const MARKET_MAKER_PASSWORD = 'MarketMaker2024!SecurePassword';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error('[Admin MM Setup] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('[Admin MM Setup] Not admin:', caller.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Admin MM Setup] Admin verified:', caller.id);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { action = 'setup', spreadPercent = 1.0, depthLevels = 3, orderSize = 100 } = body;

    if (action === 'disable') {
      // Disable market maker
      const { error: disableError } = await supabaseAdmin
        .from('trading_engine_settings')
        .update({ market_maker_enabled: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (disableError) {
        console.error('[Admin MM Setup] Disable error:', disableError);
        throw disableError;
      }

      // Cancel all market maker orders and unlock funds
      await unlockAndCancelMmOrders(supabaseAdmin);

      return new Response(
        JSON.stringify({ success: true, message: 'Market maker disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Find or create market maker user
    let marketMakerUserId: string;
    
    // Check if user exists by email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[Admin MM Setup] Error listing users:', listError);
      throw listError;
    }

    const existingMmUser = existingUsers.users.find(u => u.email === MARKET_MAKER_EMAIL);

    if (existingMmUser) {
      marketMakerUserId = existingMmUser.id;
      console.log('[Admin MM Setup] Found existing MM user:', marketMakerUserId);
    } else {
      // Create new market maker user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: MARKET_MAKER_EMAIL,
        password: MARKET_MAKER_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Market Maker Bot',
          is_system: true
        },
        app_metadata: {
          provider: 'email',
          providers: ['email'],
          is_system_account: true
        }
      });

      if (createError) {
        console.error('[Admin MM Setup] Error creating user:', createError);
        throw createError;
      }

      marketMakerUserId = newUser.user.id;
      console.log('[Admin MM Setup] Created MM user:', marketMakerUserId);
    }

    // Step 2: Ensure profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', marketMakerUserId)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: marketMakerUserId,
          email: MARKET_MAKER_EMAIL,
          username: 'market_maker_bot',
          full_name: 'Market Maker Bot',
          display_name: 'Market Maker Bot',
          referral_code: 'MMBOT001',
          account_status: 'active'
        });

      if (profileError) {
        console.error('[Admin MM Setup] Profile creation error:', profileError);
        // Profile might be created by trigger, that's OK
      }
    } else {
      // Update profile to ensure it's active
      await supabaseAdmin
        .from('profiles')
        .update({ 
          display_name: 'Market Maker Bot',
          account_status: 'active'
        })
        .eq('user_id', marketMakerUserId);
    }

    // Step 3: Fund wallet balances
    const { data: tradingAssets, error: assetsError } = await supabaseAdmin
      .from('assets')
      .select('id, symbol')
      .in('symbol', ['IPG', 'USDT', 'BTC', 'ETH', 'BNB']);

    if (assetsError) {
      console.error('[Admin MM Setup] Error fetching assets:', assetsError);
      throw assetsError;
    }

    const fundAmount = 1000000; // 1 million of each
    
    for (const asset of tradingAssets || []) {
      // Check if balance exists
      const { data: existingBalance } = await supabaseAdmin
        .from('wallet_balances')
        .select('id, available')
        .eq('user_id', marketMakerUserId)
        .eq('asset_id', asset.id)
        .single();

      if (existingBalance) {
        // Top up if below threshold
        if (existingBalance.available < fundAmount / 2) {
          await supabaseAdmin
            .from('wallet_balances')
            .update({ available: fundAmount, locked: 0 })
            .eq('id', existingBalance.id);
          console.log(`[Admin MM Setup] Topped up ${asset.symbol} balance`);
        }
      } else {
        // Create new balance
        const { error: balanceError } = await supabaseAdmin
          .from('wallet_balances')
          .insert({
            user_id: marketMakerUserId,
            asset_id: asset.id,
            available: fundAmount,
            locked: 0
          });

        if (balanceError) {
          console.error(`[Admin MM Setup] Balance creation error for ${asset.symbol}:`, balanceError);
        } else {
          console.log(`[Admin MM Setup] Created ${asset.symbol} balance`);
        }
      }
    }

    // Step 4: Update trading engine settings
    const { error: settingsError } = await supabaseAdmin
      .from('trading_engine_settings')
      .update({
        market_maker_enabled: true,
        market_maker_user_id: marketMakerUserId,
        market_maker_spread_percent: spreadPercent,
        market_maker_depth_levels: depthLevels,
        market_maker_order_size: orderSize
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (settingsError) {
      console.error('[Admin MM Setup] Settings update error:', settingsError);
      throw settingsError;
    }

    console.log('[Admin MM Setup] Settings updated, MM enabled');

    // Step 5: Optionally seed orders
    if (action === 'setup_and_seed' || body.seed) {
      console.log('[Admin MM Setup] Triggering seed-market-maker...');
      await supabaseAdmin.functions.invoke('seed-market-maker');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Market maker setup complete',
        marketMakerUserId,
        settings: {
          spreadPercent,
          depthLevels,
          orderSize
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Admin MM Setup] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper to unlock funds and cancel all MM orders
async function unlockAndCancelMmOrders(supabase: any) {
  // Get settings to find MM user
  const { data: settings } = await supabase
    .from('trading_engine_settings')
    .select('market_maker_user_id')
    .single();

  if (!settings?.market_maker_user_id) return;

  const mmUserId = settings.market_maker_user_id;

  // Get all pending MM orders
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('id, symbol, side, remaining_amount, price')
    .eq('user_id', mmUserId)
    .eq('status', 'pending');

  if (!pendingOrders || pendingOrders.length === 0) return;

  // Calculate unlock amounts per asset
  const unlockAmounts: Record<string, number> = {};

  for (const order of pendingOrders) {
    const [base, quote] = order.symbol.split('/');
    const remaining = order.remaining_amount || 0;

    if (order.side === 'buy') {
      // Buy orders lock quote asset
      const lockedAmount = remaining * order.price;
      unlockAmounts[quote] = (unlockAmounts[quote] || 0) + lockedAmount;
    } else {
      // Sell orders lock base asset
      unlockAmounts[base] = (unlockAmounts[base] || 0) + remaining;
    }
  }

  // Unlock funds for each asset
  for (const [symbol, amount] of Object.entries(unlockAmounts)) {
    const { data: asset } = await supabase
      .from('assets')
      .select('id')
      .eq('symbol', symbol)
      .single();

    if (asset) {
      const { data: balance } = await supabase
        .from('wallet_balances')
        .select('id, available, locked')
        .eq('user_id', mmUserId)
        .eq('asset_id', asset.id)
        .single();

      if (balance) {
        await supabase
          .from('wallet_balances')
          .update({
            available: balance.available + amount,
            locked: Math.max(0, balance.locked - amount)
          })
          .eq('id', balance.id);
        
        console.log(`[Admin MM Setup] Unlocked ${amount} ${symbol}`);
      }
    }
  }

  // Cancel all pending orders
  await supabase
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('user_id', mmUserId)
    .eq('status', 'pending');

  console.log(`[Admin MM Setup] Cancelled ${pendingOrders.length} pending orders`);
}
