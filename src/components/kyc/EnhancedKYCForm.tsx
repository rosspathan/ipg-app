import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ValidatedInput } from './ValidatedInput';
import { ModernDOBPicker } from './ModernDOBPicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, Camera, CheckCircle } from 'lucide-react';
import { useKYC } from '@/hooks/useKYC';
import { useKYCAutosave } from '@/hooks/useKYCAutosave';
import { withSessionRefresh } from '@/utils/sessionRefresh';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface KYCFormData {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  city: string;
  postal_code: string;
  country: string;
  id_type: string;
  id_number: string;
}

interface EnhancedKYCFormProps {
  minAge?: number;
}

export function EnhancedKYCForm({ minAge = 18 }: EnhancedKYCFormProps) {
  const { kycProfile, loading, uploading, submitKYC, uploadFile } = useKYC();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState({
    id_front: null as File | null,
    id_back: null as File | null,
    selfie: null as File | null
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<KYCFormData>();
  
  // Watch all form values for autosave
  const formValues = watch();
  
  // Autosave functionality
  const { restore, clear } = useKYCAutosave({
    key: 'kyc_draft_v1',
    data: formValues,
    debounceMs: 1500
  });

  // Restore draft on mount
  useEffect(() => {
    if (!kycProfile) {
      const draft = restore();
      if (draft) {
        Object.entries(draft).forEach(([key, value]) => {
          setValue(key as any, value as any);
        });
        toast('Draft restored', {
          description: 'Your previous progress has been restored'
        });
      }
    }
  }, []);

  // Populate from existing KYC profile
  useEffect(() => {
    if (kycProfile) {
      setValue('first_name', kycProfile.first_name || '');
      setValue('last_name', kycProfile.last_name || '');
      setValue('id_type', kycProfile.id_type || '');
      setValue('id_number', kycProfile.id_number || '');
    }
  }, [kycProfile, setValue]);

  const handleFileChange = (type: 'id_front' | 'id_back' | 'selfie', file: File | null) => {
    // Validate file size (10MB default)
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB'
      });
      return;
    }
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const onSubmit = async (data: KYCFormData) => {
    if (kycProfile?.status === 'pending') {
      toast.info('Already submitted', {
        description: 'Your KYC is already under review'
      });
      return;
    }

    // Validate age
    const age = new Date().getFullYear() - new Date(data.dob).getFullYear();
    if (age < minAge) {
      toast.error('Age requirement', {
        description: `You must be at least ${minAge} years old`
      });
      return;
    }

    // Validate files
    if (!files.id_front || !files.id_back || !files.selfie) {
      toast.error('Missing documents', {
        description: 'Please upload all required documents'
      });
      return;
    }

    try {
      setSubmitting(true);

      // Upload files with session refresh handling
      const [idFrontUrl, idBackUrl, selfieUrl] = await withSessionRefresh(async () => {
        return Promise.all([
          uploadFile(files.id_front!, 'id_front'),
          uploadFile(files.id_back!, 'id_back'),
          uploadFile(files.selfie!, 'selfie')
        ]);
      });

      // Submit KYC with session refresh handling
      await withSessionRefresh(async () => {
        await submitKYC({
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          id_type: data.id_type,
          id_number: data.id_number.trim(),
          id_front_url: idFrontUrl,
          id_back_url: idBackUrl,
          selfie_url: selfieUrl
        });
      });

      // Clear draft on success
      clear();
      
      console.log('KYC_SUBMIT_OK');
      
      toast.success('KYC submitted successfully', {
        description: 'Your documents are under review',
        icon: <CheckCircle className="w-4 h-4" />
      });

    } catch (error: any) {
      console.error('KYC submission error:', error);
      
      // Handle rate limiting
      if (error?.message?.includes('rate') || error?.message?.includes('429')) {
        toast.error('Too many requests', {
          description: 'Please wait a moment and try again'
        });
      } else {
        toast.error('Submission failed', {
          description: error?.message || 'Please try again'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormDisabled = kycProfile?.status === 'pending' || kycProfile?.status === 'verified';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-success/20 text-success border-success/30">Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary">Under Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-safe">
      <Card className="bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>KYC Verification</span>
            {kycProfile && getStatusBadge(kycProfile.status)}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* Status Messages */}
          {kycProfile?.status === 'verified' && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 mb-6">
              <p className="text-success font-medium">
                ✓ Identity verified successfully
              </p>
            </div>
          )}

          {kycProfile?.status === 'rejected' && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
              <p className="text-destructive font-medium">
                Rejected: {kycProfile.notes}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please resubmit with correct information
              </p>
            </div>
          )}

          {kycProfile?.status === 'pending' && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
              <p className="text-warning-foreground">
                Under review (1-3 business days)
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Personal Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <ValidatedInput
                  label="First Name"
                  required
                  disabled={isFormDisabled}
                  error={errors.first_name?.message}
                  {...register('first_name', {
                    required: 'Required',
                    minLength: { value: 2, message: 'Min 2 chars' },
                    maxLength: { value: 60, message: 'Max 60 chars' }
                  })}
                />
                
                <ValidatedInput
                  label="Last Name"
                  required
                  disabled={isFormDisabled}
                  error={errors.last_name?.message}
                  {...register('last_name', {
                    required: 'Required',
                    minLength: { value: 2, message: 'Min 2 chars' },
                    maxLength: { value: 60, message: 'Max 60 chars' }
                  })}
                />
              </div>

              <ModernDOBPicker
                value={watch('dob')}
                onChange={(date) => setValue('dob', date)}
                disabled={isFormDisabled}
                minAgeYears={minAge}
                error={errors.dob?.message}
              />

              <ValidatedInput
                label="Phone (with country code)"
                required
                type="tel"
                placeholder="+91 1234567890"
                disabled={isFormDisabled}
                error={errors.phone?.message}
                {...register('phone', {
                  required: 'Required',
                  pattern: {
                    value: /^\+\d{1,3}\s?\d{6,14}$/,
                    message: 'Invalid format (e.g. +91 1234567890)'
                  }
                })}
              />

              <div className="grid grid-cols-2 gap-4">
                <ValidatedInput
                  label="City"
                  required
                  disabled={isFormDisabled}
                  error={errors.city?.message}
                  style={{ textTransform: 'capitalize' }}
                  {...register('city', {
                    required: 'Required',
                    minLength: { value: 2, message: 'Min 2 chars' }
                  })}
                />
                
                <ValidatedInput
                  label="Postal Code"
                  required
                  disabled={isFormDisabled}
                  error={errors.postal_code?.message}
                  {...register('postal_code', {
                    required: 'Required'
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Country *</Label>
                <Select
                  value={watch('country')}
                  onValueChange={(value) => setValue('country', value)}
                  disabled={isFormDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ID Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">ID Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Type *</Label>
                  <Select
                    value={watch('id_type')}
                    onValueChange={(value) => setValue('id_type', value)}
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aadhaar">Aadhaar</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers">Driver's License</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ValidatedInput
                  label="ID Number"
                  required
                  disabled={isFormDisabled}
                  error={errors.id_number?.message}
                  {...register('id_number', { required: 'Required' })}
                />
              </div>
            </div>

            {/* Document Uploads */}
            {!isFormDisabled && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Documents</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['id_front', 'id_back', 'selfie'] as const).map((type) => (
                    <div key={type} className="space-y-2">
                      <Label className="capitalize">
                        {type.replace('_', ' ')} *
                      </Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                        {type === 'selfie' ? (
                          <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        ) : (
                          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange(type, e.target.files?.[0] || null)}
                          className="hidden"
                          id={type}
                        />
                        <Label htmlFor={type} className="cursor-pointer">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload
                            </span>
                          </Button>
                        </Label>
                        {files[type] && (
                          <p className="text-xs text-success mt-2 line-clamp-1">
                            {files[type]!.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={submitting || uploading}
                  className="w-full h-12 sticky-cta"
                >
                  {(submitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for Verification
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
