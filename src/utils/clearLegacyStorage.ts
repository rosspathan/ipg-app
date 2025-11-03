/**
 * Clear legacy non-user-scoped localStorage keys
 * These keys were used before we implemented user-scoped storage
 */
export function clearLegacyLocalStorage() {
  const legacyKeys = [
    'cryptoflow_lock_state',
    'cryptoflow_unlocked',
    'user_pin_hash',
    'user_pin_salt',
    'biometric_enabled',
    'biometric_cred_id',
    'anti_phishing_code',
    'onboarded',
    'lock_timeout',
    'lastKnownUserId'
  ];

  console.log('[STORAGE_CLEANUP] Clearing legacy non-scoped keys');
  legacyKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`[STORAGE_CLEANUP] Removing: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

/**
 * Clear all user-specific data for account switching
 */
export function clearAllUserData() {
  console.log('[STORAGE_CLEANUP] Clearing all user-specific data');
  
  // Clear legacy keys
  clearLegacyLocalStorage();
  
  // Clear user-scoped keys (they contain user_id prefix)
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    // Clear any key that looks like it might contain user data
    if (
      key.includes('user_') ||
      key.includes('security_') ||
      key.includes('pin_') ||
      key.includes('lock_')
    ) {
      console.log(`[STORAGE_CLEANUP] Removing user-scoped: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // Clear session storage
  sessionStorage.clear();
}
