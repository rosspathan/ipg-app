// Scratch Card Claim Broadcaster
// =====================================================================
// DRY-RUN by default (SCRATCH_DRY_RUN=true). Set SCRATCH_DRY_RUN=false ONLY
// for an explicitly approved live test. In dry-run, no real BSC transaction
// is broadcast and no private key is read.
//
// LIVE MODE (Phase 2B) — enabled after "Approve Scratch Card Live Broadcasting".
//   * Signs a real BSK BEP20 `transfer` from the scratch hot wallet to the
//     batch recipient using SCRATCH_HOTWALLET_PRIVATE_KEY.
//   * The private key is NEVER logged, returned, or stored anywhere.
//
// ---------------------------------------------------------------------
// LIVE-MODE NONCE / RETRY RULES (design — enforced by mark_broadcasting idempotency):
//   1. PENDING / STUCK (tx in mempool, not mined): re-broadcast is allowed
//      using the SAME nonce with a higher gas price (replacement tx). Only one
//      tx per nonce can ever mine, so this cannot create a duplicate.
//   2. MINED BUT REVERTED (receipt.status === 0x0): the nonce is CONSUMED.
//      A retry MUST use a NEW nonce / NEW transaction. The batch is failed
//      (cards return to claimable) and a fresh batch gets a fresh nonce.
//   3. NOT FOUND AFTER TIMEOUT: do NOT blindly re-broadcast. Read the on-chain
//      account nonce; if it advanced, keep polling that exact tx_hash. Only if
//      the account nonce is unchanged AND the tx is absent do we replace it
//      (same nonce). Eliminates the late-mined duplicate-payout risk.
// ---------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { ethers } from "npm:ethers@6";

const DRY_RUN = (Deno.env.get("SCRATCH_DRY_RUN") ?? "true").toLowerCase() !== "false";

