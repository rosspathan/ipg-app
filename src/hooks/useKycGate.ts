/**
 * useKycGate — single source of truth for whether the current user
 * is allowed to perform sensitive actions (trade, withdraw, migrate).
 *
 * Backend enforces the same rule via DB triggers + edge function gates.
 * The frontend uses this to render locked-state UX *before* the user tries.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

export type KycPillarStatus =
  | "not_submitted"
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_resubmission";

export type KycFinalStatus =
  | "not_started"
  | "submitted"
  | "documents_under_review"
  | "face_pending"
  | "face_verified"
  | "mobile_pending_admin_verification"
  | "mobile_verified"
  | "approved"
  | "rejected"
  | "needs_resubmission"
  | "suspended";

export interface KycGateState {
  loading: boolean;
  approved: boolean;
  finalStatus: KycFinalStatus;
  documentsStatus: KycPillarStatus;
  faceStatus: KycPillarStatus;
  mobileStatus: KycPillarStatus;
  rejectionReason: string | null;
  documentsNotes: string | null;
  faceNotes: string | null;
  mobileNotes: string | null;
  /** Pillars the user still needs to complete or fix */
  missingPillars: Array<"documents" | "face" | "mobile" | "final">;
  /** Friendly headline shown in locked-state banners */
  reason: string;
  refresh: () => Promise<void>;
}

const DEFAULT: Omit<KycGateState, "refresh"> = {
  loading: true,
  approved: false,
  finalStatus: "not_started",
  documentsStatus: "not_submitted",
  faceStatus: "not_submitted",
  mobileStatus: "not_submitted",
  rejectionReason: null,
  documentsNotes: null,
  faceNotes: null,
  mobileNotes: null,
  missingPillars: ["documents", "face", "mobile", "final"],
  reason: "KYC approval is required to use this feature.",
};

export function useKycGate(): KycGateState {
  const { user } = useAuthUser();
  const [state, setState] = useState<Omit<KycGateState, "refresh">>(DEFAULT);

  const load = useCallback(async () => {
    if (!user) {
      setState({ ...DEFAULT, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    const { data, error } = await supabase
      .from("kyc_profiles_new")
      .select(
        "final_status, documents_status, face_status, mobile_status, rejection_reason, documents_notes, face_notes, mobile_notes"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      setState({ ...DEFAULT, loading: false });
      return;
    }

    const finalStatus = (data.final_status as KycFinalStatus) ?? "not_started";
    const documentsStatus = (data.documents_status as KycPillarStatus) ?? "not_submitted";
    const faceStatus = (data.face_status as KycPillarStatus) ?? "not_submitted";
    const mobileStatus = (data.mobile_status as KycPillarStatus) ?? "not_submitted";

    const approved =
      finalStatus === "approved" &&
      documentsStatus === "approved" &&
      faceStatus === "approved" &&
      mobileStatus === "approved";

    const missing: KycGateState["missingPillars"] = [];
    if (documentsStatus !== "approved") missing.push("documents");
    if (faceStatus !== "approved") missing.push("face");
    if (mobileStatus !== "approved") missing.push("mobile");
    if (!approved && missing.length === 0) missing.push("final");

    let reason = "KYC approval is required to use this feature.";
    if (finalStatus === "suspended") reason = "Your account is suspended. Contact support.";
    else if (finalStatus === "rejected") reason = data.rejection_reason || "Your KYC was rejected. Please resubmit.";
    else if (missing.includes("documents")) reason = "Please complete your identity document submission.";
    else if (missing.includes("face")) reason = "Please complete face verification.";
    else if (missing.includes("mobile")) reason = "Awaiting admin verification of your mobile number.";
    else if (missing.includes("final")) reason = "Awaiting final admin approval.";

    setState({
      loading: false,
      approved,
      finalStatus,
      documentsStatus,
      faceStatus,
      mobileStatus,
      rejectionReason: data.rejection_reason ?? null,
      documentsNotes: data.documents_notes ?? null,
      faceNotes: data.face_notes ?? null,
      mobileNotes: data.mobile_notes ?? null,
      missingPillars: missing,
      reason,
    });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Live-update when admin changes pillar status
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`kyc-gate-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kyc_profiles_new", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  return { ...state, refresh: load };
}

/** Map an edge-function 4xx body to a friendly message. */
export function isKycRequiredError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /KYC_REQUIRED/i.test(msg);
}
