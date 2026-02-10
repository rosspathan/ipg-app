import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Clock, Shield, Loader2 } from "lucide-react";
import { KYCProgressBar } from "./KYCProgressBar";
import { KYCStepPersonal } from "./KYCStepPersonal";
import { KYCStepAddress } from "./KYCStepAddress";
import { KYCStepDocuments } from "./KYCStepDocuments";
import { KYCStepReview } from "./KYCStepReview";
import { useKYCNew } from "@/hooks/useKYCNew";
import { useAuthUser } from "@/hooks/useAuthUser";
import { toast } from "sonner";
import { format } from "date-fns";

const STEPS = [
  { title: "Personal", description: "Basic details" },
  { title: "Address", description: "Where you live" },
  { title: "Documents", description: "Identity proof" },
  { title: "Review", description: "Final check" },
];

export const KYCWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const { user } = useAuthUser();
  const { profiles, uploadDocument, updateKYCLevel, submitKYCLevel, uploading, loading, refetch } = useKYCNew();
  const [submitting, setSubmitting] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const kycProfile = profiles.L1;
  const kycStatus = kycProfile?.status;

  const isApproved = kycStatus === 'approved';
  const isRejected = kycStatus === 'rejected';
  const isPending = kycStatus === 'submitted' || kycStatus === 'in_review';
  const canEdit = !isApproved && !isPending;

  // Load existing L1 KYC data
  useEffect(() => {
    if (kycProfile?.data_json && Object.keys(kycProfile.data_json).length > 0) {
      setFormData(kycProfile.data_json);
      
      // Auto-advance to step based on existing data
      const data = kycProfile.data_json;
      if (data.selfie_url && data.id_front_url && data.id_back_url) {
        // All docs uploaded, go to review if not rejected
        if (kycStatus !== 'rejected') setCurrentStep(4);
      } else if (data.address_line1 && data.city) {
        setCurrentStep(3);
      } else if (data.full_name && data.date_of_birth) {
        setCurrentStep(2);
      }
    }
  }, [kycProfile?.id]);

  // Auto-save draft (debounced)
  useEffect(() => {
    const isEditable = !kycStatus || kycStatus === 'draft' || kycStatus === 'none' || kycStatus === 'rejected';
    
    if (Object.keys(formData).length > 0 && isEditable && user) {
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
  }, [formData, kycStatus, user]);

  const handlePersonalNext = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleAddressNext = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleDocumentsNext = (data: any) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);
    
    // Save immediately before going to review
    if (user) {
      updateKYCLevel('L1', newFormData, 'draft').catch(console.error);
    }
    setCurrentStep(4);
  };

  const handleFinalSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to submit your KYC application.");
      return;
    }

    if (isPending) {
      toast.error("Your KYC is already under review.");
      return;
    }

    if (isApproved) {
      toast.error("Your KYC is already approved.");
      return;
    }

    // Validate all required fields are present
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
      // Save final form data
      const profile = await updateKYCLevel('L1', formData, 'draft');
      
      // Submit for review
      await submitKYCLevel('L1', profile.id);
      
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

  const handleResubmit = () => {
    if (isRejected) {
      setCurrentStep(1);
    }
  };

  if (loading) {
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

        {/* APPROVED STATUS */}
        {isApproved && (
          <Card className="mb-6 border-emerald-500/50 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-emerald-500/20 p-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                      KYC Approved
                    </h3>
                    <Badge className="bg-emerald-500">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-400 mb-2">
                    🎉 Your identity has been verified! You now have full access to all features.
                  </p>
                  {kycProfile?.reviewed_at && (
                    <p className="text-sm text-emerald-600/70 dark:text-emerald-500/70">
                      Approved on {format(new Date(kycProfile.reviewed_at), 'PPP')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PENDING STATUS */}
        {isPending && (
          <Card className="mb-6 border-blue-500/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-blue-500/20 p-3">
                  <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300">
                      KYC Under Review
                    </h3>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  <p className="text-blue-700 dark:text-blue-400 mb-3">
                    Your KYC submission is being reviewed. You'll be notified once it's processed.
                  </p>
                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">⏱️ Expected Review Time: 24-48 hours</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      You cannot submit a new KYC while one is pending review.
                    </p>
                  </div>
                  {kycProfile?.submitted_at && (
                    <p className="text-sm text-blue-600/70 dark:text-blue-500/70 mt-3">
                      Submitted on {format(new Date(kycProfile.submitted_at), 'PPpp')}
                    </p>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refetch} 
                    className="mt-3 text-blue-600 border-blue-300"
                  >
                    Check Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* REJECTED STATUS */}
        {isRejected && (
          <Alert className="mb-4 border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
            <AlertTitle className="text-red-800 dark:text-red-300">
              KYC Application Needs Revision
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-400">
              <div className="space-y-2 mt-2">
                {kycProfile?.rejection_reason && (
                  <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                    <p className="font-medium text-sm">Reason for rejection:</p>
                    <p className="text-sm mt-1">{kycProfile.rejection_reason}</p>
                  </div>
                )}
                <p className="text-sm">
                  Please review the feedback and resubmit with corrected information.
                </p>
                <Button 
                  onClick={handleResubmit}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-red-500/50 text-red-600 hover:bg-red-50"
                >
                  Start Resubmission
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* KYC Form */}
        {canEdit && (
          <Card className="p-6 md:p-8">
            <KYCProgressBar 
              currentStep={currentStep} 
              totalSteps={STEPS.length} 
              steps={STEPS}
            />

            {currentStep === 1 && (
              <KYCStepPersonal 
                initialData={formData}
                onNext={handlePersonalNext}
              />
            )}

            {currentStep === 2 && (
              <KYCStepAddress 
                initialData={formData}
                onNext={handleAddressNext}
                onBack={() => setCurrentStep(1)}
              />
            )}

            {currentStep === 3 && (
              <KYCStepDocuments 
                initialData={formData}
                onNext={handleDocumentsNext}
                onBack={() => setCurrentStep(2)}
                onUpload={(file, type) => uploadDocument(file, 'L1', type)}
                uploading={uploading}
              />
            )}

            {currentStep === 4 && (
              <KYCStepReview 
                formData={formData}
                onSubmit={handleFinalSubmit}
                onBack={() => setCurrentStep(3)}
                submitting={submitting}
              />
            )}
          </Card>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact support at{" "}
            <a href="mailto:support@example.com" className="text-primary hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
