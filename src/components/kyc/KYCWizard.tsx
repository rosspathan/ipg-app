import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Clock, Shield, Loader2, FileText, Camera, Phone, RefreshCw } from "lucide-react";
import { KYCProgressBar } from "./KYCProgressBar";
import { KYCStepPersonal } from "./KYCStepPersonal";
import { KYCStepAddress } from "./KYCStepAddress";
import { KYCStepDocuments } from "./KYCStepDocuments";
import { KYCStepReview } from "./KYCStepReview";
import { useKYCNew } from "@/hooks/useKYCNew";
import { useKycGate } from "@/hooks/useKycGate";
import { useAuthUser } from "@/hooks/useAuthUser";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Personal", description: "Basic details" },
  { title: "Address", description: "Where you live" },
  { title: "Documents", description: "Identity proof" },
  { title: "Review", description: "Final check" },
];

type PillarStatus = "not_submitted" | "pending_review" | "approved" | "rejected" | "needs_resubmission";

const pillarLabel = (s: PillarStatus): { label: string; tone: string } => {
  switch (s) {
    case "approved": return { label: "Verified", tone: "text-emerald-600 dark:text-emerald-400" };
    case "pending_review": return { label: "Under review", tone: "text-sky-600 dark:text-sky-400" };
    case "rejected": return { label: "Rejected", tone: "text-rose-600 dark:text-rose-400" };
    case "needs_resubmission": return { label: "Action needed", tone: "text-amber-600 dark:text-amber-400" };
    default: return { label: "Not submitted", tone: "text-muted-foreground" };
  }
};

const PillarRow = ({ icon: Icon, name, status }: { icon: any; name: string; status: PillarStatus }) => {
  const { label, tone } = pillarLabel(status);
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{name}</span>
      </div>
      <span className={cn("text-xs font-semibold", tone)}>{label}</span>
    </div>
  );
};

