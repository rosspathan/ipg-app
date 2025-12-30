/**
 * User-Scoped Wallet Storage Utility
 * 
 * CRITICAL SECURITY: This module ensures wallet data (including private keys and 
 * recovery phrases) is stored separately for each user, preventing data leakage 
 * between users on shared devices.
 * 
 * IMPORTANT: Never auto-migrate global wallet keys to user-scoped storage without
 * verifying ownership (wallet address match).
 */

const BASE_KEY = 'cryptoflow_wallet';
const METAMASK_KEY = 'cryptoflow_metamask_wallet';
const PENDING_WALLET_KEY = 'pending_wallet_import';

// Current user ID for scoped storage
let currentUserId: string | null = null;

export interface StoredWalletData {
  address: string;
  seedPhrase?: string;
  privateKey: string;
  network: 'mainnet';
  balance?: string;
}

/**
 * Set the current user ID for wallet storage scoping
 */
export function setWalletStorageUserId(userId: string | null): void {
  currentUserId = userId;
  console.log('[WALLET_STORAGE] User ID set:', userId ? userId.slice(0, 8) + '...' : 'null');
}

/**
 * Get the current user ID
 */
export function getWalletStorageUserId(): string | null {
  return currentUserId;
}

/**
 * Generate a user-scoped storage key
 */
function getUserScopedKey(baseKey: string, userId: string | null): string {
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Get the storage key for the current user's wallet
 */
export function getWalletStorageKey(userId?: string | null): string {
  const id = userId ?? currentUserId;
  return getUserScopedKey(BASE_KEY, id);
}

/**
 * Get the storage key for the current user's MetaMask wallet
 */
export function getMetaMaskStorageKey(userId?: string | null): string {
  const id = userId ?? currentUserId;
  return getUserScopedKey(METAMASK_KEY, id);
}

/**
 * Store wallet data for the current user
 */
export function storeWallet(walletData: StoredWalletData, userId?: string | null): void {
  const id = userId ?? currentUserId;
  const key = getUserScopedKey(BASE_KEY, id);
  
  try {
    localStorage.setItem(key, JSON.stringify(walletData));
    console.log('[WALLET_STORAGE] Stored wallet for user:', id ? id.slice(0, 8) + '...' : 'anonymous');
  } catch (error) {
    console.error('[WALLET_STORAGE] Failed to store wallet:', error);
  }
}

/**
 * Get stored wallet data for the current user
 * SECURITY: Does NOT auto-migrate from global keys - use safeMigrateIfOwner for that
 */
export function getStoredWallet(userId?: string | null): StoredWalletData | null {
  const id = userId ?? currentUserId;
  const key = getUserScopedKey(BASE_KEY, id);
  
  try {
    const data = localStorage.getItem(key);
    
    if (!data) {
      // No user-scoped wallet found - do NOT auto-migrate from global key
      // The caller must explicitly use safeMigrateIfOwner() after ownership verification
      return null;
    }
    
    const parsed = JSON.parse(data);
    
    // Normalize mnemonic to seedPhrase for backwards compatibility
    if (parsed.mnemonic && !parsed.seedPhrase) {
      parsed.seedPhrase = parsed.mnemonic;
    }
    
    return parsed;
  } catch (error) {
    console.error('[WALLET_STORAGE] Failed to retrieve wallet:', error);
    return null;
  }
}

/**
 * Clear wallet data for the current user
 */
export function clearWallet(userId?: string | null): void {
  const id = userId ?? currentUserId;
  const walletKey = getUserScopedKey(BASE_KEY, id);
  const metamaskKey = getUserScopedKey(METAMASK_KEY, id);
  
  localStorage.removeItem(walletKey);
  localStorage.removeItem(metamaskKey);
  console.log('[WALLET_STORAGE] Cleared wallet for user:', id ? id.slice(0, 8) + '...' : 'anonymous');
}

/**
 * Store MetaMask wallet data
 */
export function storeMetaMaskWallet(walletData: StoredWalletData, userId?: string | null): void {
  const id = userId ?? currentUserId;
  const key = getUserScopedKey(METAMASK_KEY, id);
  
  try {
    localStorage.setItem(key, JSON.stringify(walletData));
  } catch (error) {
    console.error('[WALLET_STORAGE] Failed to store MetaMask wallet:', error);
  }
}

/**
 * Get stored MetaMask wallet data
 */
export function getStoredMetaMaskWallet(userId?: string | null): StoredWalletData | null {
  const id = userId ?? currentUserId;
  const key = getUserScopedKey(METAMASK_KEY, id);
  
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('[WALLET_STORAGE] Failed to retrieve MetaMask wallet:', error);
    return null;
  }
}

/**
 * Clear MetaMask wallet data
 */
export function clearMetaMaskWallet(userId?: string | null): void {
  const id = userId ?? currentUserId;
  const key = getUserScopedKey(METAMASK_KEY, id);
  localStorage.removeItem(key);
}

/**
 * Check if wallet exists for current user
 */
export function hasStoredWallet(userId?: string | null): boolean {
  return getStoredWallet(userId) !== null;
}

