// Scratch Card Claim Confirmer
// =====================================================================
// DRY-RUN by default (SCRATCH_DRY_RUN=true): confirms/fails a SIMULATED tx
// using a caller-supplied outcome so state transitions can be proven.
//
// LIVE MODE (SCRATCH_DRY_RUN=false): polls the real BSC receipt for the
// batch tx_hash:
//   - not found yet                                  -> { pending: true }
//   - receipt.status === 0 (reverted, nonce consumed) -> fail_batch (retry = NEW nonce)
//   - mined, confirmations < min_confirmations        -> { confirming: true }
//   - mined, confirmations >= min_confirmations       -> confirm_batch with the
//       on-chain Transfer log_index + block number
// The private key is never read here.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { ethers } from "npm:ethers@6";

const DRY_RUN = (Deno.env.get("SCRATCH_DRY_RUN") ?? "true").toLowerCase() !== "false";

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function topicToAddress(topic: string): string {
  return ethers.getAddress("0x" + topic.slice(26));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const batchId: string | undefined = body?.batch_id;
    const outcome: string = body?.outcome ?? "confirm"; // dry-run only: 'confirm' | 'fail'
    const reason: string | undefined = body?.reason;

    if (!batchId || typeof batchId !== "string") {
      return json({ success: false, error: "batch_id required" }, 400);
    }

    // ----- DRY-RUN ------------------------------------------------------
    if (DRY_RUN) {
      if (outcome === "fail") {
        const { data, error } = await supabase.rpc("scratch_card_fail_batch", {
          p_batch_id: batchId,
          p_reason: reason ?? "dry-run simulated failure",
        });
        if (error) return json({ success: false, error: error.message }, 500);
        console.log(`[scratch-confirmer] dry-run FAIL batch=${batchId}`);
        return json({ success: true, dry_run: true, outcome: "fail", result: data });
      }
      const { data, error } = await supabase.rpc("scratch_card_confirm_batch", {
        p_batch_id: batchId,
        p_log_index: typeof body?.log_index === "number" ? body.log_index : 0,
        p_block_number: typeof body?.block_number === "number" ? body.block_number : null,
        p_confirmations: typeof body?.confirmations === "number" ? body.confirmations : null,
      });
      if (error) return json({ success: false, error: error.message }, 500);
      console.log(`[scratch-confirmer] dry-run CONFIRM batch=${batchId}`);
      return json({ success: true, dry_run: true, outcome: "confirm", result: data });
    }

    // ----- LIVE MODE ----------------------------------------------------
    const { data: batch, error: batchErr } = await supabase
      .from("scratch_card_claim_batches")
      .select("id, status, tx_hash, to_address, total_amount_bsk")
      .eq("id", batchId)
      .maybeSingle();
    if (batchErr) return json({ success: false, error: batchErr.message }, 500);
    if (!batch) return json({ success: false, error: "BATCH_NOT_FOUND" }, 404);
    if (batch.status === "confirmed") {
      return json({ success: true, idempotent: true, status: "confirmed" });
    }
    if (batch.status !== "broadcasting") {
      return json({ success: false, error: `BATCH_NOT_BROADCASTING (status=${batch.status})` }, 409);
    }
    if (!batch.tx_hash) return json({ success: false, error: "BATCH_HAS_NO_TX" }, 409);

    const { data: cfg } = await supabase
      .from("scratch_card_config")
      .select("bsk_token_contract, min_confirmations")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const minConf = Number(cfg?.min_confirmations ?? 15);

    const rpcUrl = Deno.env.get("SCRATCH_BSC_RPC_URL")
      ?? Deno.env.get("BSC_RPC_URL")
      ?? "https://bsc-dataseed.binance.org";
    const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId: 56, name: "bsc" });

    const receipt = await provider.getTransactionReceipt(batch.tx_hash);
    if (!receipt) {
      return json({ success: true, pending: true, message: "tx not mined yet" });
    }

    // Reverted -> fail (nonce consumed; retry must use a fresh batch/nonce)
    if (receipt.status === 0) {
      const { data, error } = await supabase.rpc("scratch_card_fail_batch", {
        p_batch_id: batchId,
        p_reason: "on-chain revert (status 0x0)",
      });
      if (error) return json({ success: false, error: error.message }, 500);
      console.log(`[scratch-confirmer] LIVE FAIL (reverted) batch=${batchId} tx=${batch.tx_hash}`);
      return json({ success: true, dry_run: false, outcome: "fail", reverted: true, result: data });
    }

    const head = await provider.getBlockNumber();
    const confirmations = head - receipt.blockNumber + 1;
    if (confirmations < minConf) {
      return json({ success: true, confirming: true, confirmations, required: minConf });
    }

    // Locate the BSK Transfer log to this recipient -> authoritative log_index
    const contract = (cfg?.bsk_token_contract ?? "").toLowerCase();
    const toLower = (batch.to_address ?? "").toLowerCase();
    let logIndex: number | null = null;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contract) continue;
      if (!log.topics?.length || log.topics[0] !== TRANSFER_TOPIC) continue;
      if (log.topics.length >= 3) {
        const to = topicToAddress(log.topics[2]).toLowerCase();
        if (to === toLower) { logIndex = log.index; break; }
      }
    }
    if (logIndex === null) {
      return json({ success: false, error: "TRANSFER_LOG_NOT_FOUND", tx_hash: batch.tx_hash }, 500);
    }

    const { data, error } = await supabase.rpc("scratch_card_confirm_batch", {
      p_batch_id: batchId,
      p_log_index: logIndex,
      p_block_number: receipt.blockNumber,
      p_confirmations: confirmations,
    });
    if (error) return json({ success: false, error: error.message }, 500);

    console.log(`[scratch-confirmer] LIVE CONFIRM batch=${batchId} tx=${batch.tx_hash} logIndex=${logIndex} conf=${confirmations}`);
    return json({
      success: true, dry_run: false, outcome: "confirm",
      tx_hash: batch.tx_hash, log_index: logIndex,
      block_number: receipt.blockNumber, confirmations, result: data,
    });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
