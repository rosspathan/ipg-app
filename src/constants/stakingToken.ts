/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║          IMMUTABLE IPG STAKING TOKEN CONSTANTS           ║
 * ║                                                          ║
 * ║  WARNING: These values are HARDCODED and FINAL.         ║
 * ║  The staking system is EXCLUSIVELY locked to IPG.       ║
 * ║  DO NOT change, override, or make dynamic.              ║
 * ║  DO NOT use any other token for staking.                ║
 * ╚══════════════════════════════════════════════════════════╝
 */

/** IPG token contract address on BNB Smart Chain (BEP-20). IMMUTABLE. */
export const STAKING_TOKEN_CONTRACT = '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E' as const;

/** IPG token symbol. IMMUTABLE. */
export const STAKING_TOKEN_SYMBOL = 'IPG' as const;

/** IPG token name. IMMUTABLE. */
export const STAKING_TOKEN_NAME = 'I-SMART' as const;

/** IPG token decimals on BEP-20. IMMUTABLE. */
export const STAKING_TOKEN_DECIMALS = 18 as const;

/** BSC network identifier. IMMUTABLE. */
export const STAKING_NETWORK = 'BEP20' as const;

/** BSC chain ID. IMMUTABLE. */
export const STAKING_CHAIN_ID = 56 as const;

/**
 * Runtime guard — throws if a non-IPG contract address is ever passed
 * to a staking transfer function. Call this before every on-chain transfer.
 */
export function assertIPGContract(contractAddress: string): void {
  if (contractAddress.toLowerCase() !== STAKING_TOKEN_CONTRACT.toLowerCase()) {
    const msg =
      `[SECURITY] Staking transfer blocked: attempted to use token ` +
      `${contractAddress} instead of IPG (${STAKING_TOKEN_CONTRACT}). ` +
      `Only IPG is permitted for staking operations.`;
    console.error(msg);
    throw new Error('Staking is restricted to IPG token only. Transfer blocked.');
  }
}

/**
 * Known forbidden contract addresses that must NEVER be used in staking.
 * If any of these appear in a staking context, the transfer must be rejected.
 */
export const FORBIDDEN_STAKING_CONTRACTS: readonly string[] = [
  '0x7437d96D2dca13525B4A6021865d41997deE1F09', // USDI — forbidden
  '0x742575866C0eb1B6b6350159D536447477085ceF', // BSK  — forbidden
  '0x55d398326f99059fF775485246999027B3197955', // USDT — forbidden
] as const;
