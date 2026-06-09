// Scratch Card Claim Confirmer
// =====================================================================
// PHASE 2A — DRY-RUN / TEST MODE ONLY.
//   * Confirms or fails a SIMULATED transaction.
//   * On simulated confirm: reserved BSK -> distributed BSK (treasury RPC).
//   * On simulated fail: reserve untouched, cards return to claimable.
//   * No chain RPC is queried in dry-run; outcome is supplied by the caller
//     so state transitions can be proven deterministically.
//
// LIVE MODE (Phase 2B) would instead poll the real receipt:
//   - receipt.status === 0x1 && confirmations >= required  -> confirm_batch
//   - receipt.status === 0x0 (reverted, nonce consumed)    -> fail_batch (retry uses NEW nonce)
//   - not found after timeout                               -> keep polling tx_hash; never double-send
// Live mode is BLOCKED until "Approve Scratch Card Live Broadcasting".

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DRY_RUN = (Deno.env.get("SCRATCH_DRY_RUN") ?? "true").toLowerCase() !== "false";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
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
    const outcome: string = body?.outcome ?? "confirm"; // 'confirm' | 'fail'
    const reason: string | undefined = body?.reason;

    if (!batchId || typeof batchId !== "string") {
      return json({ success: false, error: "batch_id required" }, 400);
    }

    if (!DRY_RUN) {
      // LIVE MODE (Phase 2B): would poll the real receipt here. Blocked in 2A.
      return json(
        { success: false, error: "LIVE_MODE_NOT_APPROVED", message: "Receipt polling enabled only after Phase 2B approval." },
        403,
      );
    }

    if (outcome === "fail") {
      const { data, error } = await supabase.rpc("scratch_card_fail_batch", {
        p_batch_id: batchId,
        p_reason: reason ?? "dry-run simulated failure",
      });
      if (error) return json({ success: false, error: error.message }, 500);
      console.log(`[scratch-confirmer] dry-run FAIL batch=${batchId}`);
      return json({ success: true, dry_run: true, outcome: "fail", result: data });
    }

    // Default: simulate a successful confirmation
    const { data, error } = await supabase.rpc("scratch_card_confirm_batch", {
      p_batch_id: batchId,
      p_log_index: typeof body?.log_index === "number" ? body.log_index : 0,
      p_block_number: typeof body?.block_number === "number" ? body.block_number : null,
      p_confirmations: typeof body?.confirmations === "number" ? body.confirmations : null,
    });
    if (error) return json({ success: false, error: error.message }, 500);
    console.log(`[scratch-confirmer] dry-run CONFIRM batch=${batchId}`);
    return json({ success: true, dry_run: true, outcome: "confirm", result: data });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
