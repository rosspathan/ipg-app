/**
 * In-memory store for the user's signup password during the OTP step.
 *
 * Why: previously the raw password was placed in sessionStorage, which is
 * readable by any JS on the page (XSS exfiltration risk). Keeping it in a
 * module-level variable means it never leaves the JS heap, never hits
 * persistent storage, and is wiped on full page reload.
 *
 * Trade-off: a hard reload between "AuthScreen" and "EmailVerificationOTP"
 * will lose the password and the user must restart signup. Acceptable —
 * far safer than persisting the cleartext password.
 */

let pendingPassword: string | null = null;

export function setPendingSignupPassword(password: string): void {
  pendingPassword = password;
}

export function getPendingSignupPassword(): string | null {
  return pendingPassword;
}

export function clearPendingSignupPassword(): void {
  pendingPassword = null;
}
