// Hot Wallet Solvency Verification Edge Function
// Reads live on-chain BNB + BEP-20 balances and returns token-wise solvency proofs.
// Also detects refill transactions and writes audit snapshots.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const HOT_WALLET = "0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5";
const RPC_POOL = [
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function getProvider(): Promise<ethers.JsonRpcProvider> {
  for (const rpc of RPC_POOL) {
    try {
      const p = new ethers.JsonRpcProvider(rpc);
      await p.getBlockNumber();
      return p;
    } catch (_) {
      continue;
    }
  }
  throw new Error("All BSC RPCs failed");
}

async function fetchOnChainBalances(
  assets: Array<{ symbol: string; contract_address: string | null }>,
): Promise<Record<string, number>> {
  const provider = await getProvider();
  const out: Record<string, number> = {};

  // BNB
  try {
    const bnb = await provider.getBalance(HOT_WALLET);
    out["BNB"] = Number(ethers.formatEther(bnb));
  } catch (e) {
    console.error("BNB balance fetch failed:", e);
    out["BNB"] = 0;
  }

  for (const a of assets) {
    if (!a.contract_address) continue;
    try {
      const c = new ethers.Contract(
        ethers.getAddress(a.contract_address),
        ERC20_ABI,
        provider,
      );
      const [bal, dec] = await Promise.all([
        c.balanceOf(HOT_WALLET),
        c.decimals(),
      ]);
      out[a.symbol] = Number(ethers.formatUnits(bal, dec));
    } catch (e) {
      console.error(`Balance fetch failed for ${a.symbol}:`, e);
      out[a.symbol] = 0;
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Authenticated user check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Admin check
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(
      JSON.stringify({ error: "Admin role required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "snapshot";
    const persist = url.searchParams.get("persist") === "true";

    // Get tracked assets
    const { data: assets } = await admin
      .from("assets")
      .select("symbol, contract_address")
      .in("symbol", ["USDT", "BSK", "IPG", "USDI", "BNB"]);

    if (!assets) throw new Error("Could not load assets");

    const onchain = await fetchOnChainBalances(assets);

    // Compute solvency for each asset
    const results: any[] = [];
    for (const a of assets) {
      const balance = onchain[a.symbol] ?? 0;
      const { data: solv, error: sErr } = await admin.rpc(
        "compute_token_solvency",
        {
          p_asset_symbol: a.symbol,
          p_actual_onchain_balance: balance,
        },
      );
      if (sErr) {
        console.error(`Solvency compute failed for ${a.symbol}:`, sErr);
        continue;
      }
      const row = Array.isArray(solv) ? solv[0] : solv;
      if (!row) continue;

      // Detect drift users for this asset
      const { data: driftUsers } = await admin.rpc(
        "detect_balance_drift_users",
        { p_asset_symbol: a.symbol },
      );
      const driftCount = (driftUsers || []).length;
      const totalDrift = (driftUsers || []).reduce(
        (s: number, u: any) => s + Math.abs(Number(u.total_drift) || 0),
        0,
      );

      const enriched = {
        ...row,
        wallet_address: HOT_WALLET,
        drift_users_count: driftCount,
        total_drift_amount: totalDrift,
      };
      results.push(enriched);

      if (persist) {
        await admin.from("hot_wallet_solvency_snapshots").insert({
          asset_symbol: a.symbol,
          user_available: row.user_available,
          user_locked: row.user_locked,
          total_user_liability: row.total_user_liability,
          pending_withdrawals: row.pending_withdrawals,
          platform_fees_owed: row.platform_fees_owed,
          required_balance: row.required_balance,
          actual_onchain_balance: row.actual_onchain_balance,
          surplus_or_deficit: row.surplus_or_deficit,
          status: row.status,
          drift_users_count: driftCount,
          total_drift_amount: totalDrift,
          metadata: { wallet: HOT_WALLET },
        });

        // Auto-trigger circuit breaker if insolvent
        if (row.status === "insolvent") {
          await admin.rpc("set_withdrawal_circuit_breaker", {
            p_asset_symbol: a.symbol,
            p_freeze: true,
            p_reason: `Auto: insolvency detected (deficit ${row.surplus_or_deficit})`,
            p_drift_amount: row.surplus_or_deficit,
            p_drift_percent: row.required_balance > 0
              ? (Number(row.surplus_or_deficit) / Number(row.required_balance)) * 100
              : null,
          });
        } else if (row.status === "solvent") {
          // Auto-release breaker if solvent
          const { data: breaker } = await admin
            .from("withdrawal_circuit_breaker")
            .select("id, is_frozen, frozen_reason")
            .eq("asset_symbol", a.symbol)
            .eq("is_frozen", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (breaker && breaker.frozen_reason?.startsWith("Auto:")) {
            await admin.rpc("set_withdrawal_circuit_breaker", {
              p_asset_symbol: a.symbol,
              p_freeze: false,
              p_reason: "Auto: solvency restored",
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        wallet: HOT_WALLET,
        snapshot_at: new Date().toISOString(),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("hot-wallet-solvency error:", e);
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
