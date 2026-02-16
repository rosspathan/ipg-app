import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Internal Balance Transfer Edge Function
 * 
 * Handles Wallet ↔ Trading balance movements as pure database operations.
 * Uses atomic RPC with FOR UPDATE row locking to prevent race conditions.
 * 
 * Directions:
 *   to_trading  → credits wallet_balances (available)
 *   to_wallet   → debits  wallet_balances (available)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { asset_id, amount, direction } = await req.json();

    // Validate inputs
    if (!asset_id || !amount || !direction) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: asset_id, amount, direction" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be a positive number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (direction !== "to_trading" && direction !== "to_wallet") {
      return new Response(
        JSON.stringify({ error: "Direction must be 'to_trading' or 'to_wallet'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Round to 8 decimal places
    const safeAmount = Math.round(numAmount * 1e8) / 1e8;

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify the asset exists and is active
    const { data: asset, error: assetError } = await admin
      .from("assets")
      .select("id, symbol, name, trading_enabled")
      .eq("id", asset_id)
      .eq("is_active", true)
      .maybeSingle();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ error: "Asset not found or inactive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[internal-balance-transfer] ${direction} ${safeAmount} ${asset.symbol} for user ${user.id}`);

    // Map direction for the RPC
    const rpcDirection = direction === "to_trading" ? "to_trading" : "from_trading";

    // Execute atomic transfer with FOR UPDATE row locking
    const { data: result, error: rpcError } = await admin.rpc(
      "execute_internal_balance_transfer",
      {
        p_user_id: user.id,
        p_asset_id: asset_id,
        p_amount: safeAmount,
        p_direction: rpcDirection,
      }
    );

    if (rpcError) {
      console.error("[internal-balance-transfer] RPC error:", rpcError);
      return new Response(
        JSON.stringify({ error: rpcError.message || "Transfer failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!result?.success) {
      console.error("[internal-balance-transfer] Transfer rejected:", result?.error);
      return new Response(
        JSON.stringify({ error: result?.error || "Transfer failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[internal-balance-transfer] ✓ ${direction} ${safeAmount} ${asset.symbol} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${safeAmount} ${asset.symbol} transferred ${direction === "to_trading" ? "to trading balance" : "to wallet"}`,
        amount: safeAmount,
        symbol: asset.symbol,
        transfer_id: result.transfer_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[internal-balance-transfer] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Transfer failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
