/**
 * useAdminKYCv2 — admin-facing hook for the 3-pillar KYC system.
 *
 * Exposes:
 *   - submissions list w/ pillar statuses
 *   - stats (pending docs, pending face, pending mobile, pending final)
 *   - actions: updatePillar(userId, pillar, action, notes)
 *   - per-user audit history
 *   - signed URL helper for private kyc-selfies bucket
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PillarStatus =
  | "not_submitted"
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_resubmission";

export type FinalStatus =
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

export interface KycSubmissionV2 {
  id: string;
  user_id: string;
  status: string;
  data_json: Record<string, any> | null;
  full_name_computed: string | null;
  email_computed: string | null;
  phone_computed: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profile_email: string | null;
  display_name: string | null;
  username: string | null;

  // 3-pillar fields
  documents_status: PillarStatus;
  documents_notes: string | null;
  documents_reviewed_at: string | null;
  face_status: PillarStatus;
  face_selfie_path: string | null;
  face_captured_at: string | null;
  face_notes: string | null;
  face_reviewed_at: string | null;
  mobile_number: string | null;
  mobile_status: PillarStatus;
  mobile_submitted_at: string | null;
  mobile_notes: string | null;
  mobile_verified_at: string | null;
  final_status: FinalStatus;
  final_approved_at: string | null;
  rejection_reason: string | null;
  risk_flags: any[];
}

export type KycQueueFilter =
  | "pending_any"
  | "pending_documents"
  | "pending_face"
  | "pending_mobile"
  | "ready_final"
  | "approved"
  | "rejected"
  | "needs_resubmission"
  | "suspended"
  | "all";

export interface KycAuditEntry {
  id: string;
  user_id: string;
  pillar: string;
  action: string;
  status_before: string | null;
  status_after: string | null;
  admin_id: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * "Pending review" = waiting on admin action.
 * `needs_resubmission` and `rejected` are NOT pending — they belong in their
 * own queues so they don't pollute the admin work-list.
 */
const isPillarPending = (s: PillarStatus) =>
  s === "pending_review";

/**
 * A submission is "active pending" for the admin work-queue only if the admin
 * actually has something to do:
 *
 *   (a) at least one pillar is in `pending_review` (admin must approve/reject), OR
 *   (b) all 3 pillars are approved but `final_status` isn't terminal yet
 *       (admin must grant final approval).
 *
 * Excluded:
 *   - terminal final states (approved, rejected, needs_resubmission, suspended)
 *   - "passive" rows where the user has only partially submitted and we are
 *     simply waiting on them to upload the remaining pillars
 *     (e.g. docs=approved + face=not_submitted + mobile=not_submitted)
 *   - accounts that have done nothing yet (all 3 = not_submitted)
 */
const isSubmissionPending = (s: {
  final_status: FinalStatus;
  documents_status: PillarStatus;
  face_status: PillarStatus;
  mobile_status: PillarStatus;
}) => {
  if (
    s.final_status === "approved" ||
    s.final_status === "rejected" ||
    s.final_status === "needs_resubmission" ||
    s.final_status === "suspended"
  ) {
    return false;
  }
  const pillars = [s.documents_status, s.face_status, s.mobile_status];
  // (a) Any pillar awaiting admin decision → actionable
  if (pillars.some((p) => p === "pending_review")) return true;
  // (b) All 3 approved but no terminal final yet → ready for final
  if (pillars.every((p) => p === "approved")) return true;
  // Otherwise we're waiting on the user, not on the admin → NOT actionable.
  return false;
};

