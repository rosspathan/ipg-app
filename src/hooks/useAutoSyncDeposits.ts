/**
 * DEPRECATED: useAutoSyncDeposits
 * 
 * This hook is DISABLED as part of the hot-wallet custodial model.
 * 
 * In the new model:
 * - Trading balances are ONLY credited when users deposit to the platform hot wallet
 * - monitor-custodial-deposits is triggered server-side to detect deposits
 * - Users' personal on-chain wallets are for display only, not for trading
 * 
 * This hook is kept as a no-op to prevent breaking existing imports.
 */

export function useAutoSyncDeposits() {
  // No-op: This function has been deprecated
  // Trading balances are now only credited via hot wallet deposits
  // See: monitor-custodial-deposits edge function
}
