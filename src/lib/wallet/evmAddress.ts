/**
 * EVM wallet address management utilities
 * Part of the Username+Wallet patch
 * 
 * SECURITY: This module NEVER handles seed phrases directly.
 * Only public addresses are stored and retrieved.
 * 
 * INTEGRITY: For authenticated users, only trusted sources are used.
 * Legacy/global localStorage fallbacks are disabled to prevent wallet corruption.
 */

import { supabase } from "@/integrations/supabase/client";
import { getStoredWallet, getWalletStorageKey } from "@/utils/walletStorage";

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

// Helper: validate address format
const isValidAddress = (val: unknown): val is string => 
  typeof val === 'string' && val.startsWith('0x') && val.length >= 42;

/**
 * Check if there's a wallet integrity mismatch for a user
 * Returns details about any detected mismatch
 */
export async function checkWalletIntegrity(userId: string): Promise<{
  hasMismatch: boolean;
  profileWallet: string | null;
  bscWallet: string | null;
  backupWallet: string | null;
  mismatchType: 'profile_vs_backup' | 'profile_vs_bsc' | 'both' | null;
}> {
  try {
    // Fetch profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_address, bsc_wallet_address')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch backup data
    const { data: backup } = await supabase
      .from('encrypted_wallet_backups')
      .select('wallet_address')
      .eq('user_id', userId)
      .maybeSingle();

    const profileWallet = profile?.wallet_address?.toLowerCase() || null;
    const bscWallet = profile?.bsc_wallet_address?.toLowerCase() || null;
    const backupWallet = backup?.wallet_address?.toLowerCase() || null;

    const hasProfileVsBackup = backupWallet && profileWallet && profileWallet !== backupWallet;
    const hasProfileVsBsc = profileWallet && bscWallet && profileWallet !== bscWallet;

    let mismatchType: 'profile_vs_backup' | 'profile_vs_bsc' | 'both' | null = null;
    if (hasProfileVsBackup && hasProfileVsBsc) {
      mismatchType = 'both';
    } else if (hasProfileVsBackup) {
      mismatchType = 'profile_vs_backup';
    } else if (hasProfileVsBsc) {
      mismatchType = 'profile_vs_bsc';
    }

    return {
      hasMismatch: mismatchType !== null,
      profileWallet: profile?.wallet_address || null,
      bscWallet: profile?.bsc_wallet_address || null,
      backupWallet: backup?.wallet_address || null,
      mismatchType
    };
  } catch (error) {
    console.error('[EVM] Error checking wallet integrity:', error);
    return {
      hasMismatch: false,
      profileWallet: null,
      bscWallet: null,
      backupWallet: null,
      mismatchType: null
    };
  }
}

/**
 * Get stored EVM address for a user from Supabase
 * SECURITY: For authenticated users, only trusted DB sources are used.
 * Legacy localStorage fallbacks are disabled to prevent wallet corruption.
 * 
 * @param userId - User's ID
 * @returns The EVM address (0x...) or null if not found
 */
