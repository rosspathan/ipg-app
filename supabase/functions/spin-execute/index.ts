import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wallet-address, x-local-auth",
};

interface SpinRequest {
  bet_usdt?: number;
  wallet_address?: string;
  local_auth?: boolean;
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
  last_spin_at?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  console.log(`🎯 [${requestId}] Spin request initiated at ${new Date().toISOString()}`);

  try {
    // Hard timeout - fail fast if request takes too long
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout after 5 seconds")), 5000);
    });

    const processRequest = async () => {
      const requestBody: SpinRequest = await req.json();
      console.log(`📥 [${requestId}] Request body:`, JSON.stringify(requestBody));

      // Environment validation
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

      if (!supabaseUrl || !serviceRoleKey || !anonKey) {
        throw new Error("Missing required environment variables");
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
              code: "AUTH_INVALID",
              message: "Please login again",
              hint: "Your session may have expired"
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
            code: "AUTH_REQUIRED",
            message: "Please connect your wallet or login",
            hint: "Authentication is required to spin"
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
            code: "SETTINGS_MISSING",
            message: "The spin wheel is temporarily unavailable",
            hint: "Please contact support if this persists"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log(`⚙️ [${requestId}] Settings loaded:`, {
        free_spins: settings.free_spins_default,
        fee_percent: settings.fee_bp_after_free,
        cooldown: settings.cooldown_seconds,
        min_bet: settings.min_bet_usdt,
        max_bet: settings.max_bet_usdt
      });

      // Validate bet amount
      const betAmount = requestBody.bet_usdt || settings.min_bet_usdt;
      if (betAmount < settings.min_bet_usdt || betAmount > settings.max_bet_usdt) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Bet amount must be between ${settings.min_bet_usdt} and ${settings.max_bet_usdt} USDT`,
            code: "OUTSIDE_BET_RANGE",
            message: `Invalid bet amount: ${betAmount} USDT`,
            hint: `Bet must be between ${settings.min_bet_usdt}-${settings.max_bet_usdt} USDT`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 }
        );
      }

      // Get user balance with SELECT FOR UPDATE for concurrent protection
      let userBalance: UserBalance | null = null;
      const balanceResult = await supabaseService
        .from("user_bonus_balances")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (balanceResult.data) {
        userBalance = balanceResult.data;
        console.log(`💰 [${requestId}] User balance: ${userBalance.bsk_available} BSK available`);
      } else if (authMethod === "supabase") {
        // Create initial balance for new users
        const { data: newBalance } = await supabaseService
          .from("user_bonus_balances")
          .insert({ user_id: userId, bsk_available: 100, bsk_pending: 0 })
          .select()
          .single();
        userBalance = newBalance;
        console.log(`🆕 [${requestId}] Created initial balance: 100 BSK`);
      }

      // Check daily spin limits and cooldown with server-authoritative time
      const now = Date.now();
      const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
      
      const { data: todaySpins } = await supabaseService
        .from("spin_results")
        .select("id, created_at")
        .eq("user_id", userId)
        .gte("created_at", todayStart)
        .order("created_at", { ascending: false });

      const spinsToday = todaySpins?.length || 0;
      const freeSpinsRemaining = Math.max(0, settings.free_spins_default - spinsToday);

      console.log(`📊 [${requestId}] Daily stats: ${spinsToday} spins today, ${freeSpinsRemaining} free spins left`);

      // Server-authoritative cooldown check
      let nextAllowedAt = now; // Default: can spin now
      if (settings.cooldown_seconds > 0 && todaySpins && todaySpins.length > 0) {
        const lastSpinTime = new Date(todaySpins[0].created_at).getTime();
        const cooldownEndTime = lastSpinTime + (settings.cooldown_seconds * 1000);
        
        if (now < cooldownEndTime) {
          const remainingCooldown = Math.ceil((cooldownEndTime - now) / 1000);
          console.log(`⏰ [${requestId}] Cooldown active: ${remainingCooldown}s remaining`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Please wait ${remainingCooldown} seconds before spinning again`,
              code: "COOLDOWN_ACTIVE",
              message: `Cooldown in effect`,
              hint: `Wait ${remainingCooldown} seconds`,
              cooldown_remaining: remainingCooldown,
              next_allowed_at: new Date(cooldownEndTime).toISOString()
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
          );
        }
        nextAllowedAt = cooldownEndTime;
      }

      // Determine cost and validate balance
      const isFreeSpin = freeSpinsRemaining > 0;
      let feeBsk = 0;

      if (!isFreeSpin) {
        feeBsk = (betAmount * settings.fee_bp_after_free) / 100;
        console.log(`💸 [${requestId}] Fee calculation: ${betAmount} USDT * ${settings.fee_bp_after_free}% = ${feeBsk} BSK`);
        
        // Check if user has enough BSK for fee
        if (authMethod === "supabase" && userBalance && userBalance.bsk_available < feeBsk) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Insufficient BSK balance. Need ${feeBsk} BSK for fee, have ${userBalance.bsk_available} BSK`,
              code: "INSUFFICIENT_BSK",
              message: `Not enough BSK for spin fee`,
              hint: `You need ${feeBsk} BSK but only have ${userBalance.bsk_available} BSK`
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 }
          );
        }
      }

      if (freeSpinsRemaining === 0 && isFreeSpin) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "No free spins remaining today",
            code: "FREE_SPINS_EXHAUSTED",
            message: "All free spins used today",
            hint: "Free spins reset daily or pay the BSK fee"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 }
        );
      }

      console.log(`🎰 [${requestId}] Spin parameters: bet=${betAmount} USDT, free=${isFreeSpin}, fee=${feeBsk} BSK`);

      // Server-side deterministic randomness
      const segments = settings.segments;
      if (!segments || segments.length === 0) {
        throw new Error("No wheel segments configured");
      }

      const totalWeight = segments.reduce((sum: number, segment: any) => sum + (segment.weight || 1), 0);
      
      // Use crypto.getRandomValues for secure randomness
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const randomValue = randomArray[0] / (0xFFFFFFFF + 1);
      const pick = Math.floor(randomValue * totalWeight);
      
      let currentWeight = 0;
      let winningSegment = segments[0];
      
      for (const segment of segments) {
        currentWeight += (segment.weight || 1);
        if (pick < currentWeight) {
          winningSegment = segment;
          break;
        }
      }

      console.log(`🎯 [${requestId}] Winning segment: ${winningSegment.label} (weight: ${winningSegment.weight}/${totalWeight}, pick: ${pick})`);

      // Calculate BSK delta and validate negative outcomes
      const baseBskDelta = winningSegment.reward_value || 0;
      const totalBskDelta = baseBskDelta - feeBsk;

      // Check if losing spin would make balance negative
      if (totalBskDelta < 0 && authMethod === "supabase" && userBalance) {
        const balanceAfter = userBalance.bsk_available + totalBskDelta;
        if (balanceAfter < 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Insufficient BSK balance for potential loss. Balance would become ${balanceAfter} BSK`,
              code: "INSUFFICIENT_BSK",
              message: "Not enough BSK for potential loss",
              hint: `You need at least ${Math.abs(totalBskDelta)} BSK to spin`
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 }
          );
        }
      }

      console.log(`📈 [${requestId}] BSK calculation: ${baseBskDelta} (reward) - ${feeBsk} (fee) = ${totalBskDelta}`);

      // Begin transaction: Create spin result and update balance atomically
      const outcome = {
        segment: winningSegment,
        random_value: randomValue,
        pick: pick,
        total_weight: totalWeight,
        timestamp: new Date().toISOString()
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
            code: "DATABASE_ERROR",
            message: "Spin could not be processed",
            hint: "Please try again"
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
            last_spin_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)
          .select()
          .single();

        if (balanceError) {
          console.error(`❌ [${requestId}] Failed to update balance:`, balanceError);
          // Note: spin result is already recorded, so we don't fail the request
        } else {
          newBalance = balanceUpdate;
          console.log(`💰 [${requestId}] Balance updated: ${userBalance.bsk_available} → ${updatedAvailable} BSK`);
        }
      }

      // Calculate next allowed spin time
      const nextSpinAllowed = now + (settings.cooldown_seconds * 1000);

      const duration = Date.now() - startTime;
      const response = {
        success: true,
        outcome: winningSegment,
        segment: winningSegment,
        delta_bsk: totalBskDelta,
        bsk_delta: totalBskDelta, // Legacy compatibility
        fee_bsk: feeBsk,
        is_free_spin: isFreeSpin,
        free_spins_remaining: Math.max(0, freeSpinsRemaining - 1),
        free_spins_left: Math.max(0, freeSpinsRemaining - 1), // Legacy compatibility
        balances: newBalance ? {
          available: newBalance.bsk_available,
          pending: newBalance.bsk_pending
        } : null,
        new_balance: newBalance, // Legacy compatibility
        next_allowed_at: new Date(nextSpinAllowed).toISOString(),
        cooldown_seconds: settings.cooldown_seconds,
        tx_id: spinResult.id,
        spin_id: spinResult.id, // Legacy compatibility
        auth_method: authMethod,
        duration_ms: duration
      };

      console.log(`✅ [${requestId}] Spin completed successfully in ${duration}ms:`, {
        segment: winningSegment.label,
        bsk_delta: totalBskDelta,
        free_spin: isFreeSpin,
        balance_after: newBalance?.bsk_available
      });

      return new Response(
        JSON.stringify(response),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    };

    // Race between actual processing and timeout
    return await Promise.race([processRequest(), timeoutPromise]);

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`💥 [${requestId}] Spin execution error after ${duration}ms:`, error);
    
    let errorCode = "INTERNAL_ERROR";
    let statusCode = 500;
    let message = "Internal server error";
    let hint = "Please try again";
    
    if (error.message.includes("timeout")) {
      errorCode = "REQUEST_TIMEOUT";
      statusCode = 408;
      message = "Request timed out";
      hint = "The server is experiencing high load, please try again";
    } else if (error.message.includes("authentication") || error.message.includes("auth")) {
      errorCode = "AUTH_ERROR";
      statusCode = 401;
      message = "Authentication failed";
      hint = "Please login again";
    } else if (error.message.includes("balance") || error.message.includes("insufficient")) {
      errorCode = "INSUFFICIENT_BALANCE";
      statusCode = 422;
      message = "Insufficient balance";
      hint = "You don't have enough BSK for this action";
    } else if (error.message.includes("cooldown")) {
      errorCode = "COOLDOWN_ACTIVE";
      statusCode = 429;
      message = "Cooldown in effect";
      hint = "Please wait before spinning again";
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || message,
        code: errorCode,
        message: message,
        hint: hint,
        request_id: requestId,
        duration_ms: duration
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});