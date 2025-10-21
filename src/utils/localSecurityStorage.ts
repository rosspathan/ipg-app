import { hashPin, verifyPin, generateSalt } from '@/utils/pinCrypto';

interface LocalSecurityData {
  pin_hash: string;
  pin_salt: string;
  biometric_enabled: boolean;
  anti_phishing_code: string;
  created_at: number;
}

const SECURITY_LOCAL_KEY = 'security_local';
const PENDING_SYNC_KEY = 'pendingSecuritySync';

export const saveLocalSecurityData = async (data: {
  pin: string;
  biometric_enabled: boolean;
  anti_phishing_code: string;
}): Promise<void> => {
  try {
    // Hash PIN using PBKDF2-SHA256
    const salt = generateSalt();
    const pin_hash = await hashPin(data.pin, salt);

    const securityData: LocalSecurityData = {
      pin_hash,
      pin_salt: salt,
      biometric_enabled: data.biometric_enabled,
      anti_phishing_code: data.anti_phishing_code,
      created_at: Date.now()
    };

    // Store in secure local storage
    localStorage.setItem(SECURITY_LOCAL_KEY, JSON.stringify(securityData));
    localStorage.setItem(PENDING_SYNC_KEY, 'true');
  } catch (error) {
    console.error('Failed to save local security data:', error);
    throw error;
  }
};

export const getLocalSecurityData = (): LocalSecurityData | null => {
  try {
    const stored = localStorage.getItem(SECURITY_LOCAL_KEY);
    return stored ? JSON.parse(stored) : null;
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
  return localStorage.getItem(PENDING_SYNC_KEY) === 'true';
};

export const clearPendingSync = (): void => {
  localStorage.removeItem(PENDING_SYNC_KEY);
};

export const clearLocalSecurity = (): void => {
  localStorage.removeItem(SECURITY_LOCAL_KEY);
  localStorage.removeItem(PENDING_SYNC_KEY);
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