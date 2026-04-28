/**
 * useAdminKycDiagnostics — admin-only "why is this user blocked?" panel.
 *
 * Calls public.admin_kyc_access_check(target_user_id) and returns the four
 * pillar statuses + per-action allowed/blocked verdicts in one document.
 *
 * The RPC itself enforces has_role(auth.uid(),'admin'); a non-admin caller
 * gets a Postgres FORBIDDEN error which we surface as `error`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type KycPillarStatus =
  | "not_submitted"
  | "submitted"
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_resubmission"
  | string;

export interface KycPillarInfo {
  status: KycPillarStatus;
  notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  phone_number?: string | null;
  rejection_reason?: string | null;
}

export interface KycActionVerdict {
  allowed: boolean;
  reason: string;
}

export interface AdminKycDiagnostics {
  user_id: string;
  is_kyc_approved: boolean;
  block_reason: string | null;
  profile_present: boolean;
  checked_at: string;
  pillars: {
    documents: KycPillarInfo;
    face: KycPillarInfo;
    mobile: KycPillarInfo;
    final: KycPillarInfo;
  };
  actions: {
    trade: KycActionVerdict;
    withdraw_crypto: KycActionVerdict;
    withdraw_bsk: KycActionVerdict;
    migrate_bsk_onchain: KycActionVerdict;
    wallet_to_trading: KycActionVerdict;
    trading_to_wallet: KycActionVerdict;
    internal_transfer: KycActionVerdict;
    bsk_transfer: KycActionVerdict;
    swap: KycActionVerdict;
    stake: KycActionVerdict;
    apply_loan: KycActionVerdict;
  };
}

/** Stable, ordered list of action keys for UI rendering. */
export const KYC_ACTION_LABELS: Array<{
  key: keyof AdminKycDiagnostics["actions"];
  label: string;
}> = [
  { key: "trade", label: "Trade (place orders)" },
  { key: "withdraw_crypto", label: "Withdraw crypto" },
  { key: "withdraw_bsk", label: "Withdraw BSK" },
  { key: "migrate_bsk_onchain", label: "Migrate BSK on-chain" },
  { key: "wallet_to_trading", label: "Wallet → Trading transfer" },
  { key: "trading_to_wallet", label: "Trading → Wallet transfer" },
  { key: "internal_transfer", label: "Peer internal transfer" },
  { key: "bsk_transfer", label: "BSK peer transfer" },
  { key: "swap", label: "Swap" },
  { key: "stake", label: "Stake (IPG)" },
  { key: "apply_loan", label: "Apply for loan" },
];

export function useAdminKycDiagnostics(targetUserId: string | null | undefined) {
  return useQuery<AdminKycDiagnostics>({
    queryKey: ["admin-kyc-diagnostics", targetUserId],
    enabled: !!targetUserId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_kyc_access_check", {
        target_user_id: targetUserId,
      });
      if (error) throw error;
      return data as unknown as AdminKycDiagnostics;
    },
  });
}