// ============================================
// LEGACY KEY HELPERS (for safe migration)
// ============================================

/**
 * Get legacy global wallet data (reads only, does not migrate)
 */
export function getLegacyWallet(): StoredWalletData | null {
  try {
    const data = localStorage.getItem(BASE_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    // Normalize mnemonic to seedPhrase
    if (parsed.mnemonic && !parsed.seedPhrase) {
      parsed.seedPhrase = parsed.mnemonic;
    }
    return parsed;
  } catch (error) {
    console.error('[WALLET_STORAGE] Failed to read legacy wallet:', error);
    return null;
  }
}

/**
 * Clear all legacy/global wallet keys
 */
export function clearLegacyWalletKeys(): void {
  localStorage.removeItem(BASE_KEY);
  localStorage.removeItem(METAMASK_KEY);
  console.log('[WALLET_STORAGE] Cleared legacy wallet keys');
}

/**
 * Clear all pending/temporary wallet keys
 */
export function clearPendingWalletKeys(): void {
  localStorage.removeItem(PENDING_WALLET_KEY);
  localStorage.removeItem('ipg_wallet_data');
  console.log('[WALLET_STORAGE] Cleared pending wallet keys');
}

/**
 * Store a pending wallet (used during onboarding before auth)
 */
export function storePendingWallet(walletData: StoredWalletData): void {
  try {
    localStorage.setItem(PENDING_WALLET_KEY, JSON.stringify(walletData));
    console.log('[WALLET_STORAGE] Stored pending wallet');
  } catch (error) {
    console.error('[WALLET_STORAGE] Failed to store pending wallet:', error);
  }
}

/**
 * Get pending wallet data
 */
export function getPendingWallet(): StoredWalletData | null {
  try {
    const data = localStorage.getItem(PENDING_WALLET_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    if (parsed.mnemonic && !parsed.seedPhrase) {
      parsed.seedPhrase = parsed.mnemonic;
    }
    return parsed;
  } catch (error) {
    console.error('[WALLET_STORAGE] Failed to read pending wallet:', error);
    return null;
  }
}

/**
 * Clear pending wallet
 */
export function clearPendingWallet(): void {
  localStorage.removeItem(PENDING_WALLET_KEY);
}

/**
 * Safe migration: Only migrate if the wallet address matches the user's profile address
 * Returns true if migration occurred
 */
export function safeMigrateIfOwner(userId: string, profileWalletAddress: string | null): boolean {
  if (!profileWalletAddress) {
    console.log('[WALLET_STORAGE] No profile wallet address - cannot verify ownership');
    return false;
  }
  
  // Check if user already has scoped wallet
  const userKey = getUserScopedKey(BASE_KEY, userId);
  if (localStorage.getItem(userKey)) {
    console.log('[WALLET_STORAGE] User already has scoped wallet - no migration needed');
    return false;
  }
  
  // Check legacy wallet
  const legacyWallet = getLegacyWallet();
  if (legacyWallet && legacyWallet.address.toLowerCase() === profileWalletAddress.toLowerCase()) {
    console.log('[WALLET_STORAGE] Legacy wallet matches profile - migrating safely');
    storeWallet(legacyWallet, userId);
    clearLegacyWalletKeys();
    return true;
  }
  
  // Check pending wallet
  const pendingWallet = getPendingWallet();
  if (pendingWallet && pendingWallet.address.toLowerCase() === profileWalletAddress.toLowerCase()) {
    console.log('[WALLET_STORAGE] Pending wallet matches profile - migrating safely');
    storeWallet(pendingWallet, userId);
    clearPendingWallet();
    return true;
  }
  
  // No matching wallet found - clean up stale legacy data to prevent future confusion
  if (legacyWallet || pendingWallet) {
    console.log('[WALLET_STORAGE] Found non-matching legacy/pending wallets - clearing for safety');
    clearLegacyWalletKeys();
    clearPendingWalletKeys();
  }
  
  return false;
}

/**
 * Clear ALL local wallet data (use for "Reset Local Wallet" feature)
 */
export function clearAllLocalWalletData(userId?: string | null): void {
  const id = userId ?? currentUserId;
  
  // Clear user-scoped wallet
  if (id) {
    clearWallet(id);
  }
  
  // Clear legacy global keys
  clearLegacyWalletKeys();
  
  // Clear pending keys
  clearPendingWalletKeys();
  
  console.log('[WALLET_STORAGE] Cleared ALL local wallet data');
}

// ============================================
// DEPRECATED - Remove after migration period
// ============================================

/**
 * @deprecated Use safeMigrateIfOwner instead
 * Migrate legacy wallet data to user-scoped storage - UNSAFE, kept for compatibility
 */
export function migrateWalletToUserScope(userId: string): boolean {
  console.warn('[WALLET_STORAGE] migrateWalletToUserScope is deprecated - use safeMigrateIfOwner instead');
  // No longer auto-migrates - this was the security bug
  return false;
}

/**
 * @deprecated Use clearLegacyWalletKeys instead
 */
export function cleanupLegacyWalletKey(): void {
  clearLegacyWalletKeys();
}
