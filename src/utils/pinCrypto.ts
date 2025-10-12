/* ═══════════════════════════════════════════════════════════
   PIN CRYPTO UTILITIES - Module B
   PBKDF2-SHA256 with 200k iterations, salted
   ═══════════════════════════════════════════════════════════ */

const PBKDF2_ITERATIONS = 200000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Generate a random salt
 */
export function generateSalt(): string {
  const array = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash PIN using PBKDF2-SHA256 with 200k iterations
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(pin);
  const saltBuffer = encoder.encode(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify PIN against stored hash
 */
export async function verifyPin(pin: string, salt: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}

/**
 * Validate PIN format (6 digits)
 */
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Check for weak PINs
 */
export function isWeakPin(pin: string): boolean {
  if (!isValidPin(pin)) return true;

  // Check for sequential numbers
  const isSequential = (s: string) => {
    for (let i = 0; i < s.length - 1; i++) {
      if (parseInt(s[i + 1]) !== parseInt(s[i]) + 1 && 
          parseInt(s[i + 1]) !== parseInt(s[i]) - 1) {
        return false;
      }
    }
    return true;
  };

  // Check for repeated digits
  const allSame = pin.split('').every(digit => digit === pin[0]);
  
  // Check for common patterns
  const commonPatterns = ['123456', '654321', '111111', '000000', '123123'];

  return allSame || isSequential(pin) || commonPatterns.includes(pin);
}
