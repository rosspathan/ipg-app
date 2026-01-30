/**
 * Centralized Crypto Logo Configuration
 * Maps asset symbols to their official logos
 */

import ipgLogo from '@/assets/crypto-logos/ipg-logo.png';
import bskLogo from '@/assets/crypto-logos/bsk-logo.png';
import usdiLogo from '@/assets/crypto-logos/usdi-logo.png';

// Custom logos (uploaded assets)
export const CUSTOM_LOGOS: Record<string, string> = {
  IPG: ipgLogo,
  BSK: bskLogo,
  USDI: usdiLogo,
};

// Well-known major cryptocurrency logos from public CDN
const MAJOR_COIN_LOGOS: Record<string, string> = {
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  BUSD: 'https://assets.coingecko.com/coins/images/9576/small/BUSD.png',
  DAI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  LTC: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  TRX: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
  WBTC: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  WETH: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/small/uni.png',
  ATOM: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
  XLM: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  ARB: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  OP: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
};

// Combined logos (custom takes priority)
export const CRYPTO_LOGOS: Record<string, string> = {
  ...MAJOR_COIN_LOGOS,
  ...CUSTOM_LOGOS,
};

/**
 * Get the logo URL for a given asset symbol
 * Returns the custom logo if available, otherwise falls back to provided logoUrl or placeholder
 */
export const getCryptoLogoUrl = (symbol: string, fallbackUrl?: string | null): string => {
  const upperSymbol = symbol.toUpperCase();
  
  // Check for custom/major coin logo first
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
