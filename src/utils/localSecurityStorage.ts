

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
    // Hash PIN client-side (dynamic import to avoid bundling node 'crypto')
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const pin_hash = await bcrypt.hash(data.pin, salt);

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
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(pin, localData.pin_hash);
  } catch (error) {
    console.error('Failed to verify local PIN:', error);
    return false;
  }
};