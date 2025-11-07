/**
 * Security Cleanup Utility
 * Removes insecure localStorage entries that could be exploited for privilege escalation
 */

const INSECURE_KEYS = [
  'cryptoflow_web3_admin',
  'cryptoflow_admin_wallet', 
  'cryptoflow_admin_user'
];

/**
 * Removes all insecure localStorage entries
 * Should be called on app initialization
 */
export function cleanupInsecureStorage() {
  try {
    INSECURE_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        console.warn(`[SECURITY] Removing insecure localStorage key: ${key}`);
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('[SECURITY] Failed to cleanup insecure storage:', error);
  }
}

/**
 * Validates that no insecure localStorage keys exist
 * Returns true if storage is secure, false if insecure keys found
 */
export function validateStorageSecurity(): boolean {
  try {
    const insecureKeysFound = INSECURE_KEYS.filter(key => 
      localStorage.getItem(key) !== null
    );
    
    if (insecureKeysFound.length > 0) {
      console.error('[SECURITY] Insecure localStorage keys found:', insecureKeysFound);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[SECURITY] Failed to validate storage security:', error);
    return false;
  }
}
