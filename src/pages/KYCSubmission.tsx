import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useKYCSubmission } from '@/hooks/useKYCSubmission';
import { ValidatedInput } from '@/components/kyc/ValidatedInput';
import { DocumentUploader } from '@/components/kyc/DocumentUploader';
import { KYCStatusBadge } from '@/components/kyc/KYCStatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { validateKYCSubmission } from '@/lib/kyc-validation-new';
import { Loader2 } from 'lucide-react';

export default function KYCSubmission() {
  const navigate = useNavigate();
  const { submission, loading, uploading, savingDraft, progress, saveDraft, uploadDocument, submitForReview } = useKYCSubmission();
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (submission) {
      setFormData(submission);
    }
  }, [submission]);

  const handleInputChange = (field: string, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    saveDraft(updatedData);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileUpload = async (field: string, file: File) => {
    try {
      const url = await uploadDocument(file, field as any);
      handleInputChange(field, url);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleSubmit = async () => {
    const validation = validateKYCSubmission(formData);
    
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    if (!confirmAccuracy) {
      setErrors({ _confirm: 'Please confirm that all information is accurate' });
      return;
    }

    setSubmitting(true);
    try {
      await submitForReview(formData);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isDisabled = submission?.status === 'submitted' || submission?.status === 'approved';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {submission?.status && <KYCStatusBadge status={submission.status} />}
          </div>
          <h1 className="text-2xl font-bold mt-4">KYC Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete your identity verification to unlock all features
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Progress Bar */}
        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {savingDraft && (
              <p className="text-xs text-muted-foreground">Auto-saving draft...</p>
            )}
          </div>
        </Card>

        {/* Status Messages */}
        {submission?.status === 'approved' && (
          <Card className="p-6 bg-green-500/5 border-green-500/20">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-400">
                  Verification Complete
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your identity has been verified successfully!
                </p>
              </div>
            </div>
          </Card>
        )}

        {submission?.status === 'rejected' && submission.rejection_reason && (
          <Card className="p-6 bg-red-500/5 border-red-500/20">
            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-400">
                Verification Rejected
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {submission.rejection_reason}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please update your information and resubmit.
              </p>
            </div>
          </Card>
        )}

        {submission?.status === 'submitted' && (
          <Card className="p-6 bg-yellow-500/5 border-yellow-500/20">
            <div>
              <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">
                Under Review
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Our team is reviewing your documents. This usually takes 24-48 hours.
              </p>
            </div>
          </Card>
        )}

        {/* Personal Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedInput
              id="full_name"
              label="Full Legal Name"
              value={formData.full_name || ''}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              disabled={isDisabled}
              required
              error={errors.full_name}
              placeholder="As per government ID"
            />
            <ValidatedInput
              id="date_of_birth"
              label="Date of Birth"
              type="date"
              value={formData.date_of_birth || ''}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              disabled={isDisabled}
              required
              error={errors.date_of_birth}
            />
            <div className="space-y-2">
              <Label>Nationality *</Label>
              <Select
                value={formData.nationality || ''}
                onValueChange={(value) => handleInputChange('nationality', value)}
                disabled={isDisabled}
              >
                <SelectTrigger className={errors.nationality ? 'border-danger' : ''}>
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.nationality && <p className="text-xs text-danger">{errors.nationality}</p>}
            </div>
            <ValidatedInput
              id="phone"
              label="Phone Number"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={isDisabled}
              required
              error={errors.phone}
              placeholder="+91 9876543210"
            />
          </div>
        </Card>

        {/* Address Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Address Details</h2>
          <div className="space-y-4">
            <ValidatedInput
              id="address_line1"
              label="Address Line 1"
              value={formData.address_line1 || ''}
              onChange={(e) => handleInputChange('address_line1', e.target.value)}
              disabled={isDisabled}
              required
              error={errors.address_line1}
              placeholder="Street address"
            />
            <ValidatedInput
              id="address_line2"
              label="Address Line 2 (Optional)"
              value={formData.address_line2 || ''}
              onChange={(e) => handleInputChange('address_line2', e.target.value)}
              disabled={isDisabled}
              placeholder="Apartment, suite, etc."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ValidatedInput
                id="city"
                label="City"
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                disabled={isDisabled}
                required
                error={errors.city}
              />
              <ValidatedInput
                id="state"
                label="State (Optional)"
                value={formData.state || ''}
                onChange={(e) => handleInputChange('state', e.target.value)}
                disabled={isDisabled}
              />
              <ValidatedInput
                id="postal_code"
                label="Postal Code"
                value={formData.postal_code || ''}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                disabled={isDisabled}
                required
                error={errors.postal_code}
              />
            </div>
            <div className="space-y-2">
              <Label>Country *</Label>
              <Select
                value={formData.country || ''}
                onValueChange={(value) => handleInputChange('country', value)}
                disabled={isDisabled}
              >
                <SelectTrigger className={errors.country ? 'border-danger' : ''}>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.country && <p className="text-xs text-danger">{errors.country}</p>}
            </div>
          </div>
        </Card>

        {/* Identity Verification */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Identity Verification</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ID Type *</Label>
              <Select
                value={formData.id_type || ''}
                onValueChange={(value) => handleInputChange('id_type', value)}
                disabled={isDisabled}
              >
                <SelectTrigger className={errors.id_type ? 'border-danger' : ''}>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="drivers_license">Driver's License</SelectItem>
                  <SelectItem value="national_id">National ID Card</SelectItem>
                </SelectContent>
              </Select>
              {errors.id_type && <p className="text-xs text-danger">{errors.id_type}</p>}
            </div>
            <ValidatedInput
              id="id_number"
              label="ID Number"
              value={formData.id_number || ''}
              onChange={(e) => handleInputChange('id_number', e.target.value)}
              disabled={isDisabled}
              required
              error={errors.id_number}
              placeholder="Enter your ID number"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DocumentUploader
                label="ID Front"
                value={formData.id_front_url}
                onChange={(file) => handleFileUpload('id_front_url', file)}
                uploading={uploading}
                required
                error={errors.id_front_url}
              />
              <DocumentUploader
                label="ID Back"
                value={formData.id_back_url}
                onChange={(file) => handleFileUpload('id_back_url', file)}
                uploading={uploading}
                required
                error={errors.id_back_url}
              />
              <DocumentUploader
                label="Selfie"
                value={formData.selfie_url}
                onChange={(file) => handleFileUpload('selfie_url', file)}
                uploading={uploading}
                required
                error={errors.selfie_url}
                accept="image/*"
              />
            </div>
          </div>
        </Card>

        {/* Review & Submit */}
        {!isDisabled && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="confirm"
                  checked={confirmAccuracy}
                  onCheckedChange={(checked) => setConfirmAccuracy(checked as boolean)}
                />
                <label htmlFor="confirm" className="text-sm cursor-pointer">
                  I confirm that all the information provided above is accurate and matches my official government-issued documents.
                </label>
              </div>
              {errors._confirm && <p className="text-xs text-danger">{errors._confirm}</p>}
              
              <Button
                onClick={handleSubmit}
                disabled={uploading || submitting || progress < 100 || !confirmAccuracy}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Review'
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
