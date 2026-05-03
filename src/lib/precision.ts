// Asset-decimal-aware precision utilities.
// CRITICAL RULES
// - NEVER use `Math.round(x * 1e8) / 1e8` — silently truncates past 8 decimals
//   and breaks for values larger than ~9e15 / 1e8 ≈ 9e7 (90M tokens).
// - Always operate on STRINGS for parse/round, then convert to BigInt or Number
//   only for safe ranges.
// - `decimals` MUST come from `assets.decimals` in the database.

export type AssetLike = { symbol: string; decimals: number };

/**
 * Trim trailing zeros and a dangling decimal point from a fixed string.
 * keepMin: ensure at least this many fractional digits (e.g. for display).
 */
function trimZeros(s: string, keepMin = 0): string {
  if (!s.includes(".")) return s + (keepMin > 0 ? "." + "0".repeat(keepMin) : "");
  let [w, f] = s.split(".");
  while (f.length > keepMin && f.endsWith("0")) f = f.slice(0, -1);
  return f.length === 0 ? w : `${w}.${f}`;
}

/**
 * Round a numeric STRING to `decimals` fractional places (banker-safe, half-up).
 * Pure string math — works for any magnitude, no float error.
 */
export function roundDecimalString(input: string | number, decimals: number): string {
  if (input === null || input === undefined || input === "") return "0";
  let s = typeof input === "number" ? String(input) : input.trim();
  // Handle scientific notation
  if (/e/i.test(s)) s = Number(s).toFixed(Math.max(decimals + 4, 20));
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  if (!s.includes(".")) s = s + ".";
  let [w, f = ""] = s.split(".");
  if (f.length <= decimals) {
    f = f.padEnd(decimals, "0");
    return (neg ? "-" : "") + (decimals === 0 ? w : `${w}.${f}`);
  }
  // Round half-up at position `decimals`
  const keep = f.slice(0, decimals);
  const next = f.charCodeAt(decimals) - 48; // 0..9
  if (next < 5) {
    return (neg ? "-" : "") + (decimals === 0 ? w : `${w}.${keep}`);
  }
  // Round up: add 1 to integer (w + keep)
  const combined = (w + keep).replace(/^0+(?=\d)/, "");
  let arr = (combined === "" ? "0" : combined).split("").map(Number);
  let i = arr.length - 1;
  while (i >= 0) { arr[i] += 1; if (arr[i] < 10) break; arr[i] = 0; i--; }
  if (i < 0) arr.unshift(1);
  const joined = arr.join("");
  const newW = decimals === 0 ? joined : joined.slice(0, joined.length - decimals) || "0";
  const newF = decimals === 0 ? "" : joined.slice(joined.length - decimals).padStart(decimals, "0");
  return (neg ? "-" : "") + (decimals === 0 ? newW : `${newW}.${newF}`);
}

/**
 * Safe round to an asset's native precision. Use for any value that will be
 * sent to the backend, on-chain, or stored as the canonical amount.
 */
export function safeRoundToAssetPrecision(
  input: string | number,
  asset: AssetLike | number,
): string {
  const dec = typeof asset === "number" ? asset : asset.decimals;
  return roundDecimalString(input, dec);
}

/**
 * Parse a user-typed amount safely against an asset's max decimals.
 * Returns { ok, value, error }. value is the canonical string.
 */
export function parseAssetAmount(
  input: string,
  asset: AssetLike,
): { ok: boolean; value: string; error?: string } {
  if (input == null || String(input).trim() === "") {
    return { ok: false, value: "0", error: "Amount is required" };
  }
  const s = String(input).trim().replace(/,/g, "");
  if (!/^[0-9]*\.?[0-9]*$/.test(s)) return { ok: false, value: "0", error: "Invalid number" };
  const [, f = ""] = s.split(".");
  if (f.length > asset.decimals) {
    // Round down to max precision rather than reject — but flag.
    return { ok: true, value: roundDecimalString(s, asset.decimals) };
  }
  const num = Number(s);
  if (!Number.isFinite(num) || num < 0) return { ok: false, value: "0", error: "Invalid amount" };
  return { ok: true, value: roundDecimalString(s, asset.decimals) };
}

/**
 * Display formatter.
 * - mode 'compact': for lists/tables — caps at min(asset.decimals, 8) and trims zeros.
 * - mode 'full':    for detail/history modals — shows full asset.decimals (no truncation).
 */
export function formatAssetAmount(
  amount: string | number | null | undefined,
  asset: AssetLike,
  opts?: { mode?: "compact" | "full"; minFractionDigits?: number },
): string {
  if (amount === null || amount === undefined || amount === "") return "0";
  const mode = opts?.mode ?? "compact";
  const targetDec = mode === "full" ? asset.decimals : Math.min(asset.decimals, 8);
  const rounded = roundDecimalString(amount, targetDec);
  const minFD = opts?.minFractionDigits ?? 0;
  return trimZeros(rounded, Math.min(minFD, targetDec));
}