export function useAdminKYCv2() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<KycSubmissionV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<KycQueueFilter>("pending_any");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      // Pull 3-pillar fields directly from kyc_profiles_new and join via profiles (best-effort)
      const { data: rows, error } = await supabase
        .from("kyc_profiles_new")
        .select(
          `id, user_id, status, data_json, submitted_at, reviewed_at, created_at, updated_at,
           documents_status, documents_notes, documents_reviewed_at,
           face_status, face_selfie_path, face_captured_at, face_notes, face_reviewed_at,
           mobile_number, mobile_status, mobile_submitted_at, mobile_notes, mobile_verified_at,
           final_status, final_approved_at, rejection_reason, risk_flags`
        )
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;

      const userIds = (rows ?? []).map((r) => r.user_id);
      let profilesById: Record<string, { email: string | null; display_name: string | null; username: string | null; phone: string | null; full_name: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, email, display_name, username, phone, full_name")
          .in("user_id", userIds);
        profilesById = Object.fromEntries(
          (profs ?? []).map((p) => [p.user_id, p as any])
        );
      }

      const merged: KycSubmissionV2[] = (rows ?? []).map((r: any) => {
        const p: any = profilesById[r.user_id] ?? {};
        return {
          ...r,
          profile_email: p.email ?? null,
          display_name: p.display_name ?? null,
          username: p.username ?? null,
          full_name_computed: r.data_json?.full_name ?? p.full_name ?? p.display_name ?? null,
          email_computed: r.data_json?.email ?? p.email ?? null,
          phone_computed: r.mobile_number ?? r.data_json?.phone ?? p.phone ?? null,
          risk_flags: r.risk_flags ?? [],
        } as KycSubmissionV2;
      });
      setSubmissions(merged);
    } catch (e: any) {
      console.error("[AdminKYCv2] fetch error", e);
      toast({ title: "Failed to load KYC queue", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("kyc-admin-v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kyc_profiles_new" },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const stats = useMemo(() => {
    const total = submissions.length;
    // Pillar pending counts only count *true* pending pillars on submissions
    // that are still actively in the admin queue (final_status not terminal).
    const isActive = (s: KycSubmissionV2) => isSubmissionPending(s);
    const pendingDocs = submissions.filter((s) => isActive(s) && isPillarPending(s.documents_status)).length;
    const pendingFace = submissions.filter((s) => isActive(s) && isPillarPending(s.face_status)).length;
    const pendingMobile = submissions.filter((s) => isActive(s) && isPillarPending(s.mobile_status)).length;
    const readyFinal = submissions.filter(
      (s) =>
        s.documents_status === "approved" &&
        s.face_status === "approved" &&
        s.mobile_status === "approved" &&
        s.final_status !== "approved" &&
        s.final_status !== "rejected" &&
        s.final_status !== "needs_resubmission" &&
        s.final_status !== "suspended"
    ).length;
    const approved = submissions.filter((s) => s.final_status === "approved").length;
    const rejected = submissions.filter((s) => s.final_status === "rejected").length;
    const needsResubmission = submissions.filter((s) => s.final_status === "needs_resubmission").length;
    const suspended = submissions.filter((s) => s.final_status === "suspended").length;
    // Pending = ONLY actively-awaiting-admin submissions (excludes
    // rejected, needs_resubmission, approved, suspended).
    const pendingAny = submissions.filter(isSubmissionPending).length;
    return {
      total,
      pendingDocs,
      pendingFace,
      pendingMobile,
      readyFinal,
      approved,
      rejected,
      needsResubmission,
      suspended,
      pendingAny,
    };
  }, [submissions]);

  const filtered = useMemo(() => {
    let list = submissions;
    switch (filter) {
      // Pillar-pending tabs only show submissions still awaiting decision.
      case "pending_documents":
        list = list.filter((s) => isSubmissionPending(s) && isPillarPending(s.documents_status));
        break;
      case "pending_face":
        list = list.filter((s) => isSubmissionPending(s) && isPillarPending(s.face_status));
        break;
      case "pending_mobile":
        list = list.filter((s) => isSubmissionPending(s) && isPillarPending(s.mobile_status));
        break;
      case "ready_final":
        list = list.filter(
          (s) =>
            s.documents_status === "approved" &&
            s.face_status === "approved" &&
            s.mobile_status === "approved" &&
            s.final_status !== "approved" &&
            s.final_status !== "rejected" &&
            s.final_status !== "needs_resubmission" &&
            s.final_status !== "suspended"
        );
        break;
      case "approved":
        list = list.filter((s) => s.final_status === "approved");
        break;
      case "rejected":
        list = list.filter((s) => s.final_status === "rejected");
        break;
      case "needs_resubmission":
        list = list.filter((s) => s.final_status === "needs_resubmission");
        break;
      case "suspended":
        list = list.filter((s) => s.final_status === "suspended");
        break;
      case "pending_any":
        list = list.filter(isSubmissionPending);
        break;
      case "all":
        break;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => {
        const fields = [
          s.full_name_computed, s.display_name, s.username, s.email_computed, s.profile_email,
          s.phone_computed, s.mobile_number, s.user_id, (s.data_json?.id_number ?? "") as string,
        ].filter(Boolean).map((v) => String(v).toLowerCase());
        return fields.some((f) => f.includes(q));
      });
    }
    return list;
  }, [submissions, filter, search]);

  const updatePillar = useCallback(
    async (userId: string, pillar: "documents" | "face" | "mobile" | "final", action: "approve" | "reject" | "request_resubmission" | "suspend" | "unsuspend" | "reset", notes?: string) => {
      console.info("[AdminKYCv2] updatePillar →", { userId, pillar, action, hasNotes: !!notes });
      try {
        setBusy(true);
        const { data, error } = await supabase.rpc("admin_update_kyc_pillar", {
          p_user_id: userId,
          p_pillar: pillar,
          p_action: action,
          p_notes: notes ?? null,
        });
        if (error) {
          console.error("[AdminKYCv2] RPC error", error);
          throw error;
        }
        console.info("[AdminKYCv2] RPC ok ←", data);
        const verb = action === "approve" ? "approved"
          : action === "reject" ? "rejected"
          : action === "request_resubmission" ? "resubmission requested"
          : action === "suspend" ? "suspended"
          : action === "unsuspend" ? "unsuspended"
          : "updated";
        toast({
          title: pillar === "final" && action === "approve" ? "✅ Final approval granted" : `✅ ${pillar} ${verb}`,
          description: notes ? `Reason: "${notes}"` : "User will see the new status instantly.",
        });
        await fetchAll();
        return data as any;
      } catch (e: any) {
        console.error("[AdminKYCv2] updatePillar error", e);
        const rawMsg: string = e?.message ?? e?.error_description ?? "Unknown error — check console for details.";
        const isPhoneDup = /PHONE_ALREADY_USED/i.test(rawMsg);
        if (isPhoneDup) {
          // Strip the "PHONE_ALREADY_USED: " prefix for a cleaner message
          const cleaned = rawMsg.replace(/^.*PHONE_ALREADY_USED:\s*/i, "").trim();
          toast({
            title: "⚠️ Mobile number already exists",
            description: cleaned || "This mobile number is already linked to another KYC profile. Reject one of the duplicate profiles before approving.",
            variant: "destructive",
            duration: 12000,
          });
        } else {
          toast({
            title: "Action failed",
            description: rawMsg,
            variant: "destructive",
          });
        }
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [fetchAll, toast]
  );

  const fetchAudit = useCallback(async (userId: string): Promise<KycAuditEntry[]> => {
    const { data, error } = await supabase
      .from("kyc_decision_audit")
      .select("id, user_id, pillar, action, status_before, status_after, admin_id, notes, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[AdminKYCv2] audit error", error);
      return [];
    }
    return (data ?? []) as KycAuditEntry[];
  }, []);

  const getSelfieUrl = useCallback(async (path: string | null | undefined): Promise<string | null> => {
    if (!path) return null;
    const { data, error } = await supabase.storage.from("kyc-selfies").createSignedUrl(path, 60 * 30);
    if (error) {
      console.error("[AdminKYCv2] signed url error", error);
      return null;
    }
    return data?.signedUrl ?? null;
  }, []);

  return {
    submissions: filtered,
    allSubmissions: submissions,
    loading,
    busy,
    stats,
    filter,
    setFilter,
    search,
    setSearch,
    updatePillar,
    fetchAudit,
    getSelfieUrl,
    refetch: fetchAll,
  };
}
