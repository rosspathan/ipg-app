/* ═══════════════════════════════════════════════════════════
   LOCK STATE MANAGEMENT - Module B
   Uses exact localStorage keys per spec
   ═══════════════════════════════════════════════════════════ */

export interface LockState {
  state: 'locked' | 'unlocked';
  lastActive: number;
  timeoutMs: number;
}

// Exact localStorage keys from spec
const KEYS = {
  PIN_SALT: 'ipg_pin_salt',
  PIN_HASH: 'ipg_pin_hash',
  PIN_CREATED_AT: 'ipg_pin_created_at',
  BIO_CRED_ID: 'ipg_bio_cred_id',
  LOCK_STATE: 'ipg_lock_state',
  LOCK_LAST_ACTIVE: 'ipg_lock_last_active',
  LOCK_TIMEOUT_MS: 'ipg_lock_timeout_ms',
  ONBOARDED: 'ipg_onboarded'
} as const;

const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Get lock state
 */
export function getLockState(): LockState {
  const state = localStorage.getItem(KEYS.LOCK_STATE) as 'locked' | 'unlocked' || 'locked';
  const lastActive = parseInt(localStorage.getItem(KEYS.LOCK_LAST_ACTIVE) || '0');
  const timeoutMs = parseInt(localStorage.getItem(KEYS.LOCK_TIMEOUT_MS) || String(DEFAULT_TIMEOUT_MS));

  return { state, lastActive, timeoutMs };
}

/**
 * Set lock state
 */
export function setLockState(state: 'locked' | 'unlocked'): void {
  localStorage.setItem(KEYS.LOCK_STATE, state);
  if (state === 'unlocked') {
    localStorage.setItem(KEYS.LOCK_LAST_ACTIVE, Date.now().toString());
  }
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  localStorage.setItem(KEYS.LOCK_LAST_ACTIVE, Date.now().toString());
}

/**
 * Check if lock timeout expired
 */
export function shouldLock(): boolean {
  const { state, lastActive, timeoutMs } = getLockState();
  if (state === 'locked') return true;
  if (lastActive === 0) return true;
  
  return Date.now() - lastActive > timeoutMs;
}

/**
 * Lock the app
 */
export function lockApp(): void {
  setLockState('locked');
  console.log('🔒 App locked');
}

/**
 * Unlock the app
 */
export function unlockApp(): void {
  setLockState('unlocked');
  console.log('🔓 LOCK_UNLOCK_OK');
}

/**
 * Check if PIN is configured
 */
export function hasPinConfigured(): boolean {
  return !!(localStorage.getItem(KEYS.PIN_HASH) && localStorage.getItem(KEYS.PIN_SALT));
}

/**
 * Store PIN credentials
 */
export function storePinCredentials(hash: string, salt: string): void {
  localStorage.setItem(KEYS.PIN_HASH, hash);
  localStorage.setItem(KEYS.PIN_SALT, salt);
  localStorage.setItem(KEYS.PIN_CREATED_AT, Date.now().toString());
  console.log('✅ PIN_SET_OK');
}

/**
 * Get PIN credentials
 */
export function getPinCredentials(): { hash: string; salt: string } | null {
  const hash = localStorage.getItem(KEYS.PIN_HASH);
  const salt = localStorage.getItem(KEYS.PIN_SALT);
  
  if (!hash || !salt) return null;
  return { hash, salt };
}

/**
 * Check if biometric is enrolled
 */
export function hasBiometricEnrolled(): boolean {
  return !!localStorage.getItem(KEYS.BIO_CRED_ID);
}

/**
 * Store biometric credential ID
 */
export function storeBiometricCredId(credId: string): void {
  localStorage.setItem(KEYS.BIO_CRED_ID, credId);
  console.log('✅ BIO_ENROLL_OK');
}

/**
 * Get biometric credential ID
 */
export function getBiometricCredId(): string | null {
  return localStorage.getItem(KEYS.BIO_CRED_ID);
}

/**
 * Check if user completed onboarding
 */
export function isOnboarded(): boolean {
  return localStorage.getItem(KEYS.ONBOARDED) === 'true';
}

/**
 * Mark onboarding as complete
 */
export function setOnboarded(): void {
  localStorage.setItem(KEYS.ONBOARDED, 'true');
}

/**
 * Set lock timeout
 */
export function setLockTimeout(ms: number): void {
  localStorage.setItem(KEYS.LOCK_TIMEOUT_MS, ms.toString());
}

/**
 * Clear all lock-related data (for logout)
 */
export function clearLockData(): void {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}
