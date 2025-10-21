import { hashPin, verifyPin, generateSalt } from '@/utils/pinCrypto';

interface LocalSecurityData {
  pin_hash: string;
  pin_salt: string;
  biometric_enabled: boolean;
  anti_phishing_code: string;
  created_at: number;
  user_id?: string; // Track which user owns this data
}

const BASE_SECURITY_KEY = 'security_local';
const BASE_PENDING_KEY = 'pendingSecuritySync';

// Current user ID holder
let currentUserId: string | null = null;

/**
 * Set current user ID for scoped storage
 */
export function setSecurityUserId(userId: string | null): void {
  currentUserId = userId;
  console.log('[LocalSecurityStorage] User ID set:', userId);
}

/**
 * Get user-scoped key
 */
function getUserScopedKey(userId: string | null, baseKey: string): string {
  if (!userId) return baseKey; // Fallback for backward compatibility
  return `${baseKey}_${userId}`;
}

/**
 * Get keys for current user
 */
function getKeys() {
  return {
    SECURITY_LOCAL_KEY: getUserScopedKey(currentUserId, BASE_SECURITY_KEY),
    PENDING_SYNC_KEY: getUserScopedKey(currentUserId, BASE_PENDING_KEY)
  };
}

export const saveLocalSecurityData = async (data: {
  pin: string;
  biometric_enabled: boolean;
  anti_phishing_code: string;
}): Promise<void> => {
  try {
    const { SECURITY_LOCAL_KEY, PENDING_SYNC_KEY } = getKeys();
    
    // Hash PIN using PBKDF2-SHA256
    const salt = generateSalt();
    const pin_hash = await hashPin(data.pin, salt);

    const securityData: LocalSecurityData = {
      pin_hash,
      pin_salt: salt,
      biometric_enabled: data.biometric_enabled,
      anti_phishing_code: data.anti_phishing_code,
      created_at: Date.now(),
      user_id: currentUserId || undefined
    };

    // Store in secure local storage
    localStorage.setItem(SECURITY_LOCAL_KEY, JSON.stringify(securityData));
    localStorage.setItem(PENDING_SYNC_KEY, 'true');
    console.log('[LocalSecurityStorage] Saved for user:', currentUserId);
  } catch (error) {
    console.error('Failed to save local security data:', error);
    throw error;
  }
};

export const getLocalSecurityData = (): LocalSecurityData | null => {
  try {
    const { SECURITY_LOCAL_KEY } = getKeys();
    const stored = localStorage.getItem(SECURITY_LOCAL_KEY);
    const data = stored ? JSON.parse(stored) : null;
    
    // Validate user ownership
    if (data && currentUserId && data.user_id && data.user_id !== currentUserId) {
      console.warn('[LocalSecurityStorage] Security data owner mismatch!', {
        stored: data.user_id,
        current: currentUserId
      });
      return null; // Don't return data for wrong user
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get local security data:', error);
    return null;
  }
};

export const hasLocalSecurity = (): boolean => {
  return getLocalSecurityData() !== null;
};

export const hasAnySecurity = (): boolean => {
  // Check modern unified storage first
  if (hasLocalSecurity()) return true;
  
  // Fallback to legacy keys for backward compatibility
  const legacyPin = localStorage.getItem('user_pin');
  const legacyBiometric = localStorage.getItem('biometric_enabled');
  
  return !!(legacyPin || legacyBiometric);
};

export const isPendingSync = (): boolean => {
  const { PENDING_SYNC_KEY } = getKeys();
  return localStorage.getItem(PENDING_SYNC_KEY) === 'true';
};

export const clearPendingSync = (): void => {
  const { PENDING_SYNC_KEY } = getKeys();
  localStorage.removeItem(PENDING_SYNC_KEY);
};

export const clearLocalSecurity = (): void => {
  const { SECURITY_LOCAL_KEY, PENDING_SYNC_KEY } = getKeys();
  localStorage.removeItem(SECURITY_LOCAL_KEY);
  localStorage.removeItem(PENDING_SYNC_KEY);
  console.log('[LocalSecurityStorage] Cleared for user:', currentUserId);
};

/**
 * Clear security data for specific user (for account switching)
 */
export const clearUserSecurityData = (userId: string): void => {
  const scopedSecurityKey = getUserScopedKey(userId, BASE_SECURITY_KEY);
  const scopedPendingKey = getUserScopedKey(userId, BASE_PENDING_KEY);
  localStorage.removeItem(scopedSecurityKey);
  localStorage.removeItem(scopedPendingKey);
  console.log('[LocalSecurityStorage] Cleared scoped data for user:', userId);
};

export const verifyLocalPin = async (pin: string): Promise<boolean> => {
  const localData = getLocalSecurityData();
  if (!localData) return false;

  try {
    return await verifyPin(pin, localData.pin_salt, localData.pin_hash);
  } catch (error) {
    console.error('Failed to verify local PIN:', error);
    return false;
  }
};