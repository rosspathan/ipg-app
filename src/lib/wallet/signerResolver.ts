/**
 * Centralized, hardened wallet signer resolution.
 *
 * GUARANTEES:
 *  1. The signer's address ALWAYS matches the displayed wallet address
 *     (profiles.wallet_address). If they don't match → withdrawal is blocked.
 *  2. NO unsafe legacy fallbacks (`ipg_wallet_data`, unscoped `cryptoflow_wallet`)
 *     are used for authenticated users. Legacy keys are only ever consumed via
 *     `safeMigrateIfOwner()` after explicit address-equality verification.
 *  3. Every blocked attempt is recorded to `withdrawal_signer_audit` with a
 *     short reference id that the UI can show to the user.
 *
 * Used by WithdrawScreen, TransferScreen, StakingDepositScreen, and any other
 * on-chain signing flow that must guarantee signer ↔ displayed-wallet integrity.
 */

import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
import { getStoredWallet } from '@/utils/walletStorage';

export interface ResolvedSigner {
  /** The private key the caller can use to sign. */
  privateKey: string;
  /** Address derived from `privateKey` (always lowercased). */
  signerAddress: string;
  /** The wallet address shown in the UI / stored on the user's profile. */
  displayedAddress: string;
  /** Where the key came from – useful for diagnostics. */
  source: 'web3-context-pk' | 'web3-context-seed' | 'user-scoped-pk' | 'user-scoped-seed';
}

export type SignerResolutionFailure =
  | { kind: 'no_user' }
  | { kind: 'no_displayed_wallet'; userId: string }
  | { kind: 'no_local_key'; userId: string; displayedAddress: string }
  | {
      kind: 'mismatch';
      userId: string;
      displayedAddress: string;
      signerAddress: string;
      source: ResolvedSigner['source'];
      referenceId: string;
    };

export type SignerResolutionResult =
  | { ok: true; signer: ResolvedSigner }
  | { ok: false; failure: SignerResolutionFailure };

interface Web3ContextWalletShape {
  privateKey?: string;
  seedPhrase?: string;
}

function deriveFromSeed(seed: string): string | null {
  try {
    return ethers.Wallet.fromPhrase(seed.trim().toLowerCase().replace(/\s+/g, ' ')).privateKey;
  } catch {
    return null;
  }
}

