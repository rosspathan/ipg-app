import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Internal Balance Transfer Edge Function
 * 
 * Handles Wallet ↔ Trading balance movements as pure database operations.
 * Uses atomic RPC with FOR UPDATE row locking to prevent race conditions.
 * 
 * Directions:
 *   to_trading  → credits wallet_balances (available) — REQUIRES tx_hash proof
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

    const { asset_id, amount, direction, tx_hash } = await req.json();

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

    // SECURITY: Require tx_hash for to_trading direction
    if (direction === "to_trading" && (!tx_hash || typeof tx_hash !== "string" || tx_hash.trim() === "")) {
      console.error("[internal-balance-transfer] BLOCKED: to_trading without tx_hash");
      return new Response(
        JSON.stringify({ error: "tx_hash is required for to_trading transfers. On-chain deposit proof is mandatory." }),
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

    console.log(`[internal-balance-transfer] ${direction} ${safeAmount} ${asset.symbol} for user ${user.id}${tx_hash ? ` TX: ${tx_hash}` : ""}`);

    // Resolve user's on-chain wallet address (needed for to_wallet)
    let userWalletAddress: string | null = null;
    if (direction === "to_wallet") {
      const { data: profile } = await admin
        .from("profiles")
        .select("bsc_wallet_address, wallet_address")
        .eq("user_id", user.id)
        .single();

      userWalletAddress = profile?.bsc_wallet_address || profile?.wallet_address || null;

      if (!userWalletAddress) {
        const { data: userWallet } = await admin
          .from("wallets_user")
          .select("address")
          .eq("user_id", user.id)
          .eq("is_primary", true)
          .maybeSingle();

        userWalletAddress = userWallet?.address || null;
      }

      if (!userWalletAddress) {
        return new Response(
          JSON.stringify({ error: "No registered wallet address found. Cannot transfer to wallet without a verified on-chain address." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[internal-balance-transfer] ✓ User ${user.id} wallet: ${userWalletAddress}`);
    }

    // Map direction for the RPC
    const rpcDirection = direction === "to_trading" ? "to_trading" : "from_trading";

    // Execute atomic transfer with FOR UPDATE row locking
    // For to_trading: pass tx_hash for custodial_deposits verification
    const { data: result, error: rpcError } = await admin.rpc(
      "execute_internal_balance_transfer",
      {
        p_user_id: user.id,
        p_asset_id: asset_id,
        p_amount: safeAmount,
        p_direction: rpcDirection,
        p_tx_hash: direction === "to_trading" ? tx_hash.trim() : null,
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

    // Handle "already_credited" idempotency response
    if (result?.status === "already_credited") {
      console.log(`[internal-balance-transfer] Already credited for TX: ${tx_hash}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: result.message || "Already credited",
          amount: safeAmount,
          symbol: asset.symbol,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[internal-balance-transfer] ✓ ${direction} ${safeAmount} ${asset.symbol} for user ${user.id}`);

    // ── For "to_wallet": create a withdrawal record so process-pending-withdrawals sends tokens on-chain ──
    if (direction === "to_wallet" && userWalletAddress) {
      const { data: withdrawal, error: wdErr } = await admin
        .from("withdrawals")
        .insert({
          user_id: user.id,
          asset_id: asset_id,
          amount: safeAmount,
          fee: 0,
          net_amount: safeAmount,
          to_address: userWalletAddress,
          network: "BEP20",
          status: "processing",
        })
        .select("id")
        .single();

      if (wdErr) {
        console.error("[internal-balance-transfer] WARNING: Failed to create withdrawal record:", wdErr);
        await admin.from("admin_notifications").insert({
          type: "withdrawal_creation_failed",
          priority: "critical",
          title: "Withdrawal Record Creation Failed",
          message: `User ${user.id} transferred ${safeAmount} ${asset.symbol} to_wallet but withdrawal record failed: ${wdErr.message}. Manual intervention needed.`,
        });
      } else {
        await admin
          .from("internal_balance_transfers")
          .update({ notes: `withdrawal_id:${withdrawal.id}` })
          .eq("id", result.transfer_id);

        console.log(`[internal-balance-transfer] ✓ Created withdrawal ${withdrawal.id} for on-chain processing`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${safeAmount} ${asset.symbol} transferred ${direction === "to_trading" ? "to trading balance" : "to wallet (pending on-chain)"}`,
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
