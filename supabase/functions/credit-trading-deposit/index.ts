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
  expectedAssetContract: string | null, // null => native BNB
  expectedToAddress: string,
  expectedAmount: number,
  decimals: number,
  rpcUrl: string
): Promise<{ valid: boolean; error?: string; actualAmount?: number; from?: string; isNative?: boolean; pending?: boolean }> {
  const isNative = !expectedAssetContract;
  try {
    console.log(`[Verify] Checking tx ${txHash} on-chain (native=${isNative})...`);

    const receiptResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash] }),
    });
    const receiptData = await receiptResponse.json();

    if (!receiptData.result) {
      return { valid: false, pending: true, error: "Transaction not yet confirmed on-chain" };
    }

    const receipt = receiptData.result;
    if (receipt.status !== "0x1") {
      return { valid: false, error: "Transaction failed on-chain" };
    }

    const expectedTo = expectedToAddress.toLowerCase();

    // ===== ERC-20 / BEP-20 path =====
    if (!isNative) {
      const expectedContract = expectedAssetContract!.toLowerCase();
      const logs = receipt.logs || [];
      let bestMatch: { actualAmount: number; from: string } | null = null;

      for (const log of logs) {
        if (
          !log.topics ||
          log.topics[0] !== TRANSFER_TOPIC ||
          (log.address || "").toLowerCase() !== expectedContract
        ) continue;

        const fromAddress = "0x" + log.topics[1].slice(26);
        const toAddress = "0x" + log.topics[2].slice(26);
        if (toAddress.toLowerCase() !== expectedTo) continue;

        const amountWei = BigInt(log.data);
        const actualAmount = Number(amountWei) / Math.pow(10, decimals);
        bestMatch = { actualAmount, from: fromAddress };
        break;
      }

      if (!bestMatch) {
        return { valid: false, error: `No matching ${expectedContract.slice(0, 10)} transfer to ${expectedTo} in tx logs` };
      }

      // Always credit the actual on-chain amount (never silently lose value).
      // If actualAmount < expectedAmount * 0.99 → refuse, treat as amount mismatch.
      const ratio = expectedAmount > 0 ? bestMatch.actualAmount / expectedAmount : 1;
      if (ratio < 0.99) {
        return {
          valid: false,
          error: `Amount mismatch: expected ${expectedAmount}, on-chain ${bestMatch.actualAmount}`,
          actualAmount: bestMatch.actualAmount,
          from: bestMatch.from,
        };
      }
      return { valid: true, actualAmount: bestMatch.actualAmount, from: bestMatch.from };
    }

    // ===== Native BNB path =====
    const txResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [txHash] }),
    });
    const txData = await txResponse.json();
    if (!txData.result) {
      return { valid: false, error: "Native tx not found" };
    }
    const tx = txData.result;
    const toAddress = (tx.to || "").toLowerCase();
    if (toAddress !== expectedTo) {
      return { valid: false, error: `Wrong recipient: tx.to=${toAddress} expected=${expectedTo}` };
    }
    const valueWei = BigInt(tx.value || "0");
    const valueBNB = Number(valueWei) / 1e18;
    if (valueBNB <= 0) {
      return { valid: false, error: "Native tx has zero value" };
    }
    const ratio = expectedAmount > 0 ? valueBNB / expectedAmount : 1;
    if (ratio < 0.99) {
      return {
        valid: false,
        error: `BNB amount mismatch: expected ${expectedAmount}, on-chain ${valueBNB}`,
        actualAmount: valueBNB,
        from: tx.from,
      };
    }
    return { valid: true, actualAmount: valueBNB, from: tx.from, isNative: true };

  } catch (error: any) {
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

    // Get the platform Trading hot wallet (STRICT — by purpose, no random fallback)
    let hotWallet: { address: string; label?: string | null } | null = null;
    {
      const { data: byPurpose } = await supabase
        .from("platform_hot_wallet")
        .select("address, label")
        .eq("chain", "BSC")
        .eq("is_active", true)
        .eq("purpose", "trading")
        .limit(1)
        .maybeSingle();
      if (byPurpose?.address) hotWallet = byPurpose;

      if (!hotWallet) {
        const { data: byLabel } = await supabase
          .from("platform_hot_wallet")
          .select("address, label")
          .eq("chain", "BSC")
          .eq("is_active", true)
          .ilike("label", "%Trading%")
          .limit(1)
          .maybeSingle();
        if (byLabel?.address) hotWallet = byLabel;
      }
    }

    if (!hotWallet) {
      console.error(`[CreditDeposit] No Trading Hot Wallet configured`);
      return new Response(
        JSON.stringify({ status: "wrong_recipient", error: "Trading Hot Wallet not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CreditDeposit] Verifying on-chain: asset=${asset.symbol}, contract=${asset.contract_address}, hotWallet=${hotWallet.address}`);

    // KYC pre-check (server-side enforcement)
    const { data: kyc } = await supabase
      .from("kyc_profiles_new")
      .select("final_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (kyc?.final_status !== "approved") {
      return new Response(
        JSON.stringify({ status: "kyc_required", error: "KYC_REQUIRED — approval needed before crediting trading balance" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the transaction on-chain (null contract = native BNB)
    const verification = await verifyOnChainTransfer(
      tx_hash,
      asset.contract_address || null,
      hotWallet.address,
      amount,
      asset.decimals || 18,
      bscRpcUrl
    );

    if (!verification.valid) {
      const status = verification.pending
        ? "pending_confirmations"
        : verification.error?.includes("Wrong recipient")
        ? "wrong_recipient"
        : verification.error?.includes("mismatch")
        ? "amount_mismatch"
        : verification.error?.includes("failed on-chain")
        ? "failed_tx"
        : "verification_failed";
      return new Response(
        JSON.stringify({ status, error: verification.error, details: verification.error }),
        { status: verification.pending ? 202 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ambiguity guard: ensure the on-chain sender belongs uniquely to this user
    const senderLower = (verification.from || from_address).toLowerCase();
    const { data: ownerMatches } = await supabase
      .from("user_wallets")
      .select("user_id")
      .eq("address", senderLower);
    const distinctOwners = new Set((ownerMatches || []).map((r: any) => r.user_id));
    if (distinctOwners.size > 1) {
      return new Response(
        JSON.stringify({ status: "ambiguous_wallet_owner", error: "Sender wallet is linked to multiple accounts; deposit queued for manual review" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (distinctOwners.size === 1 && !distinctOwners.has(user.id)) {
      return new Response(
        JSON.stringify({ status: "wrong_sender", error: "Sender wallet does not belong to authenticated user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