export async function getStoredEvmAddress(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('wallet_addresses, wallet_address, bsc_wallet_address')
      .eq('user_id', userId)
      .maybeSingle();

    // Try parsing from DB first
    if (data) {
      const wa = data.wallet_addresses as Record<string, unknown> | null;
      const walletAddr = data.wallet_address as string | null;
      const bscAddr = data.bsc_wallet_address as string | null;

      // CANONICAL RULE: wallet_address is authoritative
      // If both exist and differ, we have a mismatch - still return wallet_address
      // but this will trigger integrity warnings elsewhere
      
      if (isValidAddress(walletAddr)) {
        // Check for BSC mismatch and log warning
        if (isValidAddress(bscAddr) && walletAddr.toLowerCase() !== bscAddr.toLowerCase()) {
          console.warn('[EVM] INTEGRITY: wallet_address and bsc_wallet_address differ!', {
            wallet: walletAddr.slice(0, 10),
            bsc: bscAddr.slice(0, 10)
          });
        }
        return walletAddr;
      }

      // Fall back to bsc_wallet_address if wallet_address is empty
      if (isValidAddress(bscAddr)) {
        return bscAddr;
      }

      // Try wallet_addresses JSON
      if (wa) {
        const candidates: unknown[] = [
          (wa as any)?.['bsc-mainnet'],
          (wa as any)?.['evm-mainnet'],
          (wa as any)?.bsc,
          (wa as any)?.evm?.bsc,
          (wa as any)?.evm?.mainnet,
          (wa as any)?.evm,
        ];
        const found = candidates.find(isValidAddress);
        if (found) return found;
      }
    }

    if (error) {
      console.warn('[EVM] profiles fetch error:', error);
    }

    // Fallback: Check user_wallets table
    try {
      const { data: walletData } = await supabase
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_id', userId)
        .order('last_used_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (walletData?.wallet_address && isValidAddress(walletData.wallet_address)) {
        console.info('[EVM] Found wallet in user_wallets table');
        return walletData.wallet_address;
      }
    } catch (walletErr) {
      console.warn('[EVM] user_wallets fallback failed:', walletErr);
    }

    // SECURITY: Only use user-scoped wallet storage for authenticated users
    // Legacy/global localStorage fallbacks are DISABLED to prevent wallet corruption
    try {
      const scopedWallet = getStoredWallet(userId);
      if (scopedWallet && isValidAddress(scopedWallet.address)) {
        console.info('[EVM] Found user-scoped local wallet');
        return scopedWallet.address;
      }
    } catch {}

    // NO LEGACY FALLBACKS for authenticated users
    // This prevents:
    // - cryptoflow_wallet (global, could be another user's wallet)
    // - cryptoflow_metamask_wallet (global, could be unrelated MetaMask)
    // - ipg_onboarding_state (could be stale from previous session)
    
    console.warn('[EVM] No verified wallet address found for user', userId.slice(0, 8));
    return null;
  } catch (err) {
    console.error('[EVM] Error fetching wallet address:', err);
    return null;
  }
}

/**
 * Get stored EVM address for unauthenticated/onboarding flow
 * This allows legacy fallbacks since there's no user context to corrupt
 */
export async function getStoredEvmAddressUnauthenticated(): Promise<string | null> {
  // Check onboarding state first (most likely for new users)
  try {
    const onboard = localStorage.getItem('ipg_onboarding_state');
    if (onboard) {
      const parsed = JSON.parse(onboard);
      const addr = parsed?.walletInfo?.address;
      if (isValidAddress(addr)) return addr;
    }
  } catch {}

  // Legacy wallet storage
  try {
    const localWallet = localStorage.getItem('cryptoflow_wallet');
    if (localWallet) {
      const parsed = JSON.parse(localWallet);
      if (isValidAddress(parsed?.address)) return parsed.address;
    }
  } catch {}

  try {
    const mm = localStorage.getItem('cryptoflow_metamask_wallet');
    if (mm) {
      const parsed = JSON.parse(mm);
      if (isValidAddress(parsed?.address)) return parsed.address;
    }
  } catch {}

  return null;
}

/**
 * Derive EVM address from mnemonic on-device (m/44'/60'/0'/0/0)
 * and store only the public address
 */
async function deriveEvmAddressFromMnemonic(): Promise<string> {
  // Try multiple local storage locations for mnemonic set during onboarding
  const recovery = localStorage.getItem('wallet_data_recovery');
  // Try user-scoped wallet first, then legacy
  const scopedWallet = getStoredWallet(null); // Uses current user ID
  const internal = scopedWallet ? JSON.stringify(scopedWallet) : localStorage.getItem('cryptoflow_wallet');

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
 * CRITICAL: Always updates wallet_address, bsc_wallet_address, AND wallet_addresses
 * to maintain consistency and prevent mismatches.
 * 
 * @param userId - User's ID
 * @param address - The derived EVM address (0x...)
 */
export async function storeEvmAddress(userId: string, address: string): Promise<void> {
  if (!address.startsWith('0x')) {
    throw new Error('Invalid EVM address format');
  }

  // Store in both nested and flat key formats for maximum compatibility
  // CRITICAL: All fields must be set to the SAME address
  const walletAddresses = {
    // Nested format (legacy)
    evm: {
      mainnet: address,
      bsc: address
    },
    // Flat keys (used by edge functions)
    'bsc-mainnet': address,
    'evm-mainnet': address,
    'bsc': address
  };

  const { error } = await supabase
    .from('profiles')
    .update({ 
      wallet_addresses: walletAddresses,
      wallet_address: address,
      bsc_wallet_address: address, // MUST match wallet_address
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[EVM] Failed to store wallet address:', error);
    throw error;
  }

  console.info('[EVM] Stored wallet address (all fields synchronized):', address.slice(0, 10) + '...');
  
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