function deriveAddress(pk: string): string | null {
  try {
    return new ethers.Wallet(pk).address.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Generate a short, user-visible reference id (e.g. "WS-7F3K-29A").
 */
export function newSignerReferenceId(prefix = 'WS'): string {
  const rand = () =>
    Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, 'X');
  return `${prefix}-${rand()}-${rand().slice(0, 3)}`;
}

/**
 * Best-effort audit logger. Never throws.
 *
 * NOTE: We use `as any` for the table name because `withdrawal_signer_audit`
 * is brand new and not yet in the auto-generated Database types.
 */
export async function logSignerAudit(entry: {
  referenceId: string;
  userId: string;
  displayedAddress?: string | null;
  signerAddress?: string | null;
  outcome:
    | 'signer_mismatch'
    | 'no_local_key'
    | 'no_displayed_wallet'
    | 'insufficient_balance'
    | 'insufficient_gas'
    | 'broadcast_failed'
    | 'success'
    | 'aborted';
  assetSymbol?: string | null;
  network?: string | null;
  amountRequested?: number | null;
  signerLiveBalance?: number | null;
  signerBnbBalance?: number | null;
  errorReason?: string | null;
  txHash?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await (supabase.from as any)('withdrawal_signer_audit').insert({
      reference_id: entry.referenceId,
      user_id: entry.userId,
      displayed_wallet_address: entry.displayedAddress ?? null,
      signer_wallet_address: entry.signerAddress ?? null,
      addresses_match:
        !!entry.displayedAddress &&
        !!entry.signerAddress &&
        entry.displayedAddress.toLowerCase() === entry.signerAddress.toLowerCase(),
      asset_symbol: entry.assetSymbol ?? null,
      network: entry.network ?? null,
      amount_requested: entry.amountRequested ?? null,
      signer_live_balance: entry.signerLiveBalance ?? null,
      signer_bnb_balance: entry.signerBnbBalance ?? null,
      outcome: entry.outcome,
      error_reason: entry.errorReason ?? null,
      tx_hash: entry.txHash ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.warn('[SignerResolver] Failed to write signer audit:', e);
  }
}

/**
 * Try to resolve a private key for the authenticated user that derives to the
 * SAME address shown in the UI (profiles.wallet_address).
 *
 * If anything is off → returns `{ ok: false, failure }` AND writes an audit row
 * (when possible). The caller MUST refuse to broadcast in that case.
 */
export async function resolveAuthenticatedSigner(
  web3Wallet: Web3ContextWalletShape | null | undefined,
  context: { assetSymbol?: string; network?: string; amountRequested?: number } = {}
): Promise<SignerResolutionResult> {
  // 1) Authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, failure: { kind: 'no_user' } };

  // 2) Displayed wallet address (the one whose balance is shown in the UI)
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_address')
    .eq('user_id', user.id)
    .maybeSingle();
  const displayedAddress = (profile?.wallet_address || '').toLowerCase();

  if (!displayedAddress) {
    await logSignerAudit({
      referenceId: newSignerReferenceId(),
      userId: user.id,
      outcome: 'no_displayed_wallet',
      errorReason: 'profiles.wallet_address is empty',
      assetSymbol: context.assetSymbol,
      network: context.network,
      amountRequested: context.amountRequested,
    });
    return { ok: false, failure: { kind: 'no_displayed_wallet', userId: user.id } };
  }

  // 3) Walk through TRUSTED key sources only (no legacy unscoped fallbacks)
  const candidates: Array<{ pk: string; source: ResolvedSigner['source'] }> = [];

  if (web3Wallet?.privateKey && web3Wallet.privateKey.length > 0) {
    candidates.push({ pk: web3Wallet.privateKey, source: 'web3-context-pk' });
  }
  if (web3Wallet?.seedPhrase) {
    const derived = deriveFromSeed(web3Wallet.seedPhrase);
    if (derived) candidates.push({ pk: derived, source: 'web3-context-seed' });
  }

  const stored = getStoredWallet(user.id);
  if (stored?.privateKey) {
    candidates.push({ pk: stored.privateKey, source: 'user-scoped-pk' });
  }
  if (stored?.seedPhrase) {
    const derived = deriveFromSeed(stored.seedPhrase);
    if (derived) candidates.push({ pk: derived, source: 'user-scoped-seed' });
  }

  if (candidates.length === 0) {
    await logSignerAudit({
      referenceId: newSignerReferenceId(),
      userId: user.id,
      displayedAddress,
      outcome: 'no_local_key',
      errorReason: 'No trusted private key available on this device',
      assetSymbol: context.assetSymbol,
      network: context.network,
      amountRequested: context.amountRequested,
    });
    return { ok: false, failure: { kind: 'no_local_key', userId: user.id, displayedAddress } };
  }

  // 4) Pick the FIRST candidate whose derived address matches the displayed wallet.
  //    This is the strict equality check the user requested.
  for (const c of candidates) {
    const signerAddress = deriveAddress(c.pk);
    if (signerAddress && signerAddress === displayedAddress) {
      return {
        ok: true,
        signer: {
          privateKey: c.pk,
          signerAddress,
          displayedAddress,
          source: c.source,
        },
      };
    }
  }

  // 5) None matched → log signer mismatch and refuse to sign.
  const first = candidates[0];
  const signerAddress = deriveAddress(first.pk) ?? 'unknown';
  const referenceId = newSignerReferenceId();
  await logSignerAudit({
    referenceId,
    userId: user.id,
    displayedAddress,
    signerAddress,
    outcome: 'signer_mismatch',
    errorReason: `Local signing key derives to ${signerAddress}, but UI shows ${displayedAddress}`,
    assetSymbol: context.assetSymbol,
    network: context.network,
    amountRequested: context.amountRequested,
    metadata: { keySource: first.source, candidateCount: candidates.length },
  });

  return {
    ok: false,
    failure: {
      kind: 'mismatch',
      userId: user.id,
      displayedAddress,
      signerAddress,
      source: first.source,
      referenceId,
    },
  };
}

/**
 * Build a friendly error message for any failure kind.
 */
export function describeSignerFailure(f: SignerResolutionFailure): string {
  switch (f.kind) {
    case 'no_user':
      return 'You are signed out. Please sign in again to withdraw.';
    case 'no_displayed_wallet':
      return 'No wallet address is registered on your profile yet. Please complete wallet setup before withdrawing.';
    case 'no_local_key':
      return 'No signing key is available on this device. Please re-import your wallet under Profile → Security to withdraw.';
    case 'mismatch':
      return (
        `Wallet mismatch detected. The wallet used to sign does not match your displayed wallet address.\n\n` +
        `Displayed: ${f.displayedAddress.slice(0, 8)}…${f.displayedAddress.slice(-4)}\n` +
        `Signer:    ${f.signerAddress.slice(0, 8)}…${f.signerAddress.slice(-4)}\n\n` +
        `Please reconnect or re-import your wallet under Profile → Security.\n` +
        `Reference ID: ${f.referenceId}`
      );
  }
}
