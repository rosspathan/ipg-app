// Scratch Card Auto-Claim Orchestrator
// =====================================================================
// Authenticated. The signed-in user claims a single revealed (claimable)
// card. Steps, server-side:
//   1. scratch_card_create_claim_batch([card_id])  (runs as the user via JWT)
//   2. invoke scratch-claim-broadcaster (service role) -> signs/broadcasts
//      the real BSK transfer (when SCRATCH_DRY_RUN=false) or simulates it.
//   3. return { batch_id, tx_hash }.
//
// The confirmer (cron) advances the batch to 'confirmed' once mined.
// The private key is never read or handled here.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- Authn: require a logged-in user ---
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ success: false, error: "UNAUTHENTICATED" }, 401);
    }

    // Client scoped to the caller (so auth.uid() resolves inside the RPC)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ success: false, error: "INVALID_SESSION" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const cardId: string | undefined = body?.card_id;
    if (!cardId || typeof cardId !== "string") {
      return json({ success: false, error: "card_id required" }, 400);
    }

    // --- 1. Create the claim batch as the user (validates ownership/KYC/wallet) ---
    const { data: batchData, error: batchErr } = await userClient.rpc(
      "scratch_card_create_claim_batch",
      { p_card_ids: [cardId] },
    );
    if (batchErr) {
      return json({ success: false, error: batchErr.message }, 400);
    }
    const batchId: string | undefined = (batchData as { batch_id?: string })?.batch_id;
    if (!batchId) {
      return json({ success: false, error: "BATCH_NOT_CREATED", detail: batchData }, 500);
    }

    // --- 2. Broadcast (service role) ---
    const bcResp = await fetch(`${SUPABASE_URL}/functions/v1/scratch-claim-broadcaster`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ batch_id: batchId }),
    });
    const bcJson = await bcResp.json().catch(() => ({}));

    if (!bcResp.ok || !bcJson?.success) {
      // Broadcast failed: release the cards back to claimable so the user can retry.
      const svc = createClient(SUPABASE_URL, SERVICE_KEY);
      await svc.rpc("scratch_card_fail_batch", {
        p_batch_id: batchId,
        p_reason: `broadcast failed: ${bcJson?.error ?? bcResp.status}`,
      });
      return json({
        success: false,
        error: "BROADCAST_FAILED",
        detail: bcJson?.error ?? `status ${bcResp.status}`,
        batch_id: batchId,
      }, 502);
    }

    return json({
      success: true,
      batch_id: batchId,
      tx_hash: bcJson.tx_hash ?? null,
      dry_run: bcJson.dry_run ?? null,
      total_amount_bsk: (batchData as { total_amount_bsk?: number })?.total_amount_bsk ?? null,
      to_address: (batchData as { to_address?: string })?.to_address ?? null,
    });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
