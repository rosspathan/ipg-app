// Walks pending custodial_deposits, refreshes confirmations via BSC RPC,
// and credits any deposit that has reached the required confirmation threshold.
//
// Why this exists:
// monitor-custodial-deposits only refreshes confirmations for transactions
// it discovers inside its recent-block scan window (~2 min × 250 blocks).
// Once a tx with a low confirmation count rolls out of that window without
// reaching the required threshold, no other path updates the `confirmations`
// field — the row sits forever at `pending` even though the chain has many
// thousands of confirmations. This reconciler closes that gap.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prioritized BSC RPC pool (mirrors the project standard).
const BSC_RPCS = [
  "https://bsc-dataseed.bnbchain.org/",
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc-dataseed3.binance.org/",
  "https://bsc-dataseed4.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed2.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/",
  "https://bsc-dataseed2.ninicoin.io/",
  "https://rpc.ankr.com/bsc",
];

async function rpcCall(method: string, params: unknown[]): Promise<any> {
  let lastErr: unknown = null;
  for (const url of BSC_RPCS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      if (json.error) {
        lastErr = new Error(json.error.message ?? "rpc error");
        continue;
      }
      return json.result;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("All RPCs failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Pull pending deposits with a tx_hash older than 1 minute (give the
    // primary monitor a chance first) and younger than 14 days (don't
    // re-scan ancient noise).
    const { data: pending, error: fetchErr } = await supabase
      .from("custodial_deposits")
      .select("id, tx_hash, status, confirmations, required_confirmations, created_at")
      .eq("status", "pending")
      .is("credited_at", null)
      .not("tx_hash", "is", null)
      .lt("created_at", new Date(Date.now() - 60_000).toISOString())
      .gt("created_at", new Date(Date.now() - 14 * 24 * 3600_000).toISOString())
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchErr) throw fetchErr;

    if (!pending || pending.length === 0) {
      console.log("[refresh-pending-custodial-deposits] No pending rows to refresh.");
      return new Response(JSON.stringify({ ok: true, scanned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[refresh-pending-custodial-deposits] Refreshing ${pending.length} pending rows.`);

    // Fetch current block once for the whole batch.
    const currentBlockHex = await rpcCall("eth_blockNumber", []);
    const currentBlock = parseInt(currentBlockHex, 16);

    let refreshed = 0;
    let credited = 0;
    let failed = 0;
    let notMined = 0;
    let reverted = 0;

    for (const row of pending) {
      try {
        const required = row.required_confirmations ?? 3;
        const receipt = await rpcCall("eth_getTransactionReceipt", [row.tx_hash]);

        if (!receipt || !receipt.blockNumber) {
          notMined++;
          await supabase
            .from("custodial_deposits")
            .update({
              status: "pending",
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          continue;
        }

        if (receipt.status && receipt.status !== "0x1") {
          // Tx reverted on-chain — surface it instead of leaving it pending forever.
          reverted++;
          await supabase
            .from("custodial_deposits")
            .update({
              status: "failed",
              admin_notes: "Transaction reverted on-chain (status 0x0)",
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          await supabase
            .from("internal_balance_transfers")
            .update({
              status: "failed",
              status_detail: "Transaction failed on-chain",
              updated_at: new Date().toISOString(),
            })
            .eq("tx_hash", row.tx_hash)
            .eq("direction", "to_trading")
            .neq("status", "success");
          continue;
        }

        const txBlock = parseInt(receipt.blockNumber, 16);
        const confirmations = Math.max(0, currentBlock - txBlock);
        const reached = confirmations >= required;

        const { error: updErr } = await supabase
          .from("custodial_deposits")
          .update({
            confirmations,
            status: reached ? "confirmed" : "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (updErr) throw updErr;

        if (reached) {
          const { data: creditRes, error: creditErr } = await supabase.rpc(
            "credit_custodial_deposit",
            { p_deposit_id: row.id },
          );
          if (creditErr) {
            failed++;
            console.error(`[refresh-pending-custodial-deposits] credit failed for ${row.id}:`, creditErr);
          } else {
            credited++;
            console.log(`[refresh-pending-custodial-deposits] credited ${row.id}:`, creditRes);
          }
        } else {
          // Surface progress in the user-visible status_detail of the linked IBT.
          await supabase
            .from("internal_balance_transfers")
            .update({
              status_detail: `Waiting for blockchain confirmation (${confirmations}/${required})`,
              updated_at: new Date().toISOString(),
            })
            .eq("tx_hash", row.tx_hash)
            .eq("direction", "to_trading")
            .neq("status", "success");
        }
        refreshed++;
      } catch (e) {
        failed++;
        console.error(`[refresh-pending-custodial-deposits] row ${row.id} failed:`, e);
      }
    }

    const summary = {
      ok: true,
      scanned: pending.length,
      refreshed,
      credited,
      reverted,
      not_mined: notMined,
      failed,
      current_block: currentBlock,
    };
    console.log("[refresh-pending-custodial-deposits] Done:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[refresh-pending-custodial-deposits] Fatal:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
