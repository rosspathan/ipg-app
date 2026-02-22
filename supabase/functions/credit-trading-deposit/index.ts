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

// ERC-20 Transfer event signature
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function verifyOnChainTransfer(
  txHash: string,
  expectedAssetContract: string,
  expectedToAddress: string,
  expectedAmount: number,
  decimals: number,
  rpcUrl: string
): Promise<{ valid: boolean; error?: string; actualAmount?: number; from?: string }> {
  try {
    console.log(`[Verify] Checking tx ${txHash} on-chain...`);
    console.log(`[Verify] Expected: to=${expectedToAddress}, contract=${expectedAssetContract}, amount=${expectedAmount}`);

    // Get transaction receipt
    const receiptResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });

    const receiptData = await receiptResponse.json();
    
    if (!receiptData.result) {
      console.log(`[Verify] Transaction not found or not mined yet`);
      return { valid: false, error: "Transaction not found or not yet confirmed" };
    }

    const receipt = receiptData.result;
    
    // Check if transaction was successful
    if (receipt.status !== "0x1") {
      console.log(`[Verify] Transaction failed on-chain`);
      return { valid: false, error: "Transaction failed on-chain" };
    }

    // Parse logs for ERC-20 Transfer events
    const logs = receipt.logs || [];
    console.log(`[Verify] Found ${logs.length} logs in transaction`);

    for (const log of logs) {
      // Check if this is a Transfer event from the expected contract
      if (
        log.topics &&
        log.topics[0] === TRANSFER_TOPIC &&
        log.address.toLowerCase() === expectedAssetContract.toLowerCase()
      ) {
        // Decode Transfer event: Transfer(from, to, amount)
        // topics[1] = from address (padded to 32 bytes)
        // topics[2] = to address (padded to 32 bytes)
        // data = amount (uint256)
        
        const fromAddress = "0x" + log.topics[1].slice(26);
        const toAddress = "0x" + log.topics[2].slice(26);
        const amountHex = log.data;
        const amountWei = BigInt(amountHex);
        const actualAmount = Number(amountWei) / Math.pow(10, decimals);

        console.log(`[Verify] Found Transfer: from=${fromAddress}, to=${toAddress}, amount=${actualAmount}`);

        // Check if this transfer is to our hot wallet
        if (toAddress.toLowerCase() === expectedToAddress.toLowerCase()) {
          // Allow small tolerance for floating point
          const tolerance = 0.0001;
          if (Math.abs(actualAmount - expectedAmount) <= tolerance || actualAmount >= expectedAmount) {
            console.log(`[Verify] ✓ Valid transfer verified!`);
            return { valid: true, actualAmount, from: fromAddress };
          } else {
            console.log(`[Verify] Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`);
            return { 
              valid: false, 
              error: `Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`,
              actualAmount,
              from: fromAddress
            };
          }
        }
      }
    }

    // Also check if this is a native BNB transfer (no logs, check value)
    const txResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionByHash",
        params: [txHash],
      }),
    });

    const txData = await txResponse.json();
    if (txData.result) {
      const tx = txData.result;
      const toAddress = tx.to?.toLowerCase();
      const valueWei = BigInt(tx.value || "0");
      const valueBNB = Number(valueWei) / 1e18;

      // If it's a native transfer to our hot wallet
      if (
        toAddress === expectedToAddress.toLowerCase() &&
        valueBNB > 0 &&
        expectedAssetContract.toLowerCase() === "0x0000000000000000000000000000000000000000" // Native BNB
      ) {
        if (Math.abs(valueBNB - expectedAmount) <= 0.0001 || valueBNB >= expectedAmount) {
          console.log(`[Verify] ✓ Native BNB transfer verified: ${valueBNB} BNB`);
          return { valid: true, actualAmount: valueBNB, from: tx.from };
        }
      }
    }

    console.log(`[Verify] No matching Transfer event found to ${expectedToAddress}`);
    return { valid: false, error: `No matching transfer found to hot wallet ${expectedToAddress}` };

  } catch (error) {
    console.error(`[Verify] Error verifying transaction:`, error);
    return { valid: false, error: `Verification error: ${error.message}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bscRpcUrl = Deno.env.get("BSC_RPC_URL");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!bscRpcUrl) {
      console.error("[CreditDeposit] BSC_RPC_URL not configured");
      return new Response(
        JSON.stringify({ error: "RPC not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      .select("id, symbol, contract_address, decimals")
      .eq("id", asset_id)
      .single();

    if (assetError || !asset) {
      console.error(`[CreditDeposit] Asset not found: ${asset_id}`);
      return new Response(
        JSON.stringify({ error: "Asset not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the platform hot wallet address (prioritize Trading wallet)
    let hotWallet = null;
    
    // First try to get the Trading Hot Wallet specifically
    const { data: tradingWallet } = await supabase
      .from("platform_hot_wallet")
      .select("address, label")
      .eq("chain", "BSC")
      .eq("is_active", true)
      .ilike("label", "%Trading%")
      .limit(1)
      .maybeSingle();
    
    if (tradingWallet?.address) {
      hotWallet = tradingWallet;
      console.log(`[CreditDeposit] Using Trading Hot Wallet: ${tradingWallet.address}`);
    } else {
      // Fallback: get any active BSC wallet
      const { data: anyWallet } = await supabase
        .from("platform_hot_wallet")
        .select("address, label")
        .eq("chain", "BSC")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      
      if (anyWallet?.address) {
        hotWallet = anyWallet;
        console.log(`[CreditDeposit] Using fallback wallet: ${anyWallet.label} - ${anyWallet.address}`);
      }
    }

    if (!hotWallet) {
      console.error(`[CreditDeposit] No active BSC hot wallet found`);
      return new Response(
        JSON.stringify({ error: "Platform hot wallet not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CreditDeposit] Verifying on-chain: asset=${asset.symbol}, contract=${asset.contract_address}, hotWallet=${hotWallet.address}`);

    // Verify the transaction on-chain
    const verification = await verifyOnChainTransfer(
      tx_hash,
      asset.contract_address || "0x0000000000000000000000000000000000000000",
      hotWallet.address,
      amount,
      asset.decimals || 18,
      bscRpcUrl
    );

    if (!verification.valid) {
      console.error(`[CreditDeposit] On-chain verification failed: ${verification.error}`);
      return new Response(
        JSON.stringify({ 
          error: "On-chain verification failed", 
          details: verification.error 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CreditDeposit] ✓ On-chain verification passed! Actual amount: ${verification.actualAmount}`);

    // Use the actual verified amount (may be slightly different due to decimals)
    const creditAmount = verification.actualAmount || amount;

    // 1. Upsert the custodial_deposits record as 'pending' (idempotent via tx_hash unique constraint)
    const { data: deposit, error: depositError } = await supabase
      .from("custodial_deposits")
      .upsert({
        user_id: user.id,
        tx_hash,
        asset_id,
        amount: creditAmount,
        from_address: from_address.toLowerCase(),
        status: "pending",
      }, {
        onConflict: "tx_hash",
        ignoreDuplicates: true,
      })
      .select()
      .single();

    if (depositError) {
      // If upsert was ignored (already exists), fetch the existing record
      const { data: existing } = await supabase
        .from("custodial_deposits")
        .select("id, status")
        .eq("tx_hash", tx_hash)
        .single();

      if (existing?.status === "credited") {
        return new Response(
          JSON.stringify({ success: true, message: "Already credited", deposit_id: existing.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!existing) {
        console.error(`[CreditDeposit] Failed to upsert deposit:`, depositError);
        return new Response(
          JSON.stringify({ error: "Failed to record deposit", details: depositError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Existing pending deposit — proceed to credit via RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "credit_custodial_deposit",
        { p_deposit_id: existing.id }
      );

      if (rpcError) {
        console.error(`[CreditDeposit] Atomic credit RPC failed:`, rpcError);
        return new Response(
          JSON.stringify({ error: "Balance credit failed", details: rpcError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[CreditDeposit] ✓ Atomic credit result:`, rpcResult);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Deposit credited successfully (atomic)",
          deposit_id: existing.id,
          result: rpcResult,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Credit atomically via the credit_custodial_deposit RPC (FOR UPDATE locking + idempotent ledger)
    console.log(`[CreditDeposit] Calling atomic credit_custodial_deposit for deposit ${deposit.id}`);

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "credit_custodial_deposit",
      { p_deposit_id: deposit.id }
    );

    if (rpcError) {
      console.error(`[CreditDeposit] Atomic credit RPC failed:`, rpcError);
      return new Response(
        JSON.stringify({ error: "Balance credit failed", details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CreditDeposit] ✓ Atomic credit result:`, rpcResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Deposit credited successfully (atomic)",
        deposit_id: deposit.id,
        result: rpcResult,
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
