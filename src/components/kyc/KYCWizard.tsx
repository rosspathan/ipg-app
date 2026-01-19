import { useState, useEffect } from "react";
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
  const { profiles, uploadDocument, updateKYCLevel, submitKYCLevel, uploading, loading } = useKYCNew();
  const [submitting, setSubmitting] = useState(false);

  const kycProfile = profiles.L1;
  const kycStatus = kycProfile?.status;

  // Determine if user can edit/submit
  const isApproved = kycStatus === 'approved';
  const isRejected = kycStatus === 'rejected';
  const isPending = kycStatus === 'submitted' || kycStatus === 'in_review';
  const canEdit = !isApproved && !isPending;

  // Load existing L1 KYC data
  useEffect(() => {
    if (kycProfile?.data_json) {
      setFormData(kycProfile.data_json);
    }
  }, [kycProfile]);

  // Auto-save on data change (only for draft/rejected status)
  useEffect(() => {
    const isEditable = !kycStatus || kycStatus === 'draft' || kycStatus === 'none' || kycStatus === 'rejected';
    
    if (Object.keys(formData).length > 0 && currentStep > 1 && isEditable) {
      const timer = setTimeout(() => {
        updateKYCLevel('L1', formData, 'draft').catch(err => {
          console.error('Auto-save failed:', err);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, currentStep, kycStatus]);

  const handlePersonalNext = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleAddressNext = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleDocumentsNext = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setCurrentStep(4);
  };

  const handleFinalSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to submit your KYC application.");
      return;
    }

    // Double-check status before submitting
    if (isPending) {
      toast.error("Your KYC is already under review. Please wait for the result.");
      return;
    }

    if (isApproved) {
      toast.error("Your KYC is already approved.");
      return;
    }

    setSubmitting(true);
    try {
      // First save the final form data
      const profile = await updateKYCLevel('L1', formData, 'draft');
      
      // Then submit for review
      await submitKYCLevel('L1', profile.id);
      
      toast.success("KYC submitted successfully! You'll be notified once reviewed.");
    } catch (error: any) {
      console.error('KYC submission error:', error);
      // Check for state machine violation
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
      // Reset to draft for resubmission
      updateKYCLevel('L1', formData, 'draft').catch(console.error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your KYC status...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Auth Guard */}
        {!user && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              Please sign in to submit your KYC application. You can fill out the form, but submission requires authentication.
            </AlertDescription>
          </Alert>
        )}

        {/* APPROVED STATUS - Lock the form */}
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

        {/* PENDING STATUS - Lock the form and show waiting message */}
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
                    Your KYC submission is being reviewed by our team. You will be notified once it is approved or if any changes are needed.
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* REJECTED STATUS - Allow resubmission */}
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
                  Please review the feedback above and resubmit with corrected information.
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

        {/* KYC Form - Only show if not approved and not pending */}
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

        {/* Help section */}
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
