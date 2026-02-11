import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Internal Balance Transfer Edge Function
 * 
 * Handles Wallet ↔ Trading balance movements as pure database operations.
 * No on-chain transactions — instant, gas-free, and error-free.
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

    // Round to 8 decimal places to prevent floating-point drift
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

    if (direction === "to_trading") {
      // ===== WALLET → TRADING =====
      // Credit the user's wallet_balances (trading balance)
      // Upsert: create row if it doesn't exist, otherwise increment available

      const { data: existing } = await admin
        .from("wallet_balances")
        .select("id, available, locked")
        .eq("user_id", user.id)
        .eq("asset_id", asset_id)
        .maybeSingle();

      if (existing) {
        const newAvailable = Math.round((Number(existing.available) + safeAmount) * 1e8) / 1e8;

        const { error: updateError } = await admin
          .from("wallet_balances")
          .update({
            available: newAvailable,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("[internal-balance-transfer] Update error:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to credit trading balance" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        const { error: insertError } = await admin
          .from("wallet_balances")
          .insert({
            user_id: user.id,
            asset_id: asset_id,
            available: safeAmount,
            locked: 0,
          });

        if (insertError) {
          console.error("[internal-balance-transfer] Insert error:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to create trading balance" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Record the transfer
      await admin.from("trading_balance_transfers").insert({
        user_id: user.id,
        asset_id: asset_id,
        direction: "to_trading",
        amount: safeAmount,
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      console.log(`[internal-balance-transfer] Credited ${safeAmount} ${asset.symbol} to trading for user ${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `${safeAmount} ${asset.symbol} transferred to trading balance`,
          amount: safeAmount,
          symbol: asset.symbol,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // ===== TRADING → WALLET =====
      // Debit from wallet_balances (trading balance)

      const { data: balance, error: balError } = await admin
        .from("wallet_balances")
        .select("id, available, locked")
        .eq("user_id", user.id)
        .eq("asset_id", asset_id)
        .maybeSingle();

      if (balError || !balance) {
        return new Response(
          JSON.stringify({ error: "No trading balance found for this asset" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const currentAvailable = Number(balance.available);
      if (currentAvailable < safeAmount) {
        return new Response(
          JSON.stringify({
            error: `Insufficient trading balance. Available: ${currentAvailable.toFixed(8)} ${asset.symbol}`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newAvailable = Math.round((currentAvailable - safeAmount) * 1e8) / 1e8;

      const { error: updateError } = await admin
        .from("wallet_balances")
        .update({
          available: newAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq("id", balance.id);

      if (updateError) {
        console.error("[internal-balance-transfer] Debit error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to debit trading balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record the transfer
      await admin.from("trading_balance_transfers").insert({
        user_id: user.id,
        asset_id: asset_id,
        direction: "from_trading",
        amount: safeAmount,
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      console.log(`[internal-balance-transfer] Debited ${safeAmount} ${asset.symbol} from trading for user ${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `${safeAmount} ${asset.symbol} transferred to wallet`,
          amount: safeAmount,
          symbol: asset.symbol,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[internal-balance-transfer] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Transfer failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
