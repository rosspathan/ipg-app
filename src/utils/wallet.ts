import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import QRCode from 'qrcode';

export interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic: string;
  qrCode: string;
}

export interface WalletCreationResult {
  success: boolean;
  wallet?: WalletInfo;
  error?: string;
}

/**
 * Generate a new BIP39 wallet with 12 or 24 words
 */
export async function createWallet(wordCount: 12 | 24 = 12): Promise<WalletCreationResult> {
  try {
    // Generate entropy for the specified word count
    const entropy = wordCount === 12 ? 128 : 256;
    const mnemonic = bip39.generateMnemonic(entropy);
    
    // Create wallet from mnemonic
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    
    // Generate QR code for the address
    const qrCode = await QRCode.toDataURL(wallet.address, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return {
      success: true,
      wallet: {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic,
        qrCode
      }
    };
  } catch (error) {
    console.error('Error creating wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create wallet'
    };
  }
}

/**
 * Import wallet from mnemonic phrase
 */
export async function importWallet(mnemonic: string): Promise<WalletCreationResult> {
  try {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic.trim())) {
      return {
        success: false,
        error: 'Invalid mnemonic phrase. Please check your words.'
      };
    }

    // Create wallet from mnemonic
    const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
    
    // Generate QR code for the address
    const qrCode = await QRCode.toDataURL(wallet.address, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return {
      success: true,
      wallet: {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: mnemonic.trim(),
        qrCode
      }
    };
  } catch (error) {
    console.error('Error importing wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import wallet'
    };
  }
}

/**
 * Validate mnemonic phrase format and checksum
 */
export function validateMnemonic(mnemonic: string): { isValid: boolean; error?: string } {
  const trimmed = mnemonic.trim().toLowerCase();
  const words = trimmed.split(/\s+/);

  // Check word count
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    return {
      isValid: false,
      error: `Invalid word count. Expected 12, 15, 18, 21, or 24 words, got ${words.length}.`
    };
  }

  // Validate using BIP39
  if (!bip39.validateMnemonic(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid mnemonic phrase. Please check the words and try again.'
    };
  }

  return { isValid: true };
}

/**
 * Get supported networks for wallet
 */
export function getSupportedNetworks() {
  return [
    {
      id: 'bsc',
      name: 'BNB Smart Chain',
      symbol: 'BNB',
      rpcUrl: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      explorer: 'https://bscscan.com',
      isMainnet: true
    },
    {
      id: 'bsc-testnet',
      name: 'BNB Smart Chain Testnet',
      symbol: 'tBNB',
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      explorer: 'https://testnet.bscscan.com',
      isMainnet: false
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
      chainId: 1,
      explorer: 'https://etherscan.io',
      isMainnet: true
    }
  ];
}

/**
 * Securely store wallet data (encrypted in localStorage)
 */
export function storeWalletSecurely(walletData: WalletInfo, pin: string): boolean {
  try {
    // In production, implement proper encryption with the PIN
    // For now, we'll use a simple obfuscation (NOT secure for production)
    const encryptedData = btoa(JSON.stringify({
      ...walletData,
      pin: pin // Should be hashed in production
    }));
    
    localStorage.setItem('ipg_wallet_data', encryptedData);
    return true;
  } catch (error) {
    console.error('Error storing wallet data:', error);
    return false;
  }
}

/**
 * Retrieve securely stored wallet data
 */
export function retrieveWalletData(pin: string): WalletInfo | null {
  try {
    const encryptedData = localStorage.getItem('ipg_wallet_data');
    if (!encryptedData) return null;

    // Decrypt and verify PIN
    const walletData = JSON.parse(atob(encryptedData));
    if (walletData.pin !== pin) return null;

    // Remove PIN from returned data
    const { pin: _, ...cleanWalletData } = walletData;
    return cleanWalletData as WalletInfo;
  } catch (error) {
    console.error('Error retrieving wallet data:', error);
    return null;
  }
}

/**
 * Clear stored wallet data
 */
export function clearWalletData(): void {
  localStorage.removeItem('ipg_wallet_data');
}