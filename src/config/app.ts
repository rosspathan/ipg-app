/**
 * Application Configuration
 * Central place for app-wide constants and settings
 */

export const APP_CONFIG = {
  // Brand
  APP_NAME: "IPG I-SMART CRYPTO EXCHANGE",
  APP_TAGLINE: "World No. 1 Trusted Crypto Exchange",
  
  // Logos
  LOGO_PRIMARY: "/src/assets/logo-primary.jpg",
  LOGO_ALT: "/src/assets/logo-alt.jpg",
  
  // Networks
  NETWORKS: {
    ethereum: {
      chainId: 1,
      name: "Ethereum",
      symbol: "ETH",
      rpcUrl: "https://mainnet.infura.io/v3/",
      explorer: "https://etherscan.io"
    },
    bsc: {
      chainId: 56,
      name: "BNB Smart Chain",
      symbol: "BNB",
      rpcUrl: "https://bsc-dataseed.binance.org/",
      explorer: "https://bscscan.com"
    }
  },
  
  // Tokens
  TOKENS: {
    BSK: {
      type: "in-app" as const,
      decimals: 8,
      symbol: "BSK",
      name: "BSK Token"
    },
    IPG: {
      type: "erc20" as const,
      decimals: 18,
      symbol: "IPG",
      name: "IPG Token",
      ethAddress: "<IPG_ETH_ADDRESS>", // TODO: Replace with actual address
      bscAddress: "<IPG_BSC_ADDRESS>"   // TODO: Replace with actual address
    }
  },
  
  // Wallet
  WALLET: {
    BIP44_PATH: "m/44'/60'/0'/0/0", // Ethereum derivation path
    WORD_COUNT: 12 as 12 | 24,
    SUPPORTED_NETWORKS: ["ethereum", "bsc"]
  },
  
  // Security
  SECURITY: {
    MIN_AGE: 18,
    PIN_LENGTH: 6,
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30
  }
} as const;

export type NetworkKey = keyof typeof APP_CONFIG.NETWORKS;
export type TokenKey = keyof typeof APP_CONFIG.TOKENS;
