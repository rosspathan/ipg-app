import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, User, MapPin, Shield, Image, AlertTriangle } from "lucide-react";

interface KYCStepReviewProps {
  formData: any;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}

const ID_TYPE_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan_card: 'PAN Card',
  passport: 'Passport',
  national_id: 'National ID Card',
  drivers_license: "Driver's License",
};

export const KYCStepReview = ({ formData, onSubmit, onBack, submitting }: KYCStepReviewProps) => {
  const requiredFields = ['full_name', 'date_of_birth', 'nationality', 'phone',
    'address_line1', 'city', 'country', 'postal_code',
    'id_type', 'id_number', 'id_front_url', 'id_back_url', 'selfie_url'];

  const missingFields = requiredFields.filter(f => !formData[f]);
  const isComplete = missingFields.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Review Your Information</h2>
        <p className="text-muted-foreground">Please verify all details before submitting</p>
      </div>

      {!isComplete && (
        <div className="flex items-center gap-2 text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Missing: {missingFields.join(', ')}. Please go back and complete all fields.</span>
        </div>
      )}

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
            <ReviewRow label="Full Name" value={formData.full_name} />
            <ReviewRow label="Date of Birth" value={formData.date_of_birth} />
            <ReviewRow label="Nationality" value={formData.nationality} />
            <ReviewRow label="Phone" value={formData.phone} />
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
            <ReviewRow 
              label="Address" 
              value={[formData.address_line1, formData.address_line2].filter(Boolean).join(', ')} 
            />
            <ReviewRow label="City" value={formData.city} />
            <ReviewRow label="State/Province" value={formData.state || 'N/A'} />
            <ReviewRow label="Postal Code" value={formData.postal_code} />
            <ReviewRow label="Country" value={formData.country} />
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
            <ReviewRow 
              label="Document Type" 
              value={ID_TYPE_LABELS[formData.id_type] || formData.id_type} 
            />
            <ReviewRow label="Document Number" value={formData.id_number} />
          </div>
          
          {/* Document thumbnails */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <DocThumb url={formData.id_front_url} label="ID Front" />
            <DocThumb url={formData.id_back_url} label="ID Back" />
            <DocThumb url={formData.selfie_url} label="Selfie" />
          </div>
        </Card>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          ⚠️ <strong>Important:</strong> By submitting, you confirm that all information is accurate and matches your official documents. False information may result in account suspension.
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
          disabled={submitting || !isComplete}
        >
          {submitting ? "Submitting..." : !isComplete ? "Complete all fields first" : "Submit for Review"}
        </Button>
      </div>
    </div>
  );
};

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-right max-w-[60%]">
        {value || <span className="text-destructive">Missing</span>}
      </span>
    </div>
  );
}

function DocThumb({ url, label }: { url?: string; label: string }) {
  if (!url) {
    return (
      <div className="aspect-[4/3] rounded-lg border-2 border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center text-center p-2">
        <Image className="h-5 w-5 text-destructive/50 mb-1" />
        <span className="text-[10px] text-destructive font-medium">{label} Missing</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-primary/30 bg-muted">
      <img src={url} alt={label} className="w-full h-full object-cover" />
      <Badge className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 bg-primary/90">
        <Check className="h-2.5 w-2.5 mr-0.5" />
        {label}
      </Badge>
    </div>
  );
}
