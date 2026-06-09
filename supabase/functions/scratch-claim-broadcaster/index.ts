// Scratch Card Claim Broadcaster
// =====================================================================
// PHASE 2A — DRY-RUN ONLY. Default SCRATCH_DRY_RUN=true.
//   * No real BSC transaction is broadcast.
//   * No private key is read or logged.
//   * A safe simulated tx_hash is generated so the full lifecycle and the
//     onchain_transactions dedup path can be proven without moving funds.
//
// LIVE MODE (Phase 2B) is intentionally BLOCKED here until separately approved
// ("Approve Scratch Card Live Broadcasting"). The live nonce/gas rules are
// documented below so the design is locked before any key is ever added.
//
// ---------------------------------------------------------------------
// LIVE-MODE NONCE / RETRY RULES (Phase 2B design — NOT executed in 2A):
//   1. PENDING / STUCK (tx in mempool, not mined): re-broadcast is allowed
//      using the SAME nonce with a higher gas price (replacement tx). This
//      cannot create a duplicate because only one tx per nonce can ever mine.
//   2. MINED BUT REVERTED (receipt.status === 0x0): the nonce is CONSUMED.
//      A retry MUST use a NEW nonce / NEW transaction. We mark the batch
//      failed (cards return to claimable) and a fresh batch gets a fresh nonce.
//   3. NOT FOUND AFTER TIMEOUT: we do NOT blindly re-broadcast. We first read
//      the on-chain account nonce. If the pending nonce has already advanced,
//      the tx may be late-mining — we keep polling that exact tx_hash and never
//      issue a second transfer for the same nonce. Only if the account nonce is
//      unchanged AND the tx is absent do we replace it (same nonce). This
//      eliminates the late-mined duplicate-payout risk.
// ---------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DRY_RUN = (Deno.env.get("SCRATCH_DRY_RUN") ?? "true").toLowerCase() !== "false";

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

    if (!DRY_RUN) {
      // ----- LIVE MODE (Phase 2B) — intentionally disabled in Phase 2A -----
      // Real signing would happen here using SCRATCH_HOTWALLET_PRIVATE_KEY.
      // That key is NEVER read or logged in Phase 2A.
      return json(
        { success: false, error: "LIVE_MODE_NOT_APPROVED", message: "Set SCRATCH_DRY_RUN!=false only after Phase 2B approval." },
        403,
      );
    }

    // ----- DRY-RUN: simulate broadcast (no funds moved, no key read) -----
    const txHash = await simulatedTxHash(batchId);
    // Nonce/gas in dry-run are simulated placeholders to prove the design path.
    const simulatedNonce = 0;

    const { data: rpcData, error: rpcErr } = await supabase.rpc("scratch_card_mark_broadcasting", {
      p_batch_id: batchId,
      p_tx_hash: txHash,
      p_nonce: simulatedNonce,
    });

    if (rpcErr) return json({ success: false, error: rpcErr.message }, 500);

    // NOTE: never log private key material — none exists in dry-run.
    console.log(`[scratch-broadcaster] dry-run broadcast batch=${batchId} tx=${txHash}`);

    return json({ success: true, dry_run: true, batch_id: batchId, tx_hash: txHash, rpc: rpcData });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
