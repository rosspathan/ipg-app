// Read-only hot-wallet solvency snapshot.
// - Admin-only (has_role check)
// - NEVER mutates wallet_balances or trading_balance_ledger
// - May insert one snapshot row per asset into hot_wallet_solvency_snapshots
// - Reads on-chain balances of the active Trading Hot Wallet via BSC RPC

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RPC_POOL = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/",
  "https://bsc.publicnode.com",
  "https://rpc.ankr.com/bsc",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function pickProvider(): Promise<ethers.JsonRpcProvider> {
  for (const url of RPC_POOL) {
    try {
      const p = new ethers.JsonRpcProvider(url);
      await p.getBlockNumber();
      return p;
    } catch (_) {}
  }
  throw new Error("All BSC RPCs failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      auth.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userId, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hot wallet
    const { data: hw } = await admin
      .from("platform_hot_wallet")
      .select("address,label")
      .eq("is_active", true)
      .eq("purpose", "trading")
      .maybeSingle();
    if (!hw?.address) {
      return new Response(JSON.stringify({ error: "No active trading hot wallet" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assets to snapshot
    const { data: assets } = await admin
      .from("assets")
      .select("id,symbol,decimals,contract_address,is_active")
      .eq("is_active", true)
      .in("symbol", ["USDT", "IPG", "BSK", "SSS", "USDI", "USDS", "BNB"]);

    const provider = await pickProvider();

    const SYSTEM_ACCOUNT = "00000000-0000-0000-0000-000000000001";
    const out: any[] = [];

    for (const a of assets ?? []) {
      // On-chain balance
      let onchain = 0n;
      let onchainDec = a.decimals ?? 18;
      try {
        if (!a.contract_address) {
          // Native BNB
          onchain = await provider.getBalance(hw.address);
          onchainDec = 18;
        } else {
          const c = new ethers.Contract(a.contract_address, ERC20_ABI, provider);
          onchain = await c.balanceOf(hw.address);
          try { onchainDec = Number(await c.decimals()); } catch (_) {}
        }
      } catch (e) {
        console.error(`[solvency] on-chain read failed for ${a.symbol}:`, e);
      }
      const onchainNum = Number(ethers.formatUnits(onchain, onchainDec));

      // User liabilities (exclude system/treasury account)
      const { data: balRows } = await admin
        .from("wallet_balances")
        .select("user_id,available,locked")
        .eq("asset_id", a.id);
      let userAvail = 0, userLock = 0, treasuryAvail = 0;
      for (const r of balRows ?? []) {
        const av = Number(r.available || 0), lo = Number(r.locked || 0);
        if (r.user_id === SYSTEM_ACCOUNT) { treasuryAvail += av; }
        else { userAvail += av; userLock += lo; }
      }

      // Pending withdrawals
      const { data: pend } = await admin
        .from("custodial_withdrawals")
        .select("amount,fee_amount,status")
        .eq("asset_id", a.id)
        .in("status", ["pending", "processing", "broadcasting"]);
      const pendingAmt = (pend ?? []).reduce(
        (s, r) => s + Number(r.amount || 0) + Number(r.fee_amount || 0), 0);

      const required = userAvail + userLock + pendingAmt; // treasury excluded — internal
      const surplus = onchainNum - required;

      // Drift impact (ledger vs wb)
      const { data: drift } = await admin
        .from("admin_recon_unexplained_drift_by_asset")
        .select("drift_available,drift_locked")
        .eq("asset_symbol", a.symbol)
        .maybeSingle();

      const row = {
        asset_symbol: a.symbol,
        user_available: userAvail,
        user_locked: userLock,
        total_user_liability: userAvail + userLock,
        pending_withdrawals: pendingAmt,
        platform_fees_owed: treasuryAvail,
        required_balance: required,
        actual_onchain_balance: onchainNum,
        surplus_or_deficit: surplus,
        status: surplus >= 0 ? "SOLVENT" : "UNDER_BACKED",
        drift_users_count: 0,
        total_drift_amount: drift ? Number(drift.drift_available || 0) : 0,
        metadata: {
          hot_wallet_address: hw.address,
          hot_wallet_label: hw.label,
          contract_address: a.contract_address,
          drift_locked: drift?.drift_locked ?? 0,
        },
        snapshot_at: new Date().toISOString(),
      };

      // Persist snapshot (insert only — never update balances)
      const { error: insErr } = await admin
        .from("hot_wallet_solvency_snapshots")
        .insert(row);
      if (insErr) console.error("[solvency] snapshot insert failed:", insErr);

      out.push(row);
    }

    // Audit
    await admin.rpc("log_admin_action", {
      _action: "hot_wallet_solvency_snapshot",
      _resource_type: "hot_wallet_solvency_snapshots",
      _resource_id: null,
      _new_values: { count: out.length, hot_wallet: hw.address },
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, snapshots: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[admin-snapshot-hot-wallet-solvency]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
