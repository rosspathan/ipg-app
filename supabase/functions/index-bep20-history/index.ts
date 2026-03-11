import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const REQUIRED_CONFIRMATIONS = 12;
const DEFAULT_BLOCKS_PER_HOUR = 1200;
const BLOCK_BATCH_SIZE = 1800;

const DEFAULT_BSC_RPC_URLS = [
  "https://bsc-rpc.publicnode.com",
  "https://binance.llamarpc.com",
  "https://bsc.drpc.org",
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
];

type IndexRequest = {
  lookbackHours?: number;
  forceRefresh?: boolean;
};

type IndexResponse = {
  success: boolean;
  indexed: number;
  created?: number;
  skipped?: number;
  provider?: "bscscan" | "rpc" | "database";
  wallet?: string;
  duration_ms?: number;
  cached?: boolean;
  throttled?: boolean;
  warning?: string;
  fallback_reason?: string;
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
  gasPrice?: string;
  gasUsed?: string;
  nonce?: string;
  logIndex?: string;
  transactionIndex?: string;
  confirmations?: string;
};

type NormalizedTransfer = {
  tx_hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  timestampSec: number;
  contractAddress: string;
  tokenSymbol: string;
  tokenName: string | null;
  tokenDecimals: number;
  tokenLogoUrl: string | null;
  gasFeeWei: string | null;
  gasFeeFormatted: number | null;
  nonce: number | null;
  logIndex: number;
  confirmations: number;
};

