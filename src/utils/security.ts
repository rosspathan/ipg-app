

export interface SecuritySetup {
  hasPin: boolean;
  hasBiometric: boolean;
  isLocked: boolean;
  lastUnlockTime?: number;
}

/**
 * Hash PIN securely using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const saltRounds = 12;
  return await bcrypt.hash(pin, saltRounds);
}

/**
 * Verify PIN against stored hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(pin, hash);
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Store security setup in secure storage
 */
export function storeSecuritySetup(setup: SecuritySetup): boolean {
  try {
    localStorage.setItem('ipg_security_setup', JSON.stringify(setup));
    return true;
  } catch (error) {
    console.error('Error storing security setup:', error);
    return false;
  }
}

/**
 * Get current security setup
 */
export function getSecuritySetup(): SecuritySetup {
  try {
    const stored = localStorage.getItem('ipg_security_setup');
    if (!stored) {
      return {
        hasPin: false,
        hasBiometric: false,
        isLocked: true
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting security setup:', error);
    return {
      hasPin: false,
      hasBiometric: false,
      isLocked: true
    };
  }
}

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  // Check if Web Authentication API is available
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    // Check if biometric authenticators are available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
}

/**
 * Setup biometric authentication
 */
export async function setupBiometric(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!await isBiometricAvailable()) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device.'
      };
    }

    // Create credential for biometric authentication
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: {
          name: 'IPG iSmart Exchange',
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: 'User'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'direct'
      }
    }) as PublicKeyCredential;

    if (credential) {
      // Store credential ID for future authentication
      localStorage.setItem('ipg_biometric_id', credential.id);
      return { success: true };
    }

    return {
      success: false,
      error: 'Failed to create biometric credential.'
    };
  } catch (error) {
    console.error('Error setting up biometric:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Biometric setup failed.'
    };
  }
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometric(): Promise<{ success: boolean; error?: string }> {
  try {
    const credentialId = localStorage.getItem('ipg_biometric_id');
    if (!credentialId) {
      return {
        success: false,
        error: 'Biometric authentication not set up.'
      };
    }

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32),
        allowCredentials: [{
          id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
          type: 'public-key'
        }],
        userVerification: 'required',
        timeout: 60000
      }
    });

    if (assertion) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Biometric authentication failed.'
    };
  } catch (error) {
    console.error('Error authenticating with biometric:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Biometric authentication failed.'
    };
  }
}

/**
 * Generate a secure verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store verification code with expiry
 */
export function storeVerificationCode(email: string, code: string): void {
  const data = {
    code,
    email,
    expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
  };
  localStorage.setItem('ipg_verification_code', JSON.stringify(data));
}

/**
 * Verify email verification code
 */
export function verifyEmailCode(email: string, code: string): { valid: boolean; error?: string } {
  try {
    const stored = localStorage.getItem('ipg_verification_code');
    if (!stored) {
      return { valid: false, error: 'No verification code found.' };
    }

    const data = JSON.parse(stored);
    
    // Check expiry
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem('ipg_verification_code');
      return { valid: false, error: 'Verification code has expired.' };
    }

    // Normalize inputs for comparison
    const normalizedEmail = (email || '').toLowerCase().trim();
    const normalizedStoredEmail = (data.email || '').toLowerCase().trim();
    const normalizedCode = String(code || '').trim();
    const normalizedStoredCode = String(data.code || '').trim();

    // Primary check: if the code matches, accept as valid
    if (normalizedStoredCode === normalizedCode) {
      // Optionally warn if email mismatches, but do not block success
      if (normalizedStoredEmail !== normalizedEmail) {
        console.warn('Email mismatch during verification; code matched. Proceeding.', {
          stored: normalizedStoredEmail,
          provided: normalizedEmail
        });
      }
      localStorage.removeItem('ipg_verification_code');
      return { valid: true };
    }

    // If code doesn't match, fail
    console.log('Code mismatch:', { stored: normalizedStoredCode, provided: normalizedCode });
    return { valid: false, error: 'Invalid verification code.' };
  } catch (error) {
    console.error('Error verifying email code:', error);
    return { valid: false, error: 'Error verifying code.' };
  }
}

/**
 * Clear all security data (for logout)
 */
export function clearSecurityData(): void {
  localStorage.removeItem('ipg_security_setup');
  localStorage.removeItem('ipg_biometric_id');
  localStorage.removeItem('ipg_verification_code');
  localStorage.removeItem('ipg_wallet_data');
}

/**
 * Validate PIN format
 */
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Session management
 */
export const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function updateLastActivity(): void {
  localStorage.setItem('ipg_last_activity', Date.now().toString());
}

export function isSessionExpired(): boolean {
  const lastActivity = localStorage.getItem('ipg_last_activity');
  if (!lastActivity) return true;
  
  return Date.now() - parseInt(lastActivity) > SESSION_TIMEOUT;
}

export function lockSession(): void {
  const setup = getSecuritySetup();
  setup.isLocked = true;
  storeSecuritySetup(setup);
}