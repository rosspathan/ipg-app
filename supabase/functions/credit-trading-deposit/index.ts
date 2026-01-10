import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreditDepositRequest {
  tx_hash: string;
  asset_id: string;
  amount: number;
  from_address: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreditDepositRequest = await req.json();
    const { tx_hash, asset_id, amount, from_address } = body;

    console.log(`[CreditDeposit] Processing deposit for user ${user.id}:`, {
      tx_hash,
      asset_id,
      amount,
      from_address,
    });

    // Validate required fields
    if (!tx_hash || !asset_id || !amount || !from_address) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tx_hash, asset_id, amount, from_address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this tx_hash was already credited
    const { data: existingDeposit } = await supabase
      .from("custodial_deposits")
      .select("id, status")
      .eq("tx_hash", tx_hash)
      .maybeSingle();

    if (existingDeposit?.status === "credited") {
      console.log(`[CreditDeposit] Transaction already credited: ${tx_hash}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Already credited",
          deposit_id: existingDeposit.id 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the asset details
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("id, symbol")
      .eq("id", asset_id)
      .single();

    if (assetError || !asset) {
      console.error(`[CreditDeposit] Asset not found: ${asset_id}`);
      return new Response(
        JSON.stringify({ error: "Asset not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start a transaction-like operation
    // 1. Upsert the custodial_deposits record
    const { data: deposit, error: depositError } = await supabase
      .from("custodial_deposits")
      .upsert({
        user_id: user.id,
        tx_hash,
        asset_id,
        amount,
        from_address: from_address.toLowerCase(),
        status: "credited",
        credited_at: new Date().toISOString(),
      }, {
        onConflict: "tx_hash",
      })
      .select()
      .single();

    if (depositError) {
      console.error(`[CreditDeposit] Failed to upsert deposit:`, depositError);
      return new Response(
        JSON.stringify({ error: "Failed to record deposit", details: depositError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CreditDeposit] Deposit record created/updated:`, deposit.id);

    // 2. Credit the wallet balance
    const { data: existingBalance } = await supabase
      .from("wallet_balances")
      .select("available, locked")
      .eq("user_id", user.id)
      .eq("asset_id", asset_id)
      .maybeSingle();

    const currentAvailable = existingBalance?.available || 0;
    const currentLocked = existingBalance?.locked || 0;
    const newAvailable = currentAvailable + amount;

    const { error: balanceError } = await supabase
      .from("wallet_balances")
      .upsert({
        user_id: user.id,
        asset_id,
        available: newAvailable,
        locked: currentLocked,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,asset_id",
      });

    if (balanceError) {
      console.error(`[CreditDeposit] Failed to credit balance:`, balanceError);
      // Even if balance update fails, we have the deposit recorded
      return new Response(
        JSON.stringify({ 
          error: "Deposit recorded but balance credit failed",
          deposit_id: deposit.id,
          details: balanceError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CreditDeposit] Balance credited: ${currentAvailable} -> ${newAvailable} ${asset.symbol}`);

    // 3. Create a ledger entry for audit trail
    await supabase
      .from("trading_balance_ledger")
      .insert({
        user_id: user.id,
        asset_id,
        amount,
        balance_before: currentAvailable,
        balance_after: newAvailable,
        transaction_type: "deposit",
        reference_type: "custodial_deposit",
        reference_id: deposit.id,
        notes: `On-chain deposit credited: ${tx_hash.substring(0, 16)}...`,
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Deposit credited successfully",
        deposit_id: deposit.id,
        new_balance: newAvailable,
        asset_symbol: asset.symbol,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[CreditDeposit] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
