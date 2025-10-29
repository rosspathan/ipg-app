import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { KYCProgressBar } from "./KYCProgressBar";
import { KYCStepPersonal } from "./KYCStepPersonal";
import { KYCStepAddress } from "./KYCStepAddress";
import { KYCStepDocuments } from "./KYCStepDocuments";
import { KYCStepReview } from "./KYCStepReview";
import { useKYCNew } from "@/hooks/useKYCNew";
import { useAuthUser } from "@/hooks/useAuthUser";
import { toast } from "sonner";

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
  const { profiles, uploadDocument, updateKYCLevel, submitKYCLevel, uploading } = useKYCNew();
  const [submitting, setSubmitting] = useState(false);

  // Load existing L1 KYC data
  useEffect(() => {
    if (profiles.L1?.data_json) {
      setFormData(profiles.L1.data_json);
    }
  }, [profiles.L1]);

  // Auto-save on data change (but NOT after submission)
  useEffect(() => {
    const currentStatus = profiles.L1?.status;
    const isStillDraft = !currentStatus || currentStatus === 'draft' || currentStatus === 'none';
    
    if (Object.keys(formData).length > 0 && currentStep > 1 && isStillDraft) {
      const timer = setTimeout(() => {
        updateKYCLevel('L1', formData, 'draft').catch(err => {
          console.error('Auto-save failed:', err);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, currentStep, profiles.L1?.status]);

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

    setSubmitting(true);
    try {
      // First save the final form data
      const profile = await updateKYCLevel('L1', formData, 'draft');
      
      // Then submit for review
      await submitKYCLevel('L1', profile.id);
      
      toast.success("KYC submitted successfully! We'll review it within 24-48 hours.");
    } catch (error: any) {
      console.error('KYC submission error:', error);
      toast.error(error?.message || "Failed to submit KYC. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = () => {
    setCurrentStep(1);
    updateKYCLevel('L1', formData, 'draft').catch(console.error);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Auth Guard */}
        {!user && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              Please sign in to submit your KYC application. You can still fill out the form, but submission requires authentication.
            </AlertDescription>
          </Alert>
        )}

        {/* Status Banners */}
        {profiles.L1?.status === 'approved' && (
          <Alert className="mb-4 border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              🎉 Your KYC has been approved! You now have full access to all features.
            </AlertDescription>
          </Alert>
        )}

        {profiles.L1?.status === 'rejected' && (
          <Alert className="mb-4 border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
            <AlertDescription className="text-red-800 dark:text-red-300">
              <div className="space-y-2">
                <p className="font-medium">KYC application needs revision</p>
                {profiles.L1.rejection_reason && (
                  <p className="text-sm">Reason: {profiles.L1.rejection_reason}</p>
                )}
                <Button 
                  onClick={handleResubmit}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Resubmit KYC
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {profiles.L1?.status === 'submitted' && (
          <Alert className="mb-4 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              Your KYC is under review. We'll notify you within 24-48 hours.
            </AlertDescription>
          </Alert>
        )}

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
