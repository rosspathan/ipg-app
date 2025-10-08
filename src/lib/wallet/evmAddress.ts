/**
 * EVM wallet address management utilities
 * Part of the Username+Wallet patch
 * 
 * SECURITY: This module NEVER handles seed phrases directly.
 * Only public addresses are stored and retrieved.
 */

import { supabase } from "@/integrations/supabase/client";

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

    if (error || !data) {
      console.warn('[EVM] No profile or wallet_addresses found for user');
      return null;
    }

    // wallet_addresses is JSONB: { evm: { mainnet: "0x...", bsc: "0x..." } }
    const walletAddresses = data.wallet_addresses as any;
    
    // Try BSC first, then mainnet, then any EVM address
    const evmAddress = walletAddresses?.evm?.bsc || 
                       walletAddresses?.evm?.mainnet ||
                       walletAddresses?.evm;

    if (typeof evmAddress === 'string' && evmAddress.startsWith('0x')) {
      return evmAddress;
    }

    // Backward-compat: legacy column wallet_address (text)
    if (typeof (data as any).wallet_address === 'string' && (data as any).wallet_address.startsWith('0x')) {
      return (data as any).wallet_address;
    }

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
  // Check if we have a stored mnemonic in the recovery phrase storage
  const storedData = localStorage.getItem('wallet_data_recovery');
  if (!storedData) {
    throw new Error('No wallet mnemonic found. Please complete wallet setup first.');
  }

  try {
    const parsed = JSON.parse(storedData);
    const mnemonic = parsed.mnemonic;
    
    if (!mnemonic) {
      throw new Error('Invalid wallet data');
    }

    // Import ethers for wallet derivation
    const { Wallet } = await import('ethers');
    
    // Derive HD wallet from mnemonic (ETH path: m/44'/60'/0'/0/0)
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
}

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