// Hard safety cap for the live path: a single batch can never move more than
// this many BSK. Protects against a mis-seeded batch draining the hot wallet.
const LIVE_MAX_BATCH_BSK = 25;

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// Deterministic, clearly-tagged simulated hash (idempotent per batch).
async function simulatedTxHash(batchId: string): Promise<string> {
  const data = new TextEncoder().encode(`scratch-dry-run:${batchId}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`; // 0x + 64 hex chars, shaped like a real tx hash
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
    if (!batchId || typeof batchId !== "string") {
      return json({ success: false, error: "batch_id required" }, 400);
    }

    // Load batch
    const { data: batch, error: batchErr } = await supabase
      .from("scratch_card_claim_batches")
      .select("id, status, total_amount_bsk, tx_hash, to_address")
      .eq("id", batchId)
      .maybeSingle();

    if (batchErr) return json({ success: false, error: batchErr.message }, 500);
    if (!batch) return json({ success: false, error: "BATCH_NOT_FOUND" }, 404);

    // Idempotency: already broadcast
    if (batch.tx_hash) {
      return json({ success: true, idempotent: true, dry_run: DRY_RUN, tx_hash: batch.tx_hash });
    }
    if (batch.status !== "building") {
      return json({ success: false, error: `BATCH_NOT_BUILDABLE (status=${batch.status})` }, 409);
    }

    // ----- DRY-RUN: simulate broadcast (no funds moved, no key read) -----
    if (DRY_RUN) {
      const txHash = await simulatedTxHash(batchId);
      const simulatedNonce = 0;
      const { data: rpcData, error: rpcErr } = await supabase.rpc("scratch_card_mark_broadcasting", {
        p_batch_id: batchId,
        p_tx_hash: txHash,
        p_nonce: simulatedNonce,
      });
      if (rpcErr) return json({ success: false, error: rpcErr.message }, 500);
      console.log(`[scratch-broadcaster] dry-run broadcast batch=${batchId} tx=${txHash}`);
      return json({ success: true, dry_run: true, batch_id: batchId, tx_hash: txHash, rpc: rpcData });
    }

    // ----- LIVE MODE -----------------------------------------------------
    const pk = Deno.env.get("SCRATCH_HOTWALLET_PRIVATE_KEY");
    if (!pk) {
      return json({ success: false, error: "HOTWALLET_KEY_MISSING" }, 500);
    }

    // Load config (contract, decimals, hot wallet address, gas floor)
    const { data: cfg, error: cfgErr } = await supabase
      .from("scratch_card_config")
      .select("bsk_token_contract, bsk_token_decimals, scratch_wallet_address, bnb_gas_floor")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (cfgErr) return json({ success: false, error: cfgErr.message }, 500);
    if (!cfg?.bsk_token_contract) return json({ success: false, error: "BSK_CONTRACT_NOT_CONFIGURED" }, 500);

    const toAddress: string | null = batch.to_address;
    if (!toAddress || !/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      return json({ success: false, error: "BATCH_RECIPIENT_INVALID" }, 400);
    }

    const totalBsk = Number(batch.total_amount_bsk);
    if (!(totalBsk > 0)) return json({ success: false, error: "BATCH_AMOUNT_INVALID" }, 400);
    if (totalBsk > LIVE_MAX_BATCH_BSK) {
      return json({ success: false, error: `BATCH_AMOUNT_OVER_CAP (>${LIVE_MAX_BATCH_BSK})` }, 400);
    }

    const rpcUrl = Deno.env.get("SCRATCH_BSC_RPC_URL")
      ?? Deno.env.get("BSC_RPC_URL")
      ?? "https://bsc-dataseed.binance.org";

    const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId: 56, name: "bsc" });

    // Confirm chain id is BSC mainnet
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== 56) {
      return json({ success: false, error: `WRONG_CHAIN (${net.chainId})` }, 500);
    }

    const wallet = new ethers.Wallet(pk, provider);

    // Safety: the signing key MUST match the configured scratch hot wallet.
    if (cfg.scratch_wallet_address &&
        wallet.address.toLowerCase() !== cfg.scratch_wallet_address.toLowerCase()) {
      return json({ success: false, error: "KEY_ADDRESS_MISMATCH" }, 500);
    }

    // Gas floor check
    const bnbWei = await provider.getBalance(wallet.address);
    const bnbFloor = ethers.parseEther(String(cfg.bnb_gas_floor ?? "0.005"));
    if (bnbWei < bnbFloor) {
      return json({ success: false, error: "INSUFFICIENT_GAS", bnb: ethers.formatEther(bnbWei) }, 400);
    }

    const decimals = Number(cfg.bsk_token_decimals ?? 18);
    const amount = ethers.parseUnits(String(batch.total_amount_bsk), decimals);

    const token = new ethers.Contract(cfg.bsk_token_contract, ERC20_ABI, wallet);

    // BSK balance check
    const bskBal: bigint = await token.balanceOf(wallet.address);
    if (bskBal < amount) {
      return json({ success: false, error: "INSUFFICIENT_BSK", have: bskBal.toString(), need: amount.toString() }, 400);
    }

    // Use pending nonce for the send
    const nonce = await provider.getTransactionCount(wallet.address, "pending");

    // Sign + broadcast the real transfer (private key never logged)
    const tx = await token.transfer(toAddress, amount, { nonce });
    const txHash = tx.hash;

    // Record the broadcast FIRST (Option B dedup); idempotent in the RPC.
    const { data: rpcData, error: rpcErr } = await supabase.rpc("scratch_card_mark_broadcasting", {
      p_batch_id: batchId,
      p_tx_hash: txHash,
      p_nonce: nonce,
    });
    if (rpcErr) {
      // The tx is already on-chain; surface the hash so the confirmer can finish.
      console.error(`[scratch-broadcaster] mark_broadcasting failed after send tx=${txHash}: ${rpcErr.message}`);
      return json({ success: false, error: rpcErr.message, tx_hash: txHash, warning: "TX_SENT_RECORD_FAILED" }, 500);
    }

    console.log(`[scratch-broadcaster] LIVE broadcast batch=${batchId} tx=${txHash} nonce=${nonce}`);
    return json({ success: true, dry_run: false, batch_id: batchId, tx_hash: txHash, nonce, rpc: rpcData });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
