/**
 * User-Scoped Wallet Storage Utility
 * 
 * CRITICAL SECURITY: This module ensures wallet data (including private keys and 
 * recovery phrases) is stored separately for each user, preventing data leakage 
 * between users on shared devices.
 */

const BASE_KEY = 'cryptoflow_wallet';
const METAMASK_KEY = 'cryptoflow_metamask_wallet';

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
 */
export function getStoredWallet(userId?: string | null): StoredWalletData | null {
  const id = userId ?? currentUserId;
  const key = getUserScopedKey(BASE_KEY, id);
  
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      // Fallback: Try legacy global key for migration
      const legacyData = localStorage.getItem(BASE_KEY);
      if (legacyData && id) {
        console.log('[WALLET_STORAGE] Found legacy wallet data, migrating...');
        const parsed = JSON.parse(legacyData);
        // Migrate to user-scoped key
        storeWallet(parsed, id);
        // Clear legacy key to prevent confusion
        localStorage.removeItem(BASE_KEY);
        return parsed;
      }
      return null;
    }
    return JSON.parse(data);
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

/**
 * Migrate legacy wallet data to user-scoped storage
 * Call this after user authenticates
 */
export function migrateWalletToUserScope(userId: string): boolean {
  const legacyData = localStorage.getItem(BASE_KEY);
  
  if (!legacyData) {
    return false;
  }
  
  try {
    const parsed = JSON.parse(legacyData);
    const userKey = getUserScopedKey(BASE_KEY, userId);
    
    // Only migrate if user doesn't already have wallet data
    if (!localStorage.getItem(userKey)) {
      localStorage.setItem(userKey, legacyData);
      console.log('[WALLET_STORAGE] Migrated legacy wallet to user scope');
    }
    
    // Don't delete legacy key here - it will be cleaned up when we're sure migration succeeded
    return true;
  } catch (error) {
    console.error('[WALLET_STORAGE] Migration failed:', error);
    return false;
  }
}

/**
 * Clean up legacy global key after successful migration
 */
export function cleanupLegacyWalletKey(): void {
  localStorage.removeItem(BASE_KEY);
  localStorage.removeItem(METAMASK_KEY);
  console.log('[WALLET_STORAGE] Cleaned up legacy wallet keys');
}
