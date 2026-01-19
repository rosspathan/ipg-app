import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IndexRequest = {
  lookbackHours?: number;
  forceRefresh?: boolean;
};

type IndexResponse = {
  success: boolean;
  indexed: number;
  provider?: "bscscan";
  wallet?: string;
  duration_ms?: number;
  cached?: boolean;
  throttled?: boolean;
  error?: string;
  error_code?: string;
};

type AssetRow = {
  contract_address: string | null;
  symbol: string;
  name: string;
  decimals: number | null;
  logo_url: string | null;
};

type BscScanTokenTransfer = {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenDecimal: string;
  blockNumber: string;
  timeStamp: string;
  contractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  gasPrice: string;
  gasUsed: string;
  nonce: string;
  transactionIndex: string;
  logIndex?: string;
};

const CACHE_TTL_MS = 30_000;
const resultCache = new Map<string, { ts: number; payload: IndexResponse }>();
const inFlight = new Map<string, number>();

const ASSET_CACHE_TTL_MS = 5 * 60_000;
let assetCache: { ts: number; map: Map<string, AssetRow> } | null = null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isAddress = (val: unknown): val is string =>
  typeof val === "string" && /^0x[a-fA-F0-9]{40}$/.test(val);

// Best-effort decode to get the user id quickly.
// NOTE: This does not cryptographically verify the JWT; verify_jwt is disabled in config.
const decodeJwtSub = (jwt: string): string | null => {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const jsonStr = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(jsonStr);
    return typeof obj?.sub === "string" ? obj.sub : null;
  } catch {
    return null;
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  let wallet = "";

  try {
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
    if (!bearerMatch) {
      return json({ success: false, error: "Unauthorized", error_code: "UNAUTHORIZED", indexed: 0 }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[index-bep20] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
      return json({ success: false, error: "Server misconfigured", error_code: "SERVER_ERROR", indexed: 0 }, 500);
    }

    const bscscanApiKey = Deno.env.get("BSCSCAN_API_KEY") ?? "";
    if (!bscscanApiKey) {
      return json({
        success: false,
        error_code: "NO_API_KEY",
        error: "BscScan API key not configured.",
        indexed: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    const token = bearerMatch[1];
    const userId = decodeJwtSub(token);
    if (!userId) {
      return json({ success: false, error: "Invalid token", error_code: "INVALID_TOKEN", indexed: 0 }, 401);
    }

    const { lookbackHours = 168, forceRefresh = false }: IndexRequest = await req.json().catch(() => ({}));

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    if (!supabaseServiceKey) {
      console.error("[index-bep20] Missing SUPABASE_SERVICE_ROLE_KEY (required for upserts)");
      return json({ success: false, error: "Server misconfigured", error_code: "MISSING_SERVICE_KEY", indexed: 0 }, 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Resolve wallet address
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("wallet_address, wallet_addresses, bsc_wallet_address")
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    let evmAddress: string | null =
      (profile?.bsc_wallet_address ||
        profile?.wallet_addresses?.["bsc-mainnet"] ||
        profile?.wallet_addresses?.["bsc"] ||
        profile?.wallet_address) ??
      null;

    if (!isAddress(evmAddress)) {
      const { data: uw } = await supabaseClient
        .from("user_wallets")
        .select("wallet_address")
        .eq("user_id", userId)
        .order("last_used_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (isAddress(uw?.wallet_address)) evmAddress = uw.wallet_address;
    }

    if (!isAddress(evmAddress)) {
      const { data: wu } = await supabaseClient
        .from("wallets_user")
        .select("address, chain, is_primary")
        .eq("user_id", userId)
        .order("is_primary", { ascending: false })
        .limit(10);

      const preferred = (wu || []).find((w: any) => {
        const chain = String(w?.chain || "").toLowerCase();
        return isAddress(w?.address) && (chain.includes("bsc") || chain.includes("bep20") || chain.includes("evm"));
      });
      const chosen = preferred?.address || (wu || []).find((w: any) => isAddress(w?.address))?.address;
      if (isAddress(chosen)) evmAddress = chosen;
    }

    if (!isAddress(evmAddress)) {
      return json({
        success: false,
        error_code: "NO_WALLET_ADDRESS",
        error: "No BSC wallet address found. Please set up your wallet first.",
        indexed: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    wallet = evmAddress.toLowerCase();
    const walletShort = `${wallet.slice(0, 10)}...`;

    const cacheKey = `${userId}:${wallet}:${lookbackHours}`;

    // Hard server-side dedupe: even if the client sets forceRefresh=true, we don't allow
    // repeated heavy runs within the TTL (prevents WORKER_LIMIT cascades).
    const cached = resultCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return json({ ...cached.payload, cached: true, duration_ms: Date.now() - startTime });
    }

    const inflightAt = inFlight.get(cacheKey);
    if (inflightAt && Date.now() - inflightAt < CACHE_TTL_MS) {
      return json({
        success: false,
        throttled: true,
        error_code: "IN_PROGRESS",
        error: "Sync already in progress. Please wait a few seconds and try again.",
        indexed: 0,
        wallet: walletShort,
        duration_ms: Date.now() - startTime,
      }, 202);
    }

    inFlight.set(cacheKey, Date.now());

    try {
      // Assets cache (optional enrichment)
      let assetMap: Map<string, AssetRow>;
      if (assetCache && Date.now() - assetCache.ts < ASSET_CACHE_TTL_MS) {
        assetMap = assetCache.map;
      } else {
        const { data: assets } = await supabaseClient
          .from("assets")
          .select("contract_address, symbol, name, decimals, logo_url")
          .not("contract_address", "is", null)
          .eq("is_active", true);

        const map = new Map<string, AssetRow>();
        (assets as AssetRow[] | null | undefined)?.forEach((a) => {
          if (a.contract_address) map.set(a.contract_address.toLowerCase(), a);
        });

        assetCache = { ts: Date.now(), map };
        assetMap = map;
      }

      const lookbackTimestamp = Math.floor(Date.now() / 1000) - lookbackHours * 3600;

      const bscscanUrl =
        `https://api.bscscan.com/api?module=account&action=tokentx` +
        `&address=${wallet}` +
        `&startblock=0&endblock=999999999&page=1&offset=50&sort=desc` +
        `&apikey=${bscscanApiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8_000);

      const resp = await fetch(bscscanUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      const payload = await resp.json();

      if (payload?.message === "No transactions found") {
        const out: IndexResponse = {
          success: true,
          indexed: 0,
          provider: "bscscan",
          wallet: walletShort,
          duration_ms: Date.now() - startTime,
        };
        resultCache.set(cacheKey, { ts: Date.now(), payload: out });
        return json(out);
      }

      if (payload?.status !== "1" || !Array.isArray(payload?.result)) {
        const out: IndexResponse = {
          success: false,
          indexed: 0,
          provider: "bscscan",
          wallet: walletShort,
          error_code: "API_ERROR",
          error: `BscScan API error: ${payload?.message || "Unknown"}`,
          duration_ms: Date.now() - startTime,
        };
        resultCache.set(cacheKey, { ts: Date.now(), payload: out });
        return json(out);
      }

      let transfers = payload.result as BscScanTokenTransfer[];
      transfers = transfers.filter((tx) => Number.parseInt(tx.timeStamp, 10) >= lookbackTimestamp);

      if (transfers.length === 0) {
        const out: IndexResponse = {
          success: true,
          indexed: 0,
          provider: "bscscan",
          wallet: walletShort,
          duration_ms: Date.now() - startTime,
        };
        resultCache.set(cacheKey, { ts: Date.now(), payload: out });
        return json(out);
      }

      const records: Array<Record<string, unknown>> = [];

      for (const tx of transfers) {
        const fromAddr = String(tx.from || "").toLowerCase();
        const toAddr = String(tx.to || "").toLowerCase();
        const contractAddr = String(tx.contractAddress || "").toLowerCase();

        let direction: "SEND" | "RECEIVE" | "SELF" = "RECEIVE";
        if (fromAddr === wallet && toAddr === wallet) direction = "SELF";
        else if (fromAddr === wallet) direction = "SEND";
        else if (toAddr === wallet) direction = "RECEIVE";

        const asset = assetMap.get(contractAddr);
        const tokenDecimals = asset?.decimals ?? (Number.parseInt(tx.tokenDecimal || "", 10) || 18);

        const rawValue = BigInt(tx.value || "0");
        const denom = 10n ** BigInt(tokenDecimals);
        const whole = rawValue / denom;
        const frac = rawValue % denom;
        const fracStr = tokenDecimals > 0 ? frac.toString().padStart(tokenDecimals, "0").slice(0, 8) : "";
        const amountFormatted = Number(tokenDecimals > 0 ? `${whole.toString()}.${fracStr}` : whole.toString());

        const gasUsed = BigInt(tx.gasUsed || "0");
        const gasPrice = BigInt(tx.gasPrice || "0");
        const gasFeeWei = gasUsed * gasPrice;
        const gasFeeNative = Number(gasFeeWei) / 1e18;

        const rawLogIndex = tx.logIndex ?? tx.transactionIndex;
        const logIndex = Number.isFinite(Number.parseInt(String(rawLogIndex), 10))
          ? Number.parseInt(String(rawLogIndex), 10)
          : null;

        records.push({
          user_id: userId,
          wallet_address: wallet,
          chain_id: 56,

          token_contract: tx.contractAddress,
          token_symbol: asset?.symbol || tx.tokenSymbol || "UNKNOWN",
          token_name: asset?.name || tx.tokenName || null,
          token_decimals: tokenDecimals,
          token_logo_url: asset?.logo_url || null,

          direction,
          counterparty_address: direction === "SEND" ? tx.to : direction === "RECEIVE" ? tx.from : tx.to,

          amount_raw: tx.value,
          amount_formatted: amountFormatted,

          status: "CONFIRMED",
          confirmations: 0,
          required_confirmations: 12,

          block_number: Number.parseInt(tx.blockNumber, 10) || null,
          tx_hash: tx.hash.toLowerCase(),
          log_index: logIndex,

          gas_fee_wei: gasFeeWei.toString(),
          gas_fee_formatted: gasFeeNative,
          nonce: Number.parseInt(tx.nonce, 10) || null,

          source: "ONCHAIN",
          error_message: null,
          confirmed_at: new Date(Number.parseInt(tx.timeStamp, 10) * 1000).toISOString(),
        });
      }

      const { error: upsertError } = await adminClient.from("onchain_transactions").upsert(records, {
        onConflict: "tx_hash,log_index,user_id,direction",
        ignoreDuplicates: false,
      });

      if (upsertError) {
        const out: IndexResponse = {
          success: false,
          indexed: 0,
          provider: "bscscan",
          wallet: walletShort,
          error_code: "DB_ERROR",
          error: upsertError.message,
          duration_ms: Date.now() - startTime,
        };
        resultCache.set(cacheKey, { ts: Date.now(), payload: out });
        return json(out);
      }

      const out: IndexResponse = {
        success: true,
        indexed: records.length,
        provider: "bscscan",
        wallet: walletShort,
        duration_ms: Date.now() - startTime,
      };

      resultCache.set(cacheKey, { ts: Date.now(), payload: out });
      return json(out);
    } finally {
      inFlight.delete(cacheKey);
    }
  } catch (e: any) {
    console.error(`[index-bep20] Unhandled error: ${e?.message || e}`);
    return json({
      success: false,
      indexed: 0,
      error_code: "INTERNAL_ERROR",
      error: e?.message || "Internal server error",
      wallet: wallet ? `${wallet.slice(0, 10)}...` : undefined,
      duration_ms: Date.now() - startTime,
    });
  }
});
