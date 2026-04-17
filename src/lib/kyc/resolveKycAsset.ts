/**
 * Resolve a KYC asset (document image or selfie) to a fresh signed URL.
 *
 * Why this exists:
 *   - The user wizard sometimes stores an already-signed URL in `data_json`
 *     (e.g. `id_front_url`, `selfie_url`). Those URLs expire in ~1 hour, so
 *     when an admin reviews the case later they see broken images.
 *   - Some submissions store a raw storage path (e.g. `<uid>/L1/id_front.jpg`)
 *     directly in `data_json.id_front` or in the dedicated
 *     `kyc_profiles_new.face_selfie_path` column.
 *   - Selfies live in either `kyc-selfies` (new wizard) or `kyc` (legacy).
 *
 * resolveKycAsset(value, hint) accepts ANY of these shapes and always returns
 * a fresh 1-hour signed URL pointing at the actual file, or null if the file
 * cannot be located.
 */
import { supabase } from "@/integrations/supabase/client";

const SIGN_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Strip a (possibly signed) Supabase storage URL down to its bucket + object path.
 * Returns null if the value is not a recognisable storage URL.
 */
function parseStorageUrl(input: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(input);
    // Matches:
    //   /storage/v1/object/sign/<bucket>/<path>?token=...
    //   /storage/v1/object/public/<bucket>/<path>
    //   /storage/v1/object/<bucket>/<path>
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    const bucket = decodeURIComponent(m[1]);
    const path = decodeURIComponent(m[2]);
    return { bucket, path };
  } catch {
    return null;
  }
}

export type KycAssetHint = "document" | "selfie" | "auto";

/**
 * Best-effort bucket guess when only a raw path is provided.
 * - Selfies submitted by the new wizard live in `kyc-selfies`
 *   under paths like `<uid>/selfie-<ts>.jpg`.
 * - Documents and legacy selfies live in `kyc`
 *   under paths like `<uid>/L1/id_front_<ts>.jpg`.
 */
function guessBucket(path: string, hint: KycAssetHint): string {
  if (hint === "selfie" && !path.includes("/L1/")) return "kyc-selfies";
  return "kyc";
}

/**
 * Resolve a KYC asset to a fresh signed URL.
 *
 * @param value Either a raw storage path (`<uid>/...`) or an already-signed URL.
 * @param hint  Used to pick the right bucket when only a raw path is provided.
 *              Defaults to "auto" (treats everything as a document/legacy file
 *              in the `kyc` bucket).
 */
export async function resolveKycAsset(
  value: string | null | undefined,
  hint: KycAssetHint = "auto"
): Promise<string | null> {
  if (!value) return null;

  let bucket: string;
  let path: string;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    const parsed = parseStorageUrl(value);
    if (!parsed) {
      // Unknown external URL — return as-is so admin can at least try to open it.
      return value;
    }
    bucket = parsed.bucket;
    path = parsed.path;
  } else {
    path = value.replace(/^\/+/, "");
    bucket = guessBucket(path, hint);
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGN_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    // Fall back to the other bucket once if our guess was wrong.
    const altBucket = bucket === "kyc" ? "kyc-selfies" : "kyc";
    const { data: alt } = await supabase.storage
      .from(altBucket)
      .createSignedUrl(path, SIGN_TTL_SECONDS);
    return alt?.signedUrl ?? null;
  }

  return data.signedUrl;
}

/**
 * Convenience: pull every supported document/selfie field out of a `data_json`
 * blob and resolve them in parallel. Returns object with `null` for any
 * missing/unresolvable asset.
 */
export async function resolveKycSubmissionAssets(
  dataJson: Record<string, any> | null | undefined,
  facePath: string | null | undefined
) {
  const dj = dataJson ?? {};
  const idFront = dj.id_front_url ?? dj.id_front ?? dj.documents?.id_front ?? null;
  const idBack = dj.id_back_url ?? dj.id_back ?? dj.documents?.id_back ?? null;
  const addressProof =
    dj.address_proof_url ?? dj.address_proof ?? dj.documents?.address_proof ?? null;
  // Prefer the dedicated column; fall back to whatever was stored in JSON.
  const selfie = facePath ?? dj.selfie_url ?? dj.selfie ?? dj.documents?.selfie ?? null;

  const [idFrontUrl, idBackUrl, selfieUrl, addressProofUrl] = await Promise.all([
    resolveKycAsset(idFront, "document"),
    resolveKycAsset(idBack, "document"),
    resolveKycAsset(selfie, "selfie"),
    resolveKycAsset(addressProof, "document"),
  ]);

  return { idFrontUrl, idBackUrl, selfieUrl, addressProofUrl };
}
