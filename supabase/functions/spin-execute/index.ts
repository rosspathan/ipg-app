import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wheel_id } = await req.json();
    
    if (!wheel_id) {
      throw new Error("wheel_id is required");
    }

    // Create Supabase client with service role for full access
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create client for user auth
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    
    if (!user) {
      throw new Error("Authentication required");
    }

    console.log(`Spin request from user ${user.id} for wheel ${wheel_id}`);

    // 1. Load active wheel and segments
    const { data: wheel, error: wheelError } = await supabaseService
      .from("spin_wheels")
      .select("*")
      .eq("id", wheel_id)
      .eq("is_active", true)
      .single();

    if (wheelError || !wheel) {
      throw new Error("Wheel not found or inactive");
    }

    // Check time window
    const now = new Date();
    if (wheel.start_at && new Date(wheel.start_at) > now) {
      throw new Error("Wheel not yet started");
    }
    if (wheel.end_at && new Date(wheel.end_at) < now) {
      throw new Error("Wheel has ended");
    }

    const { data: segments, error: segmentsError } = await supabaseService
      .from("spin_segments")
      .select("*")
      .eq("wheel_id", wheel_id)
      .eq("is_enabled", true);

    if (segmentsError || !segments || segments.length === 0) {
      throw new Error("No active segments found");
    }

    // 2. Check user limits
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create daily limits
    const { data: userLimit, error: limitError } = await supabaseService
      .from("spin_user_limits")
      .select("*")
      .eq("wheel_id", wheel_id)
      .eq("user_id", user.id)
      .eq("day", today)
      .single();

    let spinsToday = 0;
    if (!limitError && userLimit) {
      spinsToday = userLimit.spins_today;
    }

    // Check cooldown
    if (wheel.cooldown_seconds > 0) {
      const { data: lastRun } = await supabaseService
        .from("spin_runs")
        .select("created_at")
        .eq("wheel_id", wheel_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastRun) {
        const timeSinceLastSpin = now.getTime() - new Date(lastRun.created_at).getTime();
        if (timeSinceLastSpin < wheel.cooldown_seconds * 1000) {
          const remainingCooldown = Math.ceil((wheel.cooldown_seconds * 1000 - timeSinceLastSpin) / 1000);
          throw new Error(`Cooldown active. Wait ${remainingCooldown} seconds`);
        }
      }
    }

    // Check max spins per user
    if (wheel.max_spins_per_user > 0) {
      const { count } = await supabaseService
        .from("spin_runs")
        .select("*", { count: "exact", head: true })
        .eq("wheel_id", wheel_id)
        .eq("user_id", user.id);

      if (count && count >= wheel.max_spins_per_user) {
        throw new Error("Maximum spins per user reached");
      }
    }

    // 3. Determine cost and payment
    let ticketCost = 0;
    let ticketCurrency = wheel.ticket_currency;
    const freeSpinsRemaining = Math.max(0, wheel.free_spins_daily - spinsToday);

    if (freeSpinsRemaining > 0) {
      ticketCost = 0;
      console.log(`Using free spin. ${freeSpinsRemaining - 1} remaining today`);
    } else {
      ticketCost = wheel.ticket_price;
      console.log(`Charging ${ticketCost} ${ticketCurrency}`);
      
      if (ticketCost > 0) {
        // For MVP, we'll just log the charge - implement actual balance checking/deduction later
        console.log(`TODO: Deduct ${ticketCost} ${ticketCurrency} from user ${user.id}`);
      }
    }

    // 4. Server-side randomness with weighted selection
    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
    
    // Use crypto.getRandomValues for secure randomness
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const randomValue = randomArray[0] / (0xFFFFFFFF + 1); // Convert to 0-1 range
    
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

    console.log(`Selected segment: ${winningSegment.label} (weight: ${winningSegment.weight}/${totalWeight})`);

    // 5. Create spin run record
    const outcome = {
      segment_id: winningSegment.id,
      label: winningSegment.label,
      reward_type: winningSegment.reward_type,
      reward_value: winningSegment.reward_value,
      reward_token: winningSegment.reward_token
    };

    const { data: spinRun, error: runError } = await supabaseService
      .from("spin_runs")
      .insert({
        wheel_id: wheel_id,
        user_id: user.id,
        segment_id: winningSegment.id,
        ticket_cost: ticketCost,
        ticket_currency: ticketCurrency,
        outcome: outcome,
        status: "won"
      })
      .select()
      .single();

    if (runError) {
      throw new Error(`Failed to create spin run: ${runError.message}`);
    }

    // 6. Grant rewards
    if (winningSegment.reward_type !== "nothing" && winningSegment.reward_value && winningSegment.reward_value > 0) {
      const { error: grantError } = await supabaseService
        .from("spin_grants")
        .insert({
          run_id: spinRun.id,
          user_id: user.id,
          type: winningSegment.reward_type,
          value: winningSegment.reward_value,
          token: winningSegment.reward_token,
          meta: { segment_label: winningSegment.label }
        });

      if (grantError) {
        console.error("Failed to create grant:", grantError);
      } else {
        console.log(`Granted ${winningSegment.reward_value} ${winningSegment.reward_token || winningSegment.reward_type}`);
      }
    }

    // Update run status to granted
    await supabaseService
      .from("spin_runs")
      .update({ status: "granted" })
      .eq("id", spinRun.id);

    // 7. Update user limits
    if (userLimit) {
      await supabaseService
        .from("spin_user_limits")
        .update({ spins_today: spinsToday + 1 })
        .eq("id", userLimit.id);
    } else {
      await supabaseService
        .from("spin_user_limits")
        .insert({
          wheel_id: wheel_id,
          user_id: user.id,
          day: today,
          spins_today: 1
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        run_id: spinRun.id,
        segment_id: winningSegment.id,
        label: winningSegment.label,
        reward: {
          type: winningSegment.reward_type,
          value: winningSegment.reward_value,
          token: winningSegment.reward_token
        },
        ticket_cost: ticketCost,
        free_spins_remaining: Math.max(0, freeSpinsRemaining - 1)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Spin execution error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});