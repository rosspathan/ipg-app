import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ChevronLeft, User, MapPin, Shield } from "lucide-react";

interface KYCStepReviewProps {
  formData: any;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}

export const KYCStepReview = ({ formData, onSubmit, onBack, submitting }: KYCStepReviewProps) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Review Your Information</h2>
        <p className="text-muted-foreground">Please verify all details before submitting</p>
      </div>

      <div className="space-y-4">
        {/* Personal Information */}
        <Card className="p-6 border-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Personal Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full Name:</span>
              <span className="font-medium">{formData.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date of Birth:</span>
              <span className="font-medium">{formData.date_of_birth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nationality:</span>
              <span className="font-medium">{formData.nationality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{formData.phone}</span>
            </div>
          </div>
        </Card>

        {/* Address */}
        <Card className="p-6 border-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Residential Address</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address:</span>
              <span className="font-medium text-right max-w-[60%]">
                {formData.address_line1}
                {formData.address_line2 && `, ${formData.address_line2}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">City:</span>
              <span className="font-medium">{formData.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">State/Province:</span>
              <span className="font-medium">{formData.state || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Postal Code:</span>
              <span className="font-medium">{formData.postal_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Country:</span>
              <span className="font-medium">{formData.country}</span>
            </div>
          </div>
        </Card>

        {/* Documents */}
        <Card className="p-6 border-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Identity Documents</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Document Type:</span>
              <span className="font-medium capitalize">{formData.id_type?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Document Number:</span>
              <span className="font-medium">{formData.id_number}</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm">All documents uploaded ✓</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ <strong>Important:</strong> By submitting, you confirm that all information provided is accurate and matches your official documents. False information may result in account suspension.
        </p>
      </div>

      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          size="lg" 
          onClick={onBack}
          className="h-12"
          disabled={submitting}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={onSubmit}
          size="lg" 
          className="flex-1 h-12 text-base"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit for Review"}
        </Button>
      </div>
    </div>
  );
};