export const KYCWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const { user } = useAuthUser();
  const { profiles, uploadDocument, updateKYCLevel, submitKYCLevel, uploading, loading, refetch } = useKYCNew();
  const gate = useKycGate();
  const [submitting, setSubmitting] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const kycProfile = profiles.L1;

  // Use the canonical 3-pillar truth from useKycGate, not the legacy `status` field
  const isApproved = gate.approved;
  const isUnderReview =
    !gate.approved &&
    !gate.loading &&
    (gate.documentsStatus === "pending_review" || gate.documentsStatus === "approved") &&
    (gate.faceStatus === "pending_review" || gate.faceStatus === "approved") &&
    (gate.mobileStatus === "pending_review" || gate.mobileStatus === "approved") &&
    gate.finalStatus !== "rejected" &&
    gate.finalStatus !== "suspended";
  const isRejected =
    gate.finalStatus === "rejected" ||
    gate.documentsStatus === "rejected" ||
    gate.faceStatus === "rejected" ||
    gate.mobileStatus === "rejected";
  const needsResubmission =
    !isRejected &&
    !isApproved &&
    !isUnderReview &&
    (gate.documentsStatus === "needs_resubmission" ||
      gate.faceStatus === "needs_resubmission" ||
      gate.mobileStatus === "needs_resubmission" ||
      gate.finalStatus === "needs_resubmission");

  const canEdit = !isApproved && !isUnderReview;

  // Load existing L1 KYC data
  useEffect(() => {
    if (kycProfile?.data_json && Object.keys(kycProfile.data_json).length > 0) {
      setFormData(kycProfile.data_json);
      const data = kycProfile.data_json;
      if (canEdit) {
        if (data.selfie_url && data.id_front_url && data.id_back_url) {
          setCurrentStep(4);
        } else if (data.address_line1 && data.city) {
          setCurrentStep(3);
        } else if (data.full_name && data.date_of_birth) {
          setCurrentStep(2);
        }
      }
    }
  }, [kycProfile?.id, canEdit]);

  // Auto-save draft (debounced) — only while editable
  useEffect(() => {
    if (Object.keys(formData).length > 0 && canEdit && user) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        updateKYCLevel('L1', formData, 'draft').catch(err => {
          console.warn('[KYC] Auto-save failed:', err);
        });
      }, 3000);
      return () => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      };
    }
  }, [formData, canEdit, user]);

  const handlePersonalNext = (data: any) => { setFormData((prev: any) => ({ ...prev, ...data })); setCurrentStep(2); };
  const handleAddressNext = (data: any) => { setFormData((prev: any) => ({ ...prev, ...data })); setCurrentStep(3); };
  const handleDocumentsNext = (data: any) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);
    if (user) updateKYCLevel('L1', newFormData, 'draft').catch(console.error);
    setCurrentStep(4);
  };

  const handleFinalSubmit = async () => {
    if (!user) { toast.error("Please sign in to submit your KYC application."); return; }
    if (isUnderReview) { toast.error("Your KYC is already under review."); return; }
    if (isApproved) { toast.error("Your KYC is already approved."); return; }

    const requiredFields = ['full_name', 'date_of_birth', 'nationality', 'phone',
                           'address_line1', 'city', 'country', 'postal_code',
                           'id_type', 'id_number', 'id_front_url', 'id_back_url', 'selfie_url'];
    const missing = requiredFields.filter(f => !formData[f]);
    if (missing.length > 0) {
      toast.error(`Missing required fields: ${missing.join(', ')}. Please go back and fill them.`);
      return;
    }

    setSubmitting(true);
    try {
      const profile = await updateKYCLevel('L1', formData, 'draft');
      await submitKYCLevel('L1', profile.id);
      await Promise.all([refetch(), gate.refresh()]);
      toast.success("KYC submitted successfully! You'll be notified once reviewed.");
    } catch (error: any) {
      console.error('KYC submission error:', error);
      if (error?.message?.includes('already has a KYC')) {
        toast.error("You already have a pending or approved KYC submission.");
      } else {
        toast.error(error?.message || "Failed to submit KYC. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = () => { setCurrentStep(1); };
  const handleRefresh = async () => {
    await Promise.all([refetch(), gate.refresh()]);
    toast.success("Status refreshed");
  };

  if (loading || gate.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your KYC status...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Auth Guard */}
        {!user && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              Please sign in to submit your KYC application.
            </AlertDescription>
          </Alert>
        )}

        {/* APPROVED */}
        {isApproved && (
          <Card className="mb-6 border-emerald-500/50 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-emerald-500/20 p-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">KYC Approved</h3>
                    <Badge className="bg-emerald-500"><Shield className="h-3 w-3 mr-1" />Verified</Badge>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-400 mb-3">
                    🎉 Your identity has been fully verified across all three pillars. You now have full access to all features.
                  </p>
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-background/40 p-3">
                    <PillarRow icon={FileText} name="Documents" status={gate.documentsStatus} />
                    <PillarRow icon={Camera} name="Face verification" status={gate.faceStatus} />
                    <PillarRow icon={Phone} name="Mobile verification" status={gate.mobileStatus} />
                  </div>
                  {kycProfile?.reviewed_at && (
                    <p className="text-sm text-emerald-600/70 dark:text-emerald-500/70 mt-3">
                      Approved on {format(new Date(kycProfile.reviewed_at), 'PPP')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* UNDER REVIEW */}
        {isUnderReview && (
          <Card className="mb-6 border-sky-500/50 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-sky-500/20 p-3">
                  <Clock className="h-8 w-8 text-sky-600 dark:text-sky-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold text-sky-800 dark:text-sky-300">KYC Under Review</h3>
                    <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30">
                      <Clock className="h-3 w-3 mr-1" />Pending
                    </Badge>
                  </div>
                  <p className="text-sky-700 dark:text-sky-400 mb-3">
                    Your submission is being reviewed by our team. You'll be notified the moment a decision is made.
                  </p>
                  <div className="rounded-lg border border-sky-200 dark:border-sky-800/50 bg-background/40 p-3 mb-3">
                    <PillarRow icon={FileText} name="Documents" status={gate.documentsStatus} />
                    <PillarRow icon={Camera} name="Face verification" status={gate.faceStatus} />
                    <PillarRow icon={Phone} name="Mobile verification" status={gate.mobileStatus} />
                  </div>
                  <div className="bg-sky-100 dark:bg-sky-900/30 rounded-lg p-3 text-sm text-sky-800 dark:text-sky-300">
                    <p className="font-medium mb-1">⏱️ Expected review: 24–48 hours</p>
                    <p className="text-sky-600 dark:text-sky-400">
                      You can't submit a new KYC while one is pending review.
                    </p>
                  </div>
                  {kycProfile?.submitted_at && (
                    <p className="text-sm text-sky-600/70 dark:text-sky-500/70 mt-3">
                      Submitted {format(new Date(kycProfile.submitted_at), 'PPpp')}
                    </p>
                  )}
                  <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-3 text-sky-600 border-sky-300">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Check status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* REJECTED */}
        {isRejected && (
          <Alert className="mb-4 border-rose-500/50 bg-rose-50 dark:bg-rose-950/20">
            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-500" />
            <AlertTitle className="text-rose-800 dark:text-rose-300">KYC Rejected — Resubmission Available</AlertTitle>
            <AlertDescription className="text-rose-700 dark:text-rose-400">
              <div className="space-y-2 mt-2">
                {gate.rejectionReason && (
                  <div className="bg-rose-100 dark:bg-rose-900/30 rounded-lg p-3">
                    <p className="font-medium text-sm">Reason:</p>
                    <p className="text-sm mt-1">{gate.rejectionReason}</p>
                  </div>
                )}
                <div className="rounded-lg border border-rose-200 dark:border-rose-800/50 bg-background/40 p-3">
                  <PillarRow icon={FileText} name="Documents" status={gate.documentsStatus} />
                  <PillarRow icon={Camera} name="Face verification" status={gate.faceStatus} />
                  <PillarRow icon={Phone} name="Mobile verification" status={gate.mobileStatus} />
                </div>
                <p className="text-sm">Please review the feedback above and resubmit with corrected information.</p>
                <Button onClick={handleResubmit} variant="outline" size="sm"
                  className="mt-2 border-rose-500/50 text-rose-600 hover:bg-rose-50">
                  Start Resubmission
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* NEEDS RESUBMISSION */}
        {needsResubmission && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">Additional Information Needed</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <div className="space-y-2 mt-2">
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-background/40 p-3">
                  <PillarRow icon={FileText} name="Documents" status={gate.documentsStatus} />
                  <PillarRow icon={Camera} name="Face verification" status={gate.faceStatus} />
                  <PillarRow icon={Phone} name="Mobile verification" status={gate.mobileStatus} />
                </div>
                <p className="text-sm">{gate.reason}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* KYC Form */}
        {canEdit && (
          <Card className="p-6 md:p-8">
            <KYCProgressBar currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS} />
            {currentStep === 1 && <KYCStepPersonal initialData={formData} onNext={handlePersonalNext} />}
            {currentStep === 2 && <KYCStepAddress initialData={formData} onNext={handleAddressNext} onBack={() => setCurrentStep(1)} />}
            {currentStep === 3 && <KYCStepDocuments initialData={formData} onNext={handleDocumentsNext} onBack={() => setCurrentStep(2)} onUpload={(file, type) => uploadDocument(file, 'L1', type)} uploading={uploading} />}
            {currentStep === 4 && <KYCStepReview formData={formData} onSubmit={handleFinalSubmit} onBack={() => setCurrentStep(3)} submitting={submitting} />}
          </Card>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact support at{" "}
            <a href="mailto:support@example.com" className="text-primary hover:underline">support@example.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};
