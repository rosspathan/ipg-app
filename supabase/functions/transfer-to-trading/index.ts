import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferRequest {
  transfer_id: string;
  direction: "to_trading" | "from_trading";
}

/**
 * Transfer To Trading Edge Function - Custodial Model
 * 
 * TO TRADING:
 *   - Generates deposit instructions for user to send tokens to hot wallet
 *   - Updates transfer status to "awaiting_deposit"
 *   - Actual crediting happens via monitor-custodial-deposits
 * 
 * FROM TRADING:
 *   - Deducts from trading_balances
 *   - Creates custodial_withdrawals record
 *   - Actual on-chain transfer happens via process-custodial-withdrawal
 */

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
          network,
          contract_address,
          decimals
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

    console.log(`[transfer-to-trading] Processing ${direction} transfer for ${transfer.amount} ${transfer.assets?.symbol}`);

    if (direction === "to_trading") {
      // ==========================================
      // CUSTODIAL DEPOSIT FLOW
      // ==========================================
      // User needs to send tokens to hot wallet
      // Return deposit instructions with hot wallet address
      
      // Get active hot wallet
      const { data: hotWallet, error: hotWalletError } = await adminClient
        .from("platform_hot_wallet")
        .select("address")
        .eq("is_active", true)
        .eq("chain", "BSC")
        .single();

      if (hotWalletError || !hotWallet) {
        console.error("No hot wallet configured:", hotWalletError);
        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "No hot wallet configured" })
          .eq("id", transfer_id);
        return new Response(
          JSON.stringify({ error: "Trading deposits temporarily unavailable" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update transfer status to awaiting user deposit
      await adminClient
        .from("trading_balance_transfers")
        .update({ 
          status: "awaiting_deposit",
          updated_at: new Date().toISOString()
        })
        .eq("id", transfer_id);

      console.log(`[transfer-to-trading] Awaiting deposit to hot wallet: ${hotWallet.address}`);

      return new Response(
        JSON.stringify({
          success: true,
          status: "awaiting_deposit",
          message: "Send tokens to the deposit address below. Your trading balance will be credited automatically.",
          deposit_address: hotWallet.address,
          amount: transfer.amount,
          symbol: transfer.assets?.symbol,
          network: "BSC (BEP-20)",
          instructions: [
            `Send exactly ${transfer.amount} ${transfer.assets?.symbol} to the address below`,
            "Make sure you're sending on the BSC (BEP-20) network",
            "Your trading balance will be credited after 15 confirmations (~45 seconds)",
            "Do not send from an exchange - use your personal wallet"
          ]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // ==========================================
      // CUSTODIAL WITHDRAWAL FLOW  
      // ==========================================
      // Deduct from trading_balances and create withdrawal request
      
      // Check trading balance
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

      // Get user's withdrawal address
      const { data: profile } = await adminClient
        .from("profiles")
        .select("bsc_wallet_address, wallet_address")
        .eq("user_id", user.id)
        .single();

      let withdrawAddress = profile?.bsc_wallet_address || profile?.wallet_address;

      if (!withdrawAddress) {
        const { data: userWallet } = await adminClient
          .from("wallets_user")
          .select("address")
          .eq("user_id", user.id)
          .eq("is_primary", true)
          .single();
        withdrawAddress = userWallet?.address;
      }

      if (!withdrawAddress) {
        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "No wallet address found" })
          .eq("id", transfer_id);
        return new Response(
          JSON.stringify({ error: "No wallet address found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update status to processing
      await adminClient
        .from("trading_balance_transfers")
        .update({ status: "processing" })
        .eq("id", transfer_id);

      // Deduct from trading_balances
      const { error: deductError } = await adminClient
        .from("trading_balances")
        .update({
          available: Number(tradingBalance.available) - Number(transfer.amount),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("asset_id", transfer.asset_id);

      if (deductError) {
        console.error("Deduct error:", deductError);
        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "Failed to deduct balance" })
          .eq("id", transfer_id);
        return new Response(
          JSON.stringify({ error: "Failed to deduct from trading balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create custodial withdrawal request
      const { data: withdrawal, error: withdrawalError } = await adminClient
        .from("custodial_withdrawals")
        .insert({
          user_id: user.id,
          asset_id: transfer.asset_id,
          amount: Number(transfer.amount),
          to_address: withdrawAddress,
          status: "pending"
        })
        .select("id")
        .single();

      if (withdrawalError) {
        console.error("Withdrawal create error:", withdrawalError);
        // Refund trading balance
        await adminClient
          .from("trading_balances")
          .update({
            available: Number(tradingBalance.available),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .eq("asset_id", transfer.asset_id);

        await adminClient
          .from("trading_balance_transfers")
          .update({ status: "failed", error_message: "Failed to create withdrawal" })
          .eq("id", transfer_id);

        return new Response(
          JSON.stringify({ error: "Failed to create withdrawal request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark transfer as completed (withdrawal is now pending separately)
      await adminClient
        .from("trading_balance_transfers")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", transfer_id);

      console.log(`[transfer-to-trading] Created withdrawal ${withdrawal.id} for ${transfer.amount} ${transfer.assets?.symbol}`);

      return new Response(
        JSON.stringify({
          success: true,
          status: "withdrawal_queued",
          withdrawal_id: withdrawal.id,
          message: `Withdrawal of ${transfer.amount} ${transfer.assets?.symbol} to your wallet has been queued. It will be processed shortly.`,
          to_address: withdrawAddress
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Transfer error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Transfer failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
