import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { KYCProgressBar } from "./KYCProgressBar";
import { KYCStepPersonal } from "./KYCStepPersonal";
import { KYCStepAddress } from "./KYCStepAddress";
import { KYCStepDocuments } from "./KYCStepDocuments";
import { KYCStepReview } from "./KYCStepReview";
import { useKYCSimple } from "@/hooks/useKYCSimple";
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
  const { submission, saveForm, uploadDocument, submitForReview, uploading } = useKYCSimple();
  const [submitting, setSubmitting] = useState(false);

  // Load existing submission data
  useEffect(() => {
    if (submission) {
      setFormData(submission);
    }
  }, [submission]);

  // Auto-save on data change
  useEffect(() => {
    if (Object.keys(formData).length > 0 && currentStep > 1) {
      const timer = setTimeout(() => {
        saveForm({ ...formData, status: 'draft' });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, currentStep]);

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
    setSubmitting(true);
    try {
      const saved = await saveForm({ ...formData, status: 'draft' });
      if (saved) {
        const submitted = await submitForReview();
        if (submitted) {
          toast.success("KYC submitted successfully! We'll review it within 24-48 hours.");
        }
      }
    } catch (error) {
      toast.error("Failed to submit KYC. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
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
              onUpload={uploadDocument}
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
