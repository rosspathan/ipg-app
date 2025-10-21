import { ethers } from 'ethers';

export interface AddressValidation {
  isValid: boolean;
  network: 'BEP20' | 'ERC20' | 'BTC' | 'TRC20' | null;
  error?: string;
}

export function validateCryptoAddress(
  address: string,
  expectedNetwork: string
): AddressValidation {
  const trimmedAddress = address.trim();

  // EVM addresses (BEP20, Ethereum)
  if (expectedNetwork === 'BEP20' || expectedNetwork === 'Ethereum') {
    if (!trimmedAddress.startsWith('0x')) {
      return {
        isValid: false,
        network: null,
        error: 'EVM address must start with 0x'
      };
    }

    if (trimmedAddress.length !== 42) {
      return {
        isValid: false,
        network: null,
        error: 'EVM address must be 42 characters (0x + 40 hex characters)'
      };
    }

    // Validate checksum using ethers.js
    try {
      ethers.getAddress(trimmedAddress);
      return {
        isValid: true,
        network: expectedNetwork === 'BEP20' ? 'BEP20' : 'ERC20'
      };
    } catch (error) {
      return {
        isValid: false,
        network: null,
        error: 'Invalid EVM address checksum'
      };
    }
  }

  // Bitcoin address validation
  if (expectedNetwork === 'Bitcoin') {
    const btcRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
    if (!btcRegex.test(trimmedAddress)) {
      return {
        isValid: false,
        network: null,
        error: 'Invalid Bitcoin address format'
      };
    }
    return { isValid: true, network: 'BTC' };
  }

  // Tron address validation
  if (expectedNetwork === 'Tron') {
    if (!trimmedAddress.startsWith('T')) {
      return {
        isValid: false,
        network: null,
        error: 'Tron address must start with T'
      };
    }
    if (trimmedAddress.length !== 34) {
      return {
        isValid: false,
        network: null,
        error: 'Tron address must be 34 characters'
      };
    }
    return { isValid: true, network: 'TRC20' };
  }

  return {
    isValid: false,
    network: null,
    error: 'Unsupported network'
  };
}
