import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferRequest {
  transfer_id: string;
  direction: "to_trading" | "from_trading";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transfer_id, direction }: TransferRequest = await req.json();

    // Use service role for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the transfer record
    const { data: transfer, error: transferError } = await adminClient
      .from("trading_balance_transfers")
      .select(`
        *,
        assets (
          id,
          symbol,
          name,
          network
        )
      `)
      .eq("id", transfer_id)
      .eq("user_id", user.id)
      .single();

    if (transferError || !transfer) {
      console.error("Transfer not found:", transferError);
      return new Response(
        JSON.stringify({ error: "Transfer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (transfer.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Transfer already processed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await adminClient
      .from("trading_balance_transfers")
      .update({ status: "processing" })
      .eq("id", transfer_id);

    console.log(`Processing ${direction} transfer for ${transfer.amount} ${transfer.assets?.symbol}`);

    if (direction === "to_trading") {
      // Transfer from wallet_balances to trading_balances
      // 1. Check wallet balance
      const { data: walletBalance, error: balanceError } = await adminClient
        .from("wallet_balances")
        .select("available")
        .eq("user_id", user.id)
        .eq("asset_id", transfer.asset_id)
        .single();

      if (balanceError || !walletBalance) {
        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "Wallet balance not found" })
          .eq("id", transfer_id);
        return new Response(
          JSON.stringify({ error: "Wallet balance not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (Number(walletBalance.available) < Number(transfer.amount)) {
        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "Insufficient balance" })
          .eq("id", transfer_id);
        return new Response(
          JSON.stringify({ error: "Insufficient balance" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Deduct from wallet_balances
      const { error: deductError } = await adminClient
        .from("wallet_balances")
        .update({
          available: Number(walletBalance.available) - Number(transfer.amount),
        })
        .eq("user_id", user.id)
        .eq("asset_id", transfer.asset_id);

      if (deductError) {
        console.error("Deduct error:", deductError);
        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "Failed to deduct from wallet" })
          .eq("id", transfer_id);
        return new Response(
          JSON.stringify({ error: "Failed to deduct from wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Add to trading_balances (upsert)
      const { data: existingTradingBalance } = await adminClient
        .from("trading_balances")
        .select("available")
        .eq("user_id", user.id)
        .eq("asset_id", transfer.asset_id)
        .single();

      if (existingTradingBalance) {
        await adminClient
          .from("trading_balances")
          .update({
            available: Number(existingTradingBalance.available) + Number(transfer.amount),
          })
          .eq("user_id", user.id)
          .eq("asset_id", transfer.asset_id);
      } else {
        await adminClient
          .from("trading_balances")
          .insert({
            user_id: user.id,
            asset_id: transfer.asset_id,
            available: Number(transfer.amount),
            locked: 0,
          });
      }

      // 4. Mark transfer as completed
      await adminClient
        .from("trading_balance_transfers")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", transfer_id);

      console.log(`Transfer to trading completed: ${transfer.amount} ${transfer.assets?.symbol}`);

    } else {
      // Transfer from trading_balances to wallet_balances
      // 1. Check trading balance
      const { data: tradingBalance, error: balanceError } = await adminClient
        .from("trading_balances")
        .select("available")
        .eq("user_id", user.id)
        .eq("asset_id", transfer.asset_id)
        .single();

      if (balanceError || !tradingBalance) {
        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "Trading balance not found" })
          .eq("id", transfer_id);
        return new Response(
          JSON.stringify({ error: "Trading balance not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (Number(tradingBalance.available) < Number(transfer.amount)) {
        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "Insufficient trading balance" })
          .eq("id", transfer_id);
        return new Response(
          JSON.stringify({ error: "Insufficient trading balance" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Deduct from trading_balances
      const { error: deductError } = await adminClient
        .from("trading_balances")
        .update({
          available: Number(tradingBalance.available) - Number(transfer.amount),
        })
        .eq("user_id", user.id)
        .eq("asset_id", transfer.asset_id);

      if (deductError) {
        console.error("Deduct error:", deductError);
        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "Failed to deduct from trading" })
          .eq("id", transfer_id);
        return new Response(
          JSON.stringify({ error: "Failed to deduct from trading balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Add to wallet_balances (upsert)
      const { data: existingWalletBalance } = await adminClient
        .from("wallet_balances")
        .select("available")
        .eq("user_id", user.id)
        .eq("asset_id", transfer.asset_id)
        .single();

      if (existingWalletBalance) {
        await adminClient
          .from("wallet_balances")
          .update({
            available: Number(existingWalletBalance.available) + Number(transfer.amount),
          })
          .eq("user_id", user.id)
          .eq("asset_id", transfer.asset_id);
      } else {
        await adminClient
          .from("wallet_balances")
          .insert({
            user_id: user.id,
            asset_id: transfer.asset_id,
            available: Number(transfer.amount),
            locked: 0,
          });
      }

      // 4. Mark transfer as completed
      await adminClient
        .from("trading_balance_transfers")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", transfer_id);

      console.log(`Transfer from trading completed: ${transfer.amount} ${transfer.assets?.symbol}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Transfer ${direction === "to_trading" ? "to trading" : "to wallet"} completed`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Transfer error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Transfer failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