type RpcLog = {
  address: string;
  blockNumber: string;
  data: string;
  logIndex: string;
  topics: string[];
  transactionHash: string;
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

const lower = (v: string | null | undefined) => (v || "").trim().toLowerCase();

const isAddress = (val: unknown): val is string =>
  typeof val === "string" && /^0x[a-fA-F0-9]{40}$/.test(val);

const isTxHash = (val: unknown): val is string =>
  typeof val === "string" && /^0x[a-fA-F0-9]{64}$/.test(val);

const isNoTransactionsPayload = (payload: any) => {
  const message = String(payload?.message || "").toLowerCase();
  const result = String(payload?.result || "").toLowerCase();
  return message.includes("no transactions") || result.includes("no transactions");
};

const explorerErrorMessage = (payload: any) => {
  const message = String(payload?.message || "").trim();
  const result = typeof payload?.result === "string" ? payload.result.trim() : "";
  if (message && result) return `${message}: ${result}`;
  return message || result || "Unknown provider error";
};

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

const toAddressFromTopic = (topic: string) => `0x${topic.slice(-40).toLowerCase()}`;

const toHex = (n: number) => `0x${Math.max(0, n).toString(16)}`;

const toWalletTopic = (wallet: string) => `0x000000000000000000000000${wallet.slice(2).toLowerCase()}`;

const parseHexInt = (hex: string | null | undefined, fallback = 0) => {
  if (!hex) return fallback;
  const n = Number.parseInt(hex, 16);
  return Number.isFinite(n) ? n : fallback;
};

const parseDecInt = (raw: string | null | undefined, fallback = 0) => {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
};

async function rpcCall(url: string, method: string, params: any[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  if (!res.ok) throw new Error(`RPC request failed: ${res.status}`);
  const data = await res.json();
  if (data?.error) throw new Error(data.error?.message || JSON.stringify(data.error));
  return data?.result;
}

async function tryRpc(urls: string[], method: string, params: any[]) {
  let lastErr: Error | null = null;
  for (const url of urls) {
    try {
      return await rpcCall(url, method, params);
    } catch (e: any) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      console.warn(`[index-bep20] RPC ${url} failed for ${method}: ${lastErr.message}`);
    }
  }
  throw lastErr || new Error("All RPC providers failed");
}

async function queryLogsWithFallback(params: {
  rpcUrls: string[];
  contracts: string[];
  topics: (string | null)[];
  fromBlock: number;
  toBlock: number;
}) {
  const { rpcUrls, contracts, topics, fromBlock, toBlock } = params;

  try {
    const logs = await tryRpc(rpcUrls, "eth_getLogs", [
      {
        address: contracts,
        topics,
        fromBlock: toHex(fromBlock),
        toBlock: toHex(toBlock),
      },
    ]);
    return Array.isArray(logs) ? (logs as RpcLog[]) : [];
  } catch (multiErr: any) {
    const msg = String(multiErr?.message || "").toLowerCase();
    if (!/invalid|array|unmarshal|address/.test(msg)) throw multiErr;

    const all: RpcLog[] = [];
    for (const contract of contracts) {
      const logs = await tryRpc(rpcUrls, "eth_getLogs", [
        {
          address: contract,
          topics,
          fromBlock: toHex(fromBlock),
          toBlock: toHex(toBlock),
        },
      ]);
      if (Array.isArray(logs)) all.push(...(logs as RpcLog[]));
    }
    return all;
  }
}

async function fetchTransfersViaRpc(params: {
  rpcUrls: string[];
  wallet: string;
  assets: Map<string, AssetRow>;
  lookbackHours: number;
}) {
  const { rpcUrls, wallet, assets, lookbackHours } = params;

  const contracts = Array.from(assets.keys());
  if (contracts.length === 0) return { transfers: [] as NormalizedTransfer[], currentBlock: 0 };

  const currentBlockHex = await tryRpc(rpcUrls, "eth_blockNumber", []);
  const currentBlock = parseHexInt(currentBlockHex, 0);

  const estimatedLookbackBlocks = Math.max(1200, lookbackHours * DEFAULT_BLOCKS_PER_HOUR);
  const fromBlock = Math.max(0, currentBlock - estimatedLookbackBlocks);

  const walletTopic = toWalletTopic(wallet);
  const uniqueLogs = new Map<string, RpcLog>();

  for (let start = fromBlock; start <= currentBlock; start += BLOCK_BATCH_SIZE) {
    const end = Math.min(start + BLOCK_BATCH_SIZE - 1, currentBlock);

    const [incoming, outgoing] = await Promise.all([
      queryLogsWithFallback({
        rpcUrls,
        contracts,
        topics: [TRANSFER_TOPIC, null, walletTopic],
        fromBlock: start,
        toBlock: end,
      }),
      queryLogsWithFallback({
        rpcUrls,
        contracts,
        topics: [TRANSFER_TOPIC, walletTopic, null],
        fromBlock: start,
        toBlock: end,
      }),
    ]);

    for (const log of [...incoming, ...outgoing]) {
      const txHash = lower(log.transactionHash);
      if (!isTxHash(txHash)) continue;
      const logIndex = parseHexInt(log.logIndex, 0);
      const key = `${txHash}:${logIndex}`;
      if (!uniqueLogs.has(key)) uniqueLogs.set(key, log);
    }
  }

  const blockTimestamps = new Map<number, number>();
  const transfers: NormalizedTransfer[] = [];

  for (const log of uniqueLogs.values()) {
    const topics = Array.isArray(log.topics) ? log.topics : [];
    if (topics.length < 3) continue;
    if (lower(topics[0]) !== TRANSFER_TOPIC) continue;

    const contractAddress = lower(log.address);
    const asset = assets.get(contractAddress);
    if (!asset) continue;

    const from = toAddressFromTopic(topics[1]);
    const to = toAddressFromTopic(topics[2]);
    if (from !== wallet && to !== wallet) continue;

    const blockNumber = parseHexInt(log.blockNumber, 0);
    if (!blockTimestamps.has(blockNumber)) {
      const block = await tryRpc(rpcUrls, "eth_getBlockByNumber", [toHex(blockNumber), false]);
      const timestamp = parseHexInt(block?.timestamp, 0);
      blockTimestamps.set(blockNumber, timestamp);
    }

    const timestampSec = blockTimestamps.get(blockNumber) || 0;
    const confirmations = Math.max(0, currentBlock - blockNumber + 1);

    const tokenDecimals = asset.decimals ?? 18;
    const rawLogIndex = parseHexInt(log.logIndex, 0);

    transfers.push({
      tx_hash: lower(log.transactionHash),
      from,
      to,
      value: String(BigInt(log.data || "0x0")),
      blockNumber,
      timestampSec,
      contractAddress,
      tokenSymbol: asset.symbol || "UNKNOWN",
      tokenName: asset.name || asset.symbol || null,
      tokenDecimals,
      tokenLogoUrl: asset.logo_url || null,
      gasFeeWei: null,
      gasFeeFormatted: null,
      nonce: null,
      logIndex: rawLogIndex,
      confirmations,
    });
  }

  return { transfers, currentBlock };
}

async function fetchTransfersViaExplorer(params: {
  wallet: string;
  lookbackHours: number;
  apiKey: string;
  assets: Map<string, AssetRow>;
}) {
  const { wallet, lookbackHours, apiKey, assets } = params;

  const startTimestamp = Math.floor(Date.now() / 1000) - lookbackHours * 3600;
  const explorerUrl =
    `https://api.bscscan.com/v2/api?chainid=56&module=account&action=tokentx` +
    `&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=200&sort=desc` +
    `&apikey=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  const resp = await fetch(explorerUrl, { signal: controller.signal });
  clearTimeout(timeoutId);

  if (!resp.ok) throw new Error(`Explorer HTTP ${resp.status}`);
  const payload = await resp.json();

  if (isNoTransactionsPayload(payload)) {
    return [] as NormalizedTransfer[];
  }

  if (payload?.status !== "1" || !Array.isArray(payload?.result)) {
    const err = explorerErrorMessage(payload);
    console.error("[index-bep20] BscScan V2 returned NOTOK", {
      message: payload?.message,
      result: payload?.result,
    });
    throw new Error(err);
  }

  const transfers = (payload.result as BscScanTokenTransfer[])
    .filter((tx) => parseDecInt(tx.timeStamp, 0) >= startTimestamp)
    .map((tx) => {
      const contractAddress = lower(tx.contractAddress);
      const asset = assets.get(contractAddress);
      const tokenDecimals = asset?.decimals ?? (parseDecInt(tx.tokenDecimal, 18) || 18);

      const gasUsed = BigInt(tx.gasUsed || "0");
      const gasPrice = BigInt(tx.gasPrice || "0");
      const gasFeeWei = gasUsed * gasPrice;

      return {
        tx_hash: lower(tx.hash),
        from: lower(tx.from),
        to: lower(tx.to),
        value: tx.value || "0",
        blockNumber: parseDecInt(tx.blockNumber, 0),
        timestampSec: parseDecInt(tx.timeStamp, 0),
        contractAddress,
        tokenSymbol: asset?.symbol || tx.tokenSymbol || "UNKNOWN",
        tokenName: asset?.name || tx.tokenName || null,
        tokenDecimals,
        tokenLogoUrl: asset?.logo_url || null,
        gasFeeWei: gasFeeWei.toString(),
        gasFeeFormatted: Number(gasFeeWei) / 1e18,
        nonce: parseDecInt(tx.nonce, 0),
        logIndex: parseDecInt(tx.logIndex ?? tx.transactionIndex, 0),
        confirmations: parseDecInt(tx.confirmations, REQUIRED_CONFIRMATIONS),
      } satisfies NormalizedTransfer;
    })
    .filter((tx) => isTxHash(tx.tx_hash));

  return transfers;
}

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

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return json({ success: false, error: "Server misconfigured", error_code: "SERVER_ERROR", indexed: 0 }, 500);
    }

    const token = bearerMatch[1];
    const userId = decodeJwtSub(token);
    if (!userId) {
      return json({ success: false, error: "Invalid token", error_code: "INVALID_TOKEN", indexed: 0 }, 401);
    }

    const bscscanApiKey = (Deno.env.get("BSCSCAN_API_KEY") ?? "").trim();

    const { lookbackHours = 720 }: IndexRequest = await req.json().catch(() => ({}));
    const clampedLookbackHours = Math.max(1, Math.min(Number(lookbackHours) || 720, 2160));

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

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

    wallet = lower(evmAddress);
    const walletShort = `${wallet.slice(0, 10)}...`;
    const cacheKey = `${userId}:${wallet}:${clampedLookbackHours}`;

    const cached = resultCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return json({ ...cached.payload, cached: true, duration_ms: Date.now() - startTime });
    }

    const inflightAt = inFlight.get(cacheKey);
    if (inflightAt && Date.now() - inflightAt < CACHE_TTL_MS) {
      return json({
        success: true,
        throttled: true,
        provider: "database",
        warning: "Sync already in progress; showing latest indexed data.",
        indexed: 0,
        created: 0,
        wallet: walletShort,
        duration_ms: Date.now() - startTime,
      });
    }

    inFlight.set(cacheKey, Date.now());

    try {
      let assetMap: Map<string, AssetRow>;
      if (assetCache && Date.now() - assetCache.ts < ASSET_CACHE_TTL_MS) {
        assetMap = assetCache.map;
      } else {
        const { data: assets } = await supabaseClient
          .from("assets")
          .select("contract_address, symbol, name, decimals, logo_url")
          .not("contract_address", "is", null)
          .eq("is_active", true)
          .eq("network", "BEP20");

        const map = new Map<string, AssetRow>();
        (assets as AssetRow[] | null | undefined)?.forEach((a) => {
          if (a.contract_address) map.set(lower(a.contract_address), a);
        });

        assetCache = { ts: Date.now(), map };
        assetMap = map;
      }

      let provider: IndexResponse["provider"] = "database";
      let fallbackReason: string | undefined;
      let warning: string | undefined;
      let normalizedTransfers: NormalizedTransfer[] = [];

      if (bscscanApiKey) {
        try {
          normalizedTransfers = await fetchTransfersViaExplorer({
            wallet,
            lookbackHours: clampedLookbackHours,
            apiKey: bscscanApiKey,
            assets: assetMap,
          });
          provider = "bscscan";
        } catch (explorerErr: any) {
          fallbackReason = explorerErr?.message || "Explorer sync failed";
          console.warn(`[index-bep20] Explorer failed, falling back to RPC: ${fallbackReason}`);
        }
      } else {
        fallbackReason = "BSCSCAN_API_KEY missing";
      }

      if (provider !== "bscscan") {
        try {
          const customRpc = (Deno.env.get("BSC_RPC_URL") ?? "").trim();
          const rpcUrls = customRpc ? [customRpc, ...DEFAULT_BSC_RPC_URLS] : DEFAULT_BSC_RPC_URLS;

          const rpcResult = await fetchTransfersViaRpc({
            rpcUrls,
            wallet,
            assets: assetMap,
            lookbackHours: clampedLookbackHours,
          });

          normalizedTransfers = rpcResult.transfers;
          provider = "rpc";
          if (fallbackReason) warning = `Explorer unavailable; using RPC fallback (${fallbackReason}).`;
        } catch (rpcErr: any) {
          const rpcReason = rpcErr?.message || "RPC sync failed";
          provider = "database";
          warning = `Sync providers unavailable. Showing cached/internal history. ${fallbackReason ? `Explorer: ${fallbackReason}. ` : ""}RPC: ${rpcReason}.`;
          normalizedTransfers = [];
          console.error(`[index-bep20] Explorer+RPC failed. ${warning}`);
        }
      }

      const dedupedTransfers = new Map<string, NormalizedTransfer>();
      for (const tx of normalizedTransfers) {
        const key = `${tx.tx_hash}:${tx.logIndex}`;
        if (!dedupedTransfers.has(key)) dedupedTransfers.set(key, tx);
      }

      const records: Array<Record<string, unknown>> = [];

      for (const tx of dedupedTransfers.values()) {
        const fromAddr = lower(tx.from);
        const toAddr = lower(tx.to);

        let direction: "SEND" | "RECEIVE" | "SELF" = "RECEIVE";
        if (fromAddr === wallet && toAddr === wallet) direction = "SELF";
        else if (fromAddr === wallet) direction = "SEND";
        else if (toAddr === wallet) direction = "RECEIVE";

        const decimals = Math.max(0, Math.min(36, tx.tokenDecimals || 18));
        const raw = BigInt(tx.value || "0");
        const denom = 10n ** BigInt(decimals);
        const whole = raw / denom;
        const fraction = raw % denom;
        const fracStr = decimals > 0 ? fraction.toString().padStart(decimals, "0").slice(0, 8) : "";
        const amountFormatted = Number(decimals > 0 ? `${whole.toString()}.${fracStr}` : whole.toString());

        const confirmations = Math.max(0, Number.isFinite(tx.confirmations) ? tx.confirmations : 0);
        const status = confirmations >= REQUIRED_CONFIRMATIONS ? "CONFIRMED" : "CONFIRMING";

        records.push({
          user_id: userId,
          wallet_address: wallet,
          chain_id: 56,

          token_contract: tx.contractAddress,
          token_symbol: tx.tokenSymbol,
          token_name: tx.tokenName,
          token_decimals: tx.tokenDecimals,
          token_logo_url: tx.tokenLogoUrl,

          direction,
          counterparty_address: direction === "SEND" ? tx.to : direction === "RECEIVE" ? tx.from : tx.to,

          amount_raw: tx.value,
          amount_formatted: amountFormatted,

          status,
          confirmations,
          required_confirmations: REQUIRED_CONFIRMATIONS,

          block_number: tx.blockNumber || null,
          tx_hash: tx.tx_hash,
          log_index: tx.logIndex,

          gas_fee_wei: tx.gasFeeWei,
          gas_fee_formatted: tx.gasFeeFormatted,
          nonce: tx.nonce,

          source: "ONCHAIN",
          error_message: null,
          confirmed_at: tx.timestampSec ? new Date(tx.timestampSec * 1000).toISOString() : null,
        });
      }

      if (records.length > 0) {
        const { error: upsertError } = await adminClient.from("onchain_transactions").upsert(records, {
          onConflict: "tx_hash,log_index,user_id,direction",
          ignoreDuplicates: false,
        });

        if (upsertError) {
          console.error("[index-bep20] DB upsert error:", upsertError.message);
          const out: IndexResponse = {
            success: false,
            indexed: 0,
            created: 0,
            provider,
            wallet: walletShort,
            error_code: "DB_ERROR",
            error: upsertError.message,
            duration_ms: Date.now() - startTime,
          };
          resultCache.set(cacheKey, { ts: Date.now(), payload: out });
          return json(out);
        }
      }

      const out: IndexResponse = {
        success: true,
        indexed: records.length,
        created: records.length,
        skipped: Math.max(0, normalizedTransfers.length - records.length),
        provider,
        wallet: walletShort,
        duration_ms: Date.now() - startTime,
        warning,
        fallback_reason: fallbackReason,
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
      created: 0,
      error_code: "INTERNAL_ERROR",
      error: e?.message || "Internal server error",
      wallet: wallet ? `${wallet.slice(0, 10)}...` : undefined,
      duration_ms: Date.now() - startTime,
    });
  }
});
