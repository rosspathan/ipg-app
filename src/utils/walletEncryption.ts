/**
 * Wallet Encryption Utilities
 * 
 * Uses Web Crypto API for AES-256-GCM encryption of wallet seed phrases.
 * The encryption key is derived from the user's PIN using PBKDF2.
 * Server never sees plaintext - all encryption/decryption happens client-side.
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return arrayBufferToBase64(salt);
}

/**
 * Generate a random IV for encryption
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/**
 * Derive an AES-256 key from PIN using PBKDF2
 */
async function deriveKeyFromPin(pin: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  const saltData = base64ToArrayBuffer(salt);

  // Import PIN as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt seed phrase with user's PIN
 * Returns encrypted data, IV, and salt (all base64 encoded)
 */
export async function encryptSeedPhrase(
  seedPhrase: string,
  pin: string
): Promise<{ encryptedData: string; iv: string; salt: string }> {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKeyFromPin(pin, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(seedPhrase);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext
  );

  return {
    encryptedData: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    salt
  };
}

/**
 * Decrypt seed phrase using user's PIN
 * Returns the plaintext seed phrase or throws on failure
 */
export async function decryptSeedPhrase(
  encryptedData: string,
  iv: string,
  salt: string,
  pin: string
): Promise<string> {
  try {
    const key = await deriveKeyFromPin(pin, salt);
    const ciphertext = base64ToArrayBuffer(encryptedData);
    const ivData = base64ToArrayBuffer(iv);

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    console.error('[WALLET_ENCRYPTION] Decryption failed:', error);
    throw new Error('Invalid PIN or corrupted data');
  }
}

/**
 * Verify if Web Crypto API is available
 */
export function isEncryptionSupported(): boolean {
  return !!(
    typeof crypto !== 'undefined' &&
    crypto.subtle &&
    typeof crypto.subtle.encrypt === 'function' &&
    typeof crypto.subtle.decrypt === 'function'
  );
}
