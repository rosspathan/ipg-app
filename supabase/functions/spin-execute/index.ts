import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wallet-address, x-local-auth",
};

interface SpinRequest {
  wheel_id?: string;
  wallet_address?: string;
  local_auth?: boolean;
  bet_amount?: number;
}

interface SpinSettings {
  id: string;
  free_spins_default: number;
  fee_bp_after_free: number;
  min_bet_usdt: number;
  max_bet_usdt: number;
  segments: any[];
  is_enabled: boolean;
  cooldown_seconds: number;
}

interface UserBalance {
  user_id: string;
  bsk_available: number;
  bsk_pending: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`🎯 [${requestId}] Spin request initiated`);

  try {
    const requestBody: SpinRequest = await req.json();
    console.log(`📥 [${requestId}] Request body:`, JSON.stringify(requestBody));

    // Environment validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY");
    }

    console.log(`🔧 [${requestId}] Environment verified - URL: ${supabaseUrl}`);

    // Create Supabase clients
    const supabaseService = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const supabaseAuth = createClient(supabaseUrl, anonKey);

    // Determine authentication method and get user ID
    let userId: string;
    let authMethod: string;
    
    const authHeader = req.headers.get("Authorization");
    const walletHeader = req.headers.get("x-wallet-address");
    const localAuthHeader = req.headers.get("x-local-auth");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
      
      if (authError || !user) {
        console.error(`❌ [${requestId}] Supabase auth failed:`, authError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invalid authentication token",
            error_code: "AUTH_INVALID"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
      
      userId = user.id;
      authMethod = "supabase";
      console.log(`👤 [${requestId}] Supabase user authenticated: ${userId}`);
      
    } else if (requestBody.wallet_address || walletHeader) {
      const address = requestBody.wallet_address || walletHeader;
      userId = `wallet_${address?.toLowerCase()}`;
      authMethod = "web3";
      console.log(`🔗 [${requestId}] Web3 wallet authenticated: ${address}`);
      
    } else if (requestBody.local_auth === true || localAuthHeader === "true") {
      const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      userId = `local_${clientIP}_${Date.now()}`;
      authMethod = "local";
      console.log(`🏠 [${requestId}] Local auth user: ${userId}`);
      
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authentication required",
          error_code: "AUTH_REQUIRED"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Load spin settings
    const { data: settings, error: settingsError } = await supabaseService
      .from("spin_settings")
      .select("*")
      .eq("is_enabled", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.error(`❌ [${requestId}] Failed to load spin settings:`, settingsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Spin system not configured",
          error_code: "SETTINGS_MISSING"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`⚙️ [${requestId}] Settings loaded:`, {
      free_spins: settings.free_spins_default,
      fee_percent: settings.fee_bp_after_free,
      cooldown: settings.cooldown_seconds
    });

    // Get user balance (for Supabase users only)
    let userBalance: UserBalance | null = null;
    if (authMethod === "supabase") {
      const { data: balance } = await supabaseService
        .from("user_bonus_balances")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (balance) {
        userBalance = balance;
        console.log(`💰 [${requestId}] User balance: ${balance.bsk_available} BSK available`);
      } else {
        // Create initial balance
        const { data: newBalance } = await supabaseService
          .from("user_bonus_balances")
          .insert({ user_id: userId, bsk_available: 100, bsk_pending: 0 })
          .select()
          .single();
        userBalance = newBalance;
        console.log(`🆕 [${requestId}] Created initial balance: 100 BSK`);
      }
    }

    // Check daily spin limits and cooldown
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySpins } = await supabaseService
      .from("spin_results")
      .select("id, created_at")
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00.000Z`)
      .order("created_at", { ascending: false });

    const spinsToday = todaySpins?.length || 0;
    const freeSpinsRemaining = Math.max(0, settings.free_spins_default - spinsToday);

    console.log(`📊 [${requestId}] Daily stats: ${spinsToday} spins today, ${freeSpinsRemaining} free spins left`);

    // Check cooldown
    if (settings.cooldown_seconds > 0 && todaySpins && todaySpins.length > 0) {
      const lastSpinTime = new Date(todaySpins[0].created_at).getTime();
      const now = Date.now();
      const timeSinceLastSpin = now - lastSpinTime;
      
      if (timeSinceLastSpin < settings.cooldown_seconds * 1000) {
        const remainingCooldown = Math.ceil((settings.cooldown_seconds * 1000 - timeSinceLastSpin) / 1000);
        console.log(`⏰ [${requestId}] Cooldown active: ${remainingCooldown}s remaining`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Cooldown active. Wait ${remainingCooldown} seconds`,
            error_code: "COOLDOWN_ACTIVE",
            cooldown_remaining: remainingCooldown
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 }
        );
      }
    }

    // Determine cost and validate bet
    const betAmount = requestBody.bet_amount || settings.min_bet_usdt;
    let isFreeSpin = freeSpinsRemaining > 0;
    let feeBsk = 0;

    if (betAmount < settings.min_bet_usdt || betAmount > settings.max_bet_usdt) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Bet amount must be between ${settings.min_bet_usdt} and ${settings.max_bet_usdt} USDT`,
          error_code: "INVALID_BET_AMOUNT"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 }
      );
    }

    if (!isFreeSpin) {
      feeBsk = (betAmount * settings.fee_bp_after_free) / 100;
      console.log(`💸 [${requestId}] Fee calculation: ${betAmount} USDT * ${settings.fee_bp_after_free}% = ${feeBsk} BSK`);
      
      // Check if user has enough BSK for fee (Supabase users only)
      if (authMethod === "supabase" && userBalance && userBalance.bsk_available < feeBsk) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Insufficient BSK balance. Need ${feeBsk} BSK for fee, have ${userBalance.bsk_available} BSK`,
            error_code: "INSUFFICIENT_BALANCE"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 }
        );
      }
    }

    console.log(`🎰 [${requestId}] Spin parameters: bet=${betAmount} USDT, free=${isFreeSpin}, fee=${feeBsk} BSK`);

    // Server-side randomness with weighted selection from settings
    const segments = settings.segments;
    const totalWeight = segments.reduce((sum: number, segment: any) => sum + segment.weight, 0);
    
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const randomValue = randomArray[0] / (0xFFFFFFFF + 1);
    const pick = Math.floor(randomValue * totalWeight);
    
    let currentWeight = 0;
    let winningSegment = segments[0];
    
    for (const segment of segments) {
      currentWeight += segment.weight;
      if (pick < currentWeight) {
        winningSegment = segment;
        break;
      }
    }

    console.log(`🎯 [${requestId}] Winning segment: ${winningSegment.label} (${winningSegment.weight}/${totalWeight})`);

    // Calculate BSK delta
    const baseBskDelta = winningSegment.reward_value || 0;
    const totalBskDelta = baseBskDelta - feeBsk;

    console.log(`📈 [${requestId}] BSK calculation: ${baseBskDelta} (reward) - ${feeBsk} (fee) = ${totalBskDelta}`);

    // Create spin result record
    const outcome = {
      segment: winningSegment,
      random_value: randomValue,
      pick: pick,
      total_weight: totalWeight
    };

    const { data: spinResult, error: resultError } = await supabaseService
      .from("spin_results")
      .insert({
        user_id: userId,
        bet_amount: betAmount,
        outcome: outcome,
        bsk_delta: totalBskDelta,
        fee_bsk: feeBsk,
        segment_label: winningSegment.label,
        is_free_spin: isFreeSpin,
        auth_method: authMethod
      })
      .select()
      .single();

    if (resultError) {
      console.error(`❌ [${requestId}] Failed to create spin result:`, resultError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to record spin result",
          error_code: "DATABASE_ERROR"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`📝 [${requestId}] Spin result created: ${spinResult.id}`);

    // Update user balance (Supabase users only)
    let newBalance = null;
    if (authMethod === "supabase" && userBalance) {
      const updatedAvailable = userBalance.bsk_available + totalBskDelta;
      
      const { data: balanceUpdate, error: balanceError } = await supabaseService
        .from("user_bonus_balances")
        .update({ 
          bsk_available: updatedAvailable,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (balanceError) {
        console.error(`❌ [${requestId}] Failed to update balance:`, balanceError);
      } else {
        newBalance = balanceUpdate;
        console.log(`💰 [${requestId}] Balance updated: ${userBalance.bsk_available} → ${updatedAvailable} BSK`);
      }
    }

    const response = {
      success: true,
      spin_id: spinResult.id,
      segment: winningSegment,
      bsk_delta: totalBskDelta,
      fee_bsk: feeBsk,
      is_free_spin: isFreeSpin,
      free_spins_remaining: Math.max(0, freeSpinsRemaining - 1),
      new_balance: newBalance,
      auth_method: authMethod,
      cooldown_seconds: settings.cooldown_seconds
    };

    console.log(`✅ [${requestId}] Spin completed successfully:`, {
      segment: winningSegment.label,
      bsk_delta: totalBskDelta,
      free_spin: isFreeSpin
    });

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error(`💥 [${requestId}] Spin execution error:`, error);
    
    let errorCode = "INTERNAL_ERROR";
    let statusCode = 500;
    
    if (error.message.includes("authentication") || error.message.includes("auth")) {
      errorCode = "AUTH_ERROR";
      statusCode = 401;
    } else if (error.message.includes("balance") || error.message.includes("insufficient")) {
      errorCode = "INSUFFICIENT_BALANCE";
      statusCode = 422;
    } else if (error.message.includes("cooldown")) {
      errorCode = "COOLDOWN_ACTIVE";
      statusCode = 422;
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error",
        error_code: errorCode,
        request_id: requestId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});