/* ═══════════════════════════════════════════════════════════
   LOCK STATE MANAGEMENT - Module B
   Uses exact localStorage keys per spec with USER SCOPING
   ═══════════════════════════════════════════════════════════ */

export interface LockState {
  state: 'locked' | 'unlocked';
  lastActive: number;
  timeoutMs: number;
}

// User-scoped key generator
function getUserScopedKey(userId: string | null, baseKey: string): string {
  if (!userId) return baseKey; // Fallback for backward compatibility
  return `${baseKey}_${userId}`;
}

// Base localStorage keys (will be scoped per user)
const BASE_KEYS = {
  PIN_SALT: 'ipg_pin_salt',
  PIN_HASH: 'ipg_pin_hash',
  PIN_CREATED_AT: 'ipg_pin_created_at',
  BIO_CRED_ID: 'ipg_bio_cred_id',
  LOCK_STATE: 'ipg_lock_state',
  LOCK_LAST_ACTIVE: 'ipg_lock_last_active',
  LOCK_TIMEOUT_MS: 'ipg_lock_timeout_ms',
  ONBOARDED: 'ipg_onboarded'
} as const;

// Current user ID holder (will be set by auth system)
let currentUserId: string | null = null;

/**
 * Set current user ID for scoped storage
 */
export function setCurrentUserId(userId: string | null): void {
  currentUserId = userId;
  console.log('[LockState] Current user ID set:', userId);
}

/**
 * Get scoped keys for current user
 */
function getKeys() {
  return {
    PIN_SALT: getUserScopedKey(currentUserId, BASE_KEYS.PIN_SALT),
    PIN_HASH: getUserScopedKey(currentUserId, BASE_KEYS.PIN_HASH),
    PIN_CREATED_AT: getUserScopedKey(currentUserId, BASE_KEYS.PIN_CREATED_AT),
    BIO_CRED_ID: getUserScopedKey(currentUserId, BASE_KEYS.BIO_CRED_ID),
    LOCK_STATE: getUserScopedKey(currentUserId, BASE_KEYS.LOCK_STATE),
    LOCK_LAST_ACTIVE: getUserScopedKey(currentUserId, BASE_KEYS.LOCK_LAST_ACTIVE),
    LOCK_TIMEOUT_MS: getUserScopedKey(currentUserId, BASE_KEYS.LOCK_TIMEOUT_MS),
    ONBOARDED: getUserScopedKey(currentUserId, BASE_KEYS.ONBOARDED)
  };
}

const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Get lock state
 */
export function getLockState(): LockState {
  const KEYS = getKeys();
  const state = localStorage.getItem(KEYS.LOCK_STATE) as 'locked' | 'unlocked' || 'locked';
  const lastActive = parseInt(localStorage.getItem(KEYS.LOCK_LAST_ACTIVE) || '0');
  const timeoutMs = parseInt(localStorage.getItem(KEYS.LOCK_TIMEOUT_MS) || String(DEFAULT_TIMEOUT_MS));

  return { state, lastActive, timeoutMs };
}

/**
 * Set lock state
 */
export function setLockState(state: 'locked' | 'unlocked'): void {
  const KEYS = getKeys();
  localStorage.setItem(KEYS.LOCK_STATE, state);
  if (state === 'unlocked') {
    localStorage.setItem(KEYS.LOCK_LAST_ACTIVE, Date.now().toString());
  }
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  const KEYS = getKeys();
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
  const KEYS = getKeys();
  return !!(localStorage.getItem(KEYS.PIN_HASH) && localStorage.getItem(KEYS.PIN_SALT));
}

/**
 * Store PIN credentials
 */
export function storePinCredentials(hash: string, salt: string): void {
  const KEYS = getKeys();
  localStorage.setItem(KEYS.PIN_HASH, hash);
  localStorage.setItem(KEYS.PIN_SALT, salt);
  localStorage.setItem(KEYS.PIN_CREATED_AT, Date.now().toString());
  console.log('✅ PIN_SET_OK for user:', currentUserId);
}

/**
 * Get PIN credentials
 */
export function getPinCredentials(): { hash: string; salt: string } | null {
  const KEYS = getKeys();
  const hash = localStorage.getItem(KEYS.PIN_HASH);
  const salt = localStorage.getItem(KEYS.PIN_SALT);
  
  if (!hash || !salt) return null;
  return { hash, salt };
}

/**
 * Check if biometric is enrolled
 */
export function hasBiometricEnrolled(): boolean {
  const KEYS = getKeys();
  return !!localStorage.getItem(KEYS.BIO_CRED_ID);
}

/**
 * Store biometric credential ID
 */
export function storeBiometricCredId(credId: string): void {
  const KEYS = getKeys();
  localStorage.setItem(KEYS.BIO_CRED_ID, credId);
  console.log('✅ BIO_ENROLL_OK for user:', currentUserId);
}

/**
 * Get biometric credential ID
 */
export function getBiometricCredId(): string | null {
  const KEYS = getKeys();
  return localStorage.getItem(KEYS.BIO_CRED_ID);
}

/**
 * Check if user completed onboarding
 */
export function isOnboarded(): boolean {
  const KEYS = getKeys();
  return localStorage.getItem(KEYS.ONBOARDED) === 'true';
}

/**
 * Mark onboarding as complete
 */
export function setOnboarded(): void {
  const KEYS = getKeys();
  localStorage.setItem(KEYS.ONBOARDED, 'true');
}

/**
 * Set lock timeout
 */
export function setLockTimeout(ms: number): void {
  const KEYS = getKeys();
  localStorage.setItem(KEYS.LOCK_TIMEOUT_MS, ms.toString());
}

/**
 * Clear all lock-related data (for logout)
 */
export function clearLockData(): void {
  const KEYS = getKeys();
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  console.log('[LockState] Cleared data for user:', currentUserId);
}

/**
 * Clear user-scoped data for specific user (for account switching)
 */
export function clearUserScopedData(userId: string): void {
  const scopedKeys = Object.values(BASE_KEYS).map(key => getUserScopedKey(userId, key));
  scopedKeys.forEach(key => localStorage.removeItem(key));
  console.log('[LockState] Cleared scoped data for user:', userId);
}
