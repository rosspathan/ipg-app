/**
 * Centralized Crypto Logo Configuration
 * Maps asset symbols to their official logos
 */

import ipgLogo from '@/assets/crypto-logos/ipg-logo.png';
import bskLogo from '@/assets/crypto-logos/bsk-logo.png';
import usdiLogo from '@/assets/crypto-logos/usdi-logo.png';

export const CRYPTO_LOGOS: Record<string, string> = {
  IPG: ipgLogo,
  BSK: bskLogo,
  USDI: usdiLogo,
};

/**
 * Get the logo URL for a given asset symbol
 * Returns the custom logo if available, otherwise falls back to provided logoUrl or placeholder
 */
export const getCryptoLogoUrl = (symbol: string, fallbackUrl?: string | null): string => {
  const upperSymbol = symbol.toUpperCase();
  
  // Check for custom logo first
  if (CRYPTO_LOGOS[upperSymbol]) {
    return CRYPTO_LOGOS[upperSymbol];
  }
  
  // Use fallback URL if provided
  if (fallbackUrl) {
    return fallbackUrl;
  }
  
  // Default placeholder
  return '/placeholder-crypto.svg';
};
