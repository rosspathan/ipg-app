/**
 * Centralized helper for surfacing backend KYC enforcement errors
 * in a friendly way and offering a one-tap path to /app/profile/kyc.
 */
import { toast } from "sonner";

export const KYC_REQUIRED_REGEX = /KYC[_ ]REQUIRED/i;

export function isKycRequiredError(err: unknown): boolean {
  const msg = extractErrorMessage(err);
  return KYC_REQUIRED_REGEX.test(msg);
}

export function extractErrorMessage(err: unknown): string {
  if (!err) return "";
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    const anyErr = err as any;
    if (anyErr.message) return String(anyErr.message);
    if (anyErr.error) return String(anyErr.error);
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Returns true if the error was a KYC-required error and has been handled
 * (toast shown). Caller should early-return after calling this.
 */
export function handleKycError(err: unknown): boolean {
  if (!isKycRequiredError(err)) return false;
  toast.error("KYC approval required", {
    description:
      "Complete document, face and admin mobile verification to unlock this action.",
    action: {
      label: "Verify now",
      onClick: () => {
        if (typeof window !== "undefined") {
          window.location.assign("/app/profile/kyc");
        }
      },
    },
  });
  return true;
}
