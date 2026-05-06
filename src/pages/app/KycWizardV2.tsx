/**
 * KYC Wizard v2 — 3-pillar user-facing flow.
 * Mobile-first, premium fintech feel.
 *
 * Pillars: Documents → Face → Mobile → Awaiting admin approval
 * The user can submit each pillar independently; admin approves each.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, FileText, Camera, Phone, ArrowLeft, Check, Clock, X,
  AlertCircle, Upload, Loader2, ChevronRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { useKycGate, type KycPillarStatus } from "@/hooks/useKycGate";
import { SelfieCapture } from "@/components/kyc/SelfieCapture";
import { cn } from "@/lib/utils";

type Step = "overview" | "documents" | "face" | "mobile" | "submitted";

const pillarMeta = {
  documents: { icon: FileText, label: "Identity documents", desc: "Upload a government-issued ID" },
  face: { icon: Camera, label: "Face verification", desc: "Live selfie reviewed by an admin" },
  mobile: { icon: Phone, label: "Mobile verification", desc: "Number manually verified by admin" },
} as const;

function PillarChip({ status, label }: { status: KycPillarStatus; label: string }) {
  const cfg = useMemo(() => {
    switch (status) {
      case "approved": return { icon: Check, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", text: "Approved" };
      case "rejected": return { icon: X, cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30", text: "Rejected — resubmit" };
      case "needs_resubmission": return { icon: AlertCircle, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", text: "Resubmit required" };
      case "pending_review": return { icon: Clock, cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30", text: "Under admin review" };
      default: return { icon: AlertCircle, cls: "bg-muted text-muted-foreground border-border", text: "Not started" };
    }
  }, [status]);
  const Icon = cfg.icon;
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", cfg.cls)}>
      <Icon className="h-3 w-3" />
      <span className="font-semibold">{label}</span>
      <span className="opacity-80">·</span>
      <span>{cfg.text}</span>
    </div>
  );
}

export default function KycWizardV2() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { toast } = useToast();
  const gate = useKycGate();
  const [step, setStep] = useState<Step>("overview");
  const [busy, setBusy] = useState(false);

  // Documents form
  const [docs, setDocs] = useState({
    full_name: "", date_of_birth: "", id_type: "", id_number: "", country: "",
    address_line1: "", city: "", postal_code: "",
    id_front: null as File | null, id_back: null as File | null,
  });

  // Mobile form
  const [mobile, setMobile] = useState("");

  useEffect(() => {
    // If approved, kick the user out
    if (!gate.loading && gate.approved) {
      toast({ title: "✅ Your KYC is approved", description: "You can trade and withdraw freely." });
    }
  }, [gate.loading, gate.approved, toast]);

  // Ensure a kyc_profiles_new row exists for this user
  const ensureProfile = async () => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("kyc_profiles_new")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from("kyc_profiles_new").insert({
        user_id: user.id,
        level: "L1",
        status: "submitted",
        data_json: {},
      });
    }
  };

  const uploadDocFile = async (file: File, kind: "id_front" | "id_back"): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submitDocuments = async () => {
    if (!user) return;
    if (!docs.full_name || !docs.id_type || !docs.id_number || !docs.id_front) {
      toast({ title: "Missing fields", description: "Please fill all required fields and upload your ID front.", variant: "destructive" });
      return;
    }
    try {
      setBusy(true);
      await ensureProfile();
      const id_front_path = await uploadDocFile(docs.id_front, "id_front");
      const id_back_path = docs.id_back ? await uploadDocFile(docs.id_back, "id_back") : null;

      const { error } = await supabase
        .from("kyc_profiles_new")
        .update({
          documents_status: "pending_review",
          status: "submitted",
          submitted_at: new Date().toISOString(),
          data_json: {
            ...(docs as any),
            id_front: id_front_path,
            id_back: id_back_path,
            id_front_url: id_front_path,
            id_back_url: id_back_path,
            full_name: docs.full_name,
            phone: gate.mobileStatus !== "not_submitted" ? mobile : undefined,
          },
        })
        .eq("user_id", user.id);
      if (error) throw error;

      // Audit
      await supabase.from("kyc_decision_audit").insert({
        user_id: user.id, pillar: "documents", action: "submit",
        status_before: gate.documentsStatus, status_after: "pending_review",
      });

      toast({ title: "Documents submitted", description: "Awaiting admin review." });
      await gate.refresh();
      setStep("overview");
    } catch (e: any) {
      toast({ title: "Submission failed", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const submitSelfie = async (blob: Blob) => {
    if (!user) return;
    try {
      setBusy(true);
      await ensureProfile();
      const path = `${user.id}/selfie-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("kyc-selfies").upload(path, blob, {
        upsert: true, contentType: "image/jpeg",
      });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("kyc_profiles_new")
        .update({
          face_selfie_path: path,
          face_status: "pending_review",
          face_captured_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await supabase.from("kyc_decision_audit").insert({
        user_id: user.id, pillar: "face", action: "submit",
        status_before: gate.faceStatus, status_after: "pending_review",
      });
      toast({ title: "Selfie submitted", description: "Awaiting admin review." });
      await gate.refresh();
      setStep("overview");
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const submitMobile = async () => {
    if (!user) return;
    const cleaned = mobile.replace(/\s+/g, "");
    if (!/^\+?\d{8,15}$/.test(cleaned)) {
      toast({ title: "Invalid number", description: "Enter a valid phone number with country code (digits only, 8–15).", variant: "destructive" });
      return;
    }
    try {
      setBusy(true);
      // Server-side RPC handles: ensure profile, normalize, uniqueness,
      // preserve docs/face approvals, set pending_review, audit, notify admin.
      const { data, error } = await supabase.rpc("resubmit_kyc_mobile_number", {
        _mobile_number: cleaned,
      });
      if (error) {
        const raw = `${error.message ?? ""} ${error.hint ?? ""} ${error.details ?? ""}`;
        let title = "Submission failed";
        let description = error.hint || error.message || "Please try again.";
        if (/PHONE_ALREADY_USED/i.test(raw)) {
          title = "Mobile number already in use";
          description = "This mobile number is already linked to another account. Please use a different number.";
        } else if (/INVALID_NUMBER/i.test(raw)) {
          title = "Invalid number";
          description = "Please enter a valid phone number with country code (8–15 digits).";
        } else if (/ALREADY_APPROVED/i.test(raw)) {
          title = "Already approved";
          description = "Your mobile is already approved. Contact support to change it.";
        } else if (/NOT_AUTHENTICATED/i.test(raw)) {
          title = "Sign-in required";
          description = "Please sign in again to resubmit.";
        }
        toast({ title, description, variant: "destructive" });
        return;
      }
      toast({
        title: "Number submitted for review",
        description:
          (data as any)?.message ??
          "Our team will manually verify your number — typically within 1–24 hours.",
      });
      setMobile("");
      await gate.refresh();
      setStep("overview");
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Button
            size="icon" variant="ghost"
            onClick={() => (step === "overview" ? navigate("/app/profile") : setStep("overview"))}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h1 className="text-base font-semibold tracking-tight">Identity verification</h1>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Required to trade, withdraw, or migrate funds
            </p>
          </div>
          {gate.approved && (
            <Badge className="bg-emerald-500 text-white"><Check className="mr-1 h-3 w-3" /> Approved</Badge>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <AnimatePresence mode="wait">
          {step === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Hero status alert — variant by final_status */}
              {gate.approved ? (
                <Card className="overflow-hidden border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-background p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-500/20 p-3">
                      <Check className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-300">
                        ✅ KYC fully approved
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        All restricted features are now unlocked. You can trade, withdraw, transfer, stake, and migrate freely.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => navigate("/app/trading")}>Start trading</Button>
                        <Button size="sm" variant="outline" onClick={() => navigate("/app/wallet")}>Go to wallet</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : gate.finalStatus === "rejected" ? (
                (() => {
                  // If only the mobile pillar is the blocker, frame it precisely.
                  const docsOk = gate.documentsStatus === "approved";
                  const faceOk = gate.faceStatus === "approved";
                  const mobileBad = gate.mobileStatus === "rejected"
                    || gate.mobileStatus === "needs_resubmission"
                    || gate.mobileStatus === "not_submitted";
                  const isMobileOnly = docsOk && faceOk && mobileBad;
                  const title = isMobileOnly ? "Mobile verification rejected" : "KYC rejected";
                  const reason = gate.mobileNotes || gate.rejectionReason
                    || "Your KYC submission was rejected. Please review admin notes on each pillar below and resubmit.";
                  return (
                    <Card className="overflow-hidden border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-background p-5">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-rose-500/20 p-3">
                          <X className="h-5 w-5 text-rose-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-semibold tracking-tight text-rose-700 dark:text-rose-300">
                            {title}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Reason: </span>{reason}
                          </p>
                          {isMobileOnly && (
                            <>
                              <p className="mt-2 text-sm text-muted-foreground">
                                Your identity documents and face verification are still approved. Please submit your mobile number again — there's no need to redo the other steps.
                              </p>
                              <Button size="sm" className="mt-3" onClick={() => setStep("mobile")}>
                                Resubmit mobile number
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })()
              ) : gate.finalStatus === "needs_resubmission" ? (
                <Card className="overflow-hidden border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-background p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-500/20 p-3">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold tracking-tight text-amber-700 dark:text-amber-300">
                        Resubmission required
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {gate.rejectionReason || "An admin has asked you to resubmit. Review the pillar notes below and update what's required."}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : gate.finalStatus === "suspended" ? (
                <Card className="overflow-hidden border-zinc-500/40 bg-gradient-to-br from-zinc-500/15 via-zinc-500/5 to-background p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-zinc-500/20 p-3">
                      <AlertCircle className="h-5 w-5 text-zinc-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold tracking-tight">Account suspended</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your account is currently suspended. Please contact support for assistance.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : gate.documentsStatus === "approved" && gate.faceStatus === "approved" && gate.mobileStatus === "approved" ? (
                <Card className="overflow-hidden border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-background p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-500/20 p-3">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold tracking-tight text-amber-700 dark:text-amber-300">
                        Awaiting final admin approval
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        All 3 pillars are approved. An admin will grant final approval shortly — your features will unlock automatically.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/15 p-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold tracking-tight">
                        Complete 3 pillars to unlock trading
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Each pillar is reviewed by an admin. Final approval unlocks trading, withdrawals, transfers, staking, and migration.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <PillarChip label="Documents" status={gate.documentsStatus} />
                        <PillarChip label="Face" status={gate.faceStatus} />
                        <PillarChip label="Mobile" status={gate.mobileStatus} />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Per-pillar cards */}
              {(["documents", "face", "mobile"] as const).map((p) => {
                const meta = pillarMeta[p];
                const status = p === "documents" ? gate.documentsStatus : p === "face" ? gate.faceStatus : gate.mobileStatus;
                const notes = p === "documents" ? gate.documentsNotes : p === "face" ? gate.faceNotes : gate.mobileNotes;
                const Icon = meta.icon;
                const canEdit = status !== "approved" && status !== "pending_review";
                return (
                  <Card key={p} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => canEdit && setStep(p)}
                      disabled={!canEdit}
                      className={cn(
                        "flex w-full items-start gap-3 p-4 text-left transition-colors",
                        canEdit ? "hover:bg-muted/40" : "opacity-90 cursor-default"
                      )}
                    >
                      <div className={cn(
                        "rounded-xl p-2.5 shrink-0",
                        status === "approved" ? "bg-emerald-500/15 text-emerald-600" :
                        status === "rejected" ? "bg-rose-500/15 text-rose-600" :
                        status === "needs_resubmission" ? "bg-amber-500/15 text-amber-600" :
                        status === "pending_review" ? "bg-sky-500/15 text-sky-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{meta.label}</p>
                          <PillarChip label="" status={status} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</p>
                        {notes && status !== "approved" && (
                          <div className={cn(
                            "mt-2 rounded-lg border p-2 text-xs",
                            status === "rejected" ? "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300" :
                            status === "needs_resubmission" ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300" :
                            "border-border/60 bg-muted/40"
                          )}>
                            <span className="font-semibold">Admin note: </span>{notes}
                          </div>
                        )}
                      </div>
                      {canEdit && <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />}
                    </button>
                  </Card>
                );
              })}

              {/* Final status footer — only when not already shown in hero */}
              {!gate.approved && gate.finalStatus !== "rejected" && gate.finalStatus !== "needs_resubmission" && gate.finalStatus !== "suspended" &&
                !(gate.documentsStatus === "approved" && gate.faceStatus === "approved" && gate.mobileStatus === "approved") && (
                <Card className="border-2 border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Final admin approval pending</p>
                      <p className="text-xs text-muted-foreground">
                        Once all 3 pillars are green an admin will give final approval. Restricted features unlock instantly.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {step === "documents" && (
            <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Card className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Identity documents</h2>
                  <p className="text-sm text-muted-foreground">Upload a clear photo of your government-issued ID.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Full legal name *</Label>
                    <Input value={docs.full_name} onChange={(e) => setDocs({ ...docs, full_name: e.target.value })} placeholder="As on ID" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date of birth</Label>
                    <Input type="date" value={docs.date_of_birth} onChange={(e) => setDocs({ ...docs, date_of_birth: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ID type *</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={docs.id_type} onChange={(e) => setDocs({ ...docs, id_type: e.target.value })}>
                      <option value="">Select…</option>
                      <option value="passport">Passport</option>
                      <option value="national_id">National ID</option>
                      <option value="driver_license">Driver's license</option>
                      <option value="aadhaar">Aadhaar</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>ID number *</Label>
                    <Input value={docs.id_number} onChange={(e) => setDocs({ ...docs, id_number: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Address</Label>
                    <Input value={docs.address_line1} onChange={(e) => setDocs({ ...docs, address_line1: e.target.value })} placeholder="Street address" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={docs.city} onChange={(e) => setDocs({ ...docs, city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Postal code</Label>
                    <Input value={docs.postal_code} onChange={(e) => setDocs({ ...docs, postal_code: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FileUpload label="ID front *" file={docs.id_front} onChange={(f) => setDocs({ ...docs, id_front: f })} />
                  <FileUpload label="ID back" file={docs.id_back} onChange={(f) => setDocs({ ...docs, id_back: f })} />
                </div>

                <Button onClick={submitDocuments} disabled={busy} className="w-full h-12">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Submit documents for review
                </Button>
              </Card>
            </motion.div>
          )}

          {step === "face" && (
            <motion.div key="face" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Card className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Face verification</h2>
                  <p className="text-sm text-muted-foreground">
                    Take a clear, well-lit selfie. An admin will verify it matches your submitted ID.
                  </p>
                </div>
                <SelfieCapture onCapture={submitSelfie} uploading={busy} />
              </Card>
            </motion.div>
          )}

          {step === "mobile" && (
            <motion.div key="mobile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Card className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Mobile verification</h2>
                  <p className="text-sm text-muted-foreground">
                    Submit your phone number. An admin will <strong>manually verify</strong> the number — typically within 1–24 hours. There's no auto-OTP shortcut.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile number (with country code)</Label>
                  <Input
                    inputMode="tel"
                    placeholder="+919876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">Digits only, 8–15 characters. You can include a leading +.</p>
                </div>
                <Button onClick={submitMobile} disabled={busy} className="w-full h-12">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Submit number for admin verification
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FileUpload({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 px-3 text-center text-xs text-muted-foreground hover:bg-muted/40 transition-colors">
        <Upload className="mb-1 h-4 w-4" />
        {file ? <span className="font-medium text-foreground truncate max-w-full">{file.name}</span> : <span>Tap to upload</span>}
        <input
          type="file" accept="image/*,application/pdf" className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
