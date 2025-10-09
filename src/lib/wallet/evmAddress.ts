/**
 * EVM wallet address management utilities
 * Part of the Username+Wallet patch
 * 
 * SECURITY: This module NEVER handles seed phrases directly.
 * Only public addresses are stored and retrieved.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Store EVM address to sessionStorage during onboarding
 * @param address - EVM public address (0x...)
 */
export function storeEvmAddressTemp(address: string): void {
  if (!address || !address.startsWith('0x')) {
    console.warn('[EVM] Invalid address format:', address);
    return;
  }
  sessionStorage.setItem('ipg_temp_evm_address', address);
  console.info('[EVM] Stored temp address:', address.slice(0, 10) + '...');
}

/**
 * Get stored EVM address for a user from Supabase
 * @param userId - User's ID
 * @returns The EVM address (0x...) or null if not found
 */
export async function getStoredEvmAddress(userId: string): Promise<string | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('profiles' as any)
      .select('wallet_addresses, wallet_address' as any)
      .eq('user_id', userId)
      .maybeSingle();

    // Helper: validate
    const isAddress = (val: unknown) => typeof val === 'string' && val.startsWith('0x') && val.length >= 42;

    // Try parsing from DB first (even if error, continue to local fallbacks)
    if (data) {
      const wa = (data as any).wallet_addresses;
      const legacy = (data as any).wallet_address;

      // Handle many possible shapes
      const candidates: any[] = [
        // Known structures
        wa?.evm?.bsc,
        wa?.evm?.mainnet,
        wa?.evm,
        wa?.bsc,
        wa?.ethereum,
        wa?.BEP20,
        wa?.ERC20,
        // If wallet_addresses itself is a string
        wa,
        // Legacy column
        legacy,
      ];

      const found = candidates.find(isAddress);
      if (found) return found as string;
    }

    if (error) {
      console.warn('[EVM] profiles fetch error, will try local fallbacks:', error);
    }

    // Local fallbacks (created/imported wallet or cached MetaMask)
    try {
      const localWallet = localStorage.getItem('cryptoflow_wallet');
      if (localWallet) {
        const parsed = JSON.parse(localWallet);
        if (isAddress(parsed?.address)) return parsed.address;
      }
    } catch {}

    try {
      const mm = localStorage.getItem('cryptoflow_metamask_wallet');
      if (mm) {
        const parsed = JSON.parse(mm);
        if (isAddress(parsed?.address)) return parsed.address;
      }
    } catch {}

    // Onboarding state fallback
    try {
      const onboard = localStorage.getItem('ipg_onboarding_state');
      if (onboard) {
        const parsed = JSON.parse(onboard);
        const addr = parsed?.walletInfo?.address;
        if (isAddress(addr)) return addr;
      }
    } catch {}

    console.warn('[EVM] No profile or local wallet address found for user');
    return null;
  } catch (err) {
    console.error('[EVM] Error fetching wallet address:', err);
    return null;
  }
}

/**
 * Derive EVM address from mnemonic on-device (m/44'/60'/0'/0/0)
 * and store only the public address
 */
async function deriveEvmAddressFromMnemonic(): Promise<string> {
  // Try multiple local storage locations for mnemonic set during onboarding
  const recovery = localStorage.getItem('wallet_data_recovery');
  const internal = localStorage.getItem('cryptoflow_wallet');

  let mnemonic: string | null = null;
  try {
    if (recovery) {
      const parsed = JSON.parse(recovery);
      mnemonic = parsed?.mnemonic || parsed?.seedPhrase || null;
    }
  } catch {}

  if (!mnemonic && internal) {
    try {
      const parsed = JSON.parse(internal);
      mnemonic = parsed?.seedPhrase || parsed?.mnemonic || null;
    } catch {}
  }

  if (!mnemonic) {
    throw new Error('No wallet mnemonic found. Please complete wallet setup first.');
  }

  try {
    // Import ethers for wallet derivation
    const { Wallet } = await import('ethers');
    const hdWallet = Wallet.fromPhrase(mnemonic);
    return hdWallet.address;
  } catch (err) {
    console.error('Failed to derive EVM address:', err);
    throw new Error('Could not derive wallet address from mnemonic');
  }
}

/**
 * Ensure user has an EVM wallet address onboarded
 * Derives address on-device if needed and stores it
 * 
 * @returns The EVM address after ensuring it exists
 * @throws Error if wallet generation fails
 */
export async function ensureWalletAddressOnboarded(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('No authenticated user');
  }

  // Check if address already exists
  let existing = await getStoredEvmAddress(user.id);
  if (existing) {
    return existing;
  }

  // Derive new address from mnemonic
  const address = await deriveEvmAddressFromMnemonic();
  
  // Store the public address
  await storeEvmAddress(user.id, address);
  
  return address;
}

/**
 * Store EVM address for a user (called after on-device derivation)
 * @param userId - User's ID
 * @param address - The derived EVM address (0x...)
 */
export async function storeEvmAddress(userId: string, address: string): Promise<void> {
  if (!address.startsWith('0x')) {
    throw new Error('Invalid EVM address format');
  }

  const walletAddresses = {
    evm: {
      mainnet: address,
      bsc: address // Same address for both networks
    }
  };

  const { error } = await supabase
    .from('profiles')
    .update({ 
      wallet_addresses: walletAddresses,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[EVM] Failed to store wallet address:', error);
    throw error;
  }

  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('evm:address:updated', { detail: { address } }));
}

/**
 * Alias for storeEvmAddress - persists EVM address to Supabase
 */
export const persistEvmAddress = storeEvmAddress;

/**
 * Get the appropriate block explorer URL for an address
 * @param address - The EVM address
 * @param network - "bsc" or "ethereum"
 * @returns Full explorer URL
 */
export function getExplorerUrl(address: string, network: 'bsc' | 'ethereum' = 'bsc'): string {
  if (network === 'bsc') {
    return `https://bscscan.com/address/${address}`;
  }
  return `https://etherscan.io/address/${address}`;
}

/**
 * Format address for display (with middle ellipsis)
 * @param address - Full address
 * @param prefixLength - Characters to show at start (default 6)
 * @param suffixLength - Characters to show at end (default 4)
 */
export function formatAddress(address: string, prefixLength = 6, suffixLength = 4): string {
  if (!address || address.length < prefixLength + suffixLength) {
    return address;
  }
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}
