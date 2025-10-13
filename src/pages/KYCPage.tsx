import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, CheckCircle, XCircle, Clock } from "lucide-react";
import { useKYCNew } from "@/hooks/useKYCNew";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DOBPicker } from "@/components/kyc/DOBPicker";
import { ValidatedInput } from "@/components/kyc/ValidatedInput";
import { validateKYCLevel, DEFAULT_VALIDATION_RULES, ValidationError } from "@/lib/kyc-validation";

const KYC_LEVELS = [
  { id: 'L0', name: 'Basic', description: 'Personal info & address' },
  { id: 'L1', name: 'Identity', description: 'Government ID & selfie' },
  { id: 'L2', name: 'Enhanced', description: 'Source of funds' }
];

export function KYCPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuthUser();
  const { profiles, config, uploadDocument, updateKYCLevel, submitKYCLevel, loading, uploading } = useKYCNew();
  const [activeLevel, setActiveLevel] = useState<'L0' | 'L1' | 'L2'>('L0');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [requestedItems, setRequestedItems] = useState<string[]>([]);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[KYCPage] No user found, redirecting to onboarding');
      toast({
        title: "Authentication Required",
        description: "Please log in to access KYC verification",
        variant: "destructive",
      });
      navigate('/onboarding', { replace: true });
    }
  }, [user, authLoading, navigate, toast]);

  // Load form data when profile or level changes
  useEffect(() => {
    const currentProfile = profiles[activeLevel];
    if (currentProfile?.data_json) {
      setFormData(currentProfile.data_json);
    } else {
      setFormData({});
    }
    
    // Load admin message and requested items if status is rejected (needs info)
    if (currentProfile?.status === 'rejected' && currentProfile?.rejection_reason) {
      try {
        const parsed = JSON.parse(currentProfile.rejection_reason);
        setAdminMessage(parsed.message || currentProfile.rejection_reason);
        setRequestedItems(parsed.requested_items || []);
      } catch {
        setAdminMessage(currentProfile.rejection_reason);
        setRequestedItems([]);
      }
    } else {
      setAdminMessage(null);
      setRequestedItems([]);
    }
  }, [activeLevel, profiles]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (Object.keys(formData).length === 0) return;
    if (['submitted', 'in_review', 'approved'].includes(profiles[activeLevel]?.status || '')) return;
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(async () => {
      try {
        await updateKYCLevel(activeLevel, formData, 'draft');
        setHasUnsavedChanges(false);
        toast({ 
          title: "Saved", 
          description: "Your changes have been auto-saved as draft",
          duration: 2000
        });
      } catch {
        // Silent fail for autosave
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData, activeLevel, profiles, updateKYCLevel, hasUnsavedChanges]);

  // Track form changes
  const handleFormChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
    
    // Clear error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  };

  const handleBack = () => navigate("/app/profile");

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-danger" />;
      case 'submitted':
      case 'in_review': return <Clock className="h-5 w-5 text-warning" />;
      default: return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    const variants: Record<string, any> = {
      approved: { variant: "outline" as const, className: "bg-success/20 text-success border-success/30" },
      rejected: { variant: "outline" as const, className: "bg-danger/20 text-danger border-danger/30" },
      submitted: { variant: "outline" as const, className: "bg-warning/20 text-warning border-warning/30" },
      in_review: { variant: "outline" as const, className: "bg-warning/20 text-warning border-warning/30" },
      draft: { variant: "outline" as const, className: "bg-muted/20 text-muted-foreground border-muted/30" },
    };
    
    const config = variants[status || 'none'] || variants.draft;
    return <Badge {...config}>{status || 'Not Started'}</Badge>;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadDocument(file, activeLevel, docType);
      setFormData(prev => ({ ...prev, [docType]: url }));
      toast({ title: "Success", description: "Document uploaded" });
    } catch (error) {
      // Error handled in hook
    }
  };

  const validateForm = (): boolean => {
    const rules = config ? {
      ...DEFAULT_VALIDATION_RULES,
      minAgeYears: (config.level_schemas.L0?.minAgeYears || 18) as number,
    } : DEFAULT_VALIDATION_RULES;

    const errors = validateKYCLevel(activeLevel, formData, rules);
    
    if (errors.length > 0) {
      const errorMap: Record<string, string> = {};
      errors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setValidationErrors(errorMap);
      
      toast({ 
        title: "Validation Error", 
        description: `Please fix ${errors.length} error(s) before submitting`,
        variant: "destructive"
      });
      return false;
    }
    
    setValidationErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // First save as draft and get the profile
      const profile = await updateKYCLevel(activeLevel, formData, 'draft');
      
      // Then submit it
      await submitKYCLevel(activeLevel, profile.id);
      
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000);
      
      toast({ 
        title: "Success", 
        description: `KYC Level ${activeLevel} submitted for review` 
      });
    } catch (error: any) {
      toast({
        title: "Submission Error",
        description: error?.message || "Failed to submit KYC. Please try again.",
        variant: "destructive"
      });
    }
  };

  const currentProfile = profiles[activeLevel];
  const isReadOnly = ['submitted', 'in_review', 'approved'].includes(currentProfile?.status || '');
  const minAgeYears = config?.level_schemas?.L0?.minAgeYears || 18;
  const canSubmit = Object.keys(formData).length > 0 && Object.keys(validationErrors).length === 0;
  
  // Show loading state while auth or KYC data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            {authLoading ? 'Authenticating...' : 'Loading KYC data...'}
          </p>
        </div>
      </div>
    );
  }
  
  // Don't render if no user (will redirect via useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-kyc">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">KYC Verification</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 pt-6 px-4">
        {/* Success Banner */}
        {showSuccessBanner && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top">
            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-success">Submitted Successfully!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your KYC {activeLevel} has been submitted for admin review.
              </p>
            </div>
          </div>
        )}

        {/* Level Selector */}
        <div className="grid grid-cols-3 gap-2">
          {KYC_LEVELS.map(level => {
            const profile = profiles[level.id as 'L0' | 'L1' | 'L2'];
            const isActive = activeLevel === level.id;
            
            return (
              <button
                key={level.id}
                onClick={() => setActiveLevel(level.id as 'L0' | 'L1' | 'L2')}
                className={`
                  p-3 rounded-xl border-2 transition-all
                  ${isActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border/40 bg-card/60 hover:bg-card'
                  }
                `}
              >
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="font-bold text-sm">{level.name}</span>
                    {getStatusIcon(profile?.status)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {level.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Status Card */}
        {currentProfile && (
          <Card className="p-4 bg-card/60 backdrop-blur-xl border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(currentProfile.status)}</div>
              </div>
              {currentProfile.submitted_at && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-xs text-foreground">
                    {new Date(currentProfile.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            
            {adminMessage && (
              <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm font-medium text-warning mb-1">Admin Message</p>
                <p className="text-xs text-foreground">{adminMessage}</p>
                {requestedItems.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-foreground mb-1">Requested Items:</p>
                    <ul className="text-xs text-foreground list-disc list-inside space-y-1">
                      {requestedItems.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Form */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <div className="space-y-4">
            {activeLevel === 'L0' && (
              <>
                <ValidatedInput
                  id="legal_name"
                  label="Legal Name"
                  required
                  value={formData.legal_name || ''}
                  onChange={(e) => handleFormChange('legal_name', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Full legal name"
                  error={validationErrors.legal_name}
                />
                
                <div>
                  <DOBPicker
                    value={formData.dob}
                    onChange={(date) => handleFormChange('dob', date)}
                    disabled={isReadOnly}
                    minAgeYears={minAgeYears}
                    error={validationErrors.dob}
                  />
                  {validationErrors.dob && (
                    <p className="text-xs text-danger mt-1 animate-in slide-in-from-top-1">
                      {validationErrors.dob}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationality" className="flex items-center gap-1">
                    Nationality
                    <span className="text-danger">*</span>
                  </Label>
                  <Select
                    value={formData.nationality || ''}
                    onValueChange={(val) => handleFormChange('nationality', val)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.nationality && (
                    <p className="text-xs text-danger animate-in slide-in-from-top-1">
                      {validationErrors.nationality}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="flex items-center gap-1">
                    Country of Residence
                    <span className="text-danger">*</span>
                  </Label>
                  <Select
                    value={formData.country || ''}
                    onValueChange={(val) => handleFormChange('country', val)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country of residence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.country && (
                    <p className="text-xs text-danger animate-in slide-in-from-top-1">
                      {validationErrors.country}
                    </p>
                  )}
                </div>

                <ValidatedInput
                  id="phone"
                  label="Phone Number"
                  required
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="+1234567890"
                  error={validationErrors.phone}
                />

                <ValidatedInput
                  id="city"
                  label="City"
                  required
                  value={formData.city || ''}
                  onChange={(e) => handleFormChange('city', e.target.value)}
                  disabled={isReadOnly}
                  error={validationErrors.city}
                />

                <ValidatedInput
                  id="postal_code"
                  label="Postal Code"
                  required
                  value={formData.postal_code || ''}
                  onChange={(e) => handleFormChange('postal_code', e.target.value)}
                  disabled={isReadOnly}
                  error={validationErrors.postal_code}
                />
              </>
            )}

            {activeLevel === 'L1' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="id_type" className="flex items-center gap-1">
                    ID Type
                    <span className="text-danger">*</span>
                  </Label>
                  <Select
                    value={formData.id_type || ''}
                    onValueChange={(val) => handleFormChange('id_type', val)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.id_type && (
                    <p className="text-xs text-danger animate-in slide-in-from-top-1">
                      {validationErrors.id_type}
                    </p>
                  )}
                </div>

                <ValidatedInput
                  id="id_number"
                  label="ID Number"
                  required
                  value={formData.id_number || ''}
                  onChange={(e) => handleFormChange('id_number', e.target.value)}
                  disabled={isReadOnly}
                  error={validationErrors.id_number}
                />

                <div>
                  <Label>ID Front *</Label>
                  <div className="mt-2">
                    <Input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'id_front')}
                      disabled={isReadOnly || uploading}
                      accept="image/*"
                    />
                    {formData.id_front && (
                      <p className="text-xs text-success mt-1">✓ Uploaded</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>ID Back *</Label>
                  <div className="mt-2">
                    <Input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'id_back')}
                      disabled={isReadOnly || uploading}
                      accept="image/*"
                    />
                    {formData.id_back && (
                      <p className="text-xs text-success mt-1">✓ Uploaded</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Selfie *</Label>
                  <div className="mt-2">
                    <Input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'selfie')}
                      disabled={isReadOnly || uploading}
                      accept="image/*"
                    />
                    {formData.selfie && (
                      <p className="text-xs text-success mt-1">✓ Uploaded</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeLevel === 'L2' && (
              <>
                <ValidatedInput
                  id="occupation"
                  label="Occupation"
                  required
                  value={formData.occupation || ''}
                  onChange={(e) => handleFormChange('occupation', e.target.value)}
                  disabled={isReadOnly}
                  error={validationErrors.occupation}
                />

                <div className="space-y-2">
                  <Label htmlFor="source_of_funds" className="flex items-center gap-1">
                    Source of Funds
                    <span className="text-danger">*</span>
                  </Label>
                  <Select
                    value={formData.source_of_funds || ''}
                    onValueChange={(val) => handleFormChange('source_of_funds', val)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employment">Employment</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="inheritance">Inheritance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.source_of_funds && (
                    <p className="text-xs text-danger animate-in slide-in-from-top-1">
                      {validationErrors.source_of_funds}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Actions */}
        {!isReadOnly && (
          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              className="w-full h-12"
              disabled={uploading || !canSubmit}
            >
              {uploading ? 'Uploading...' : !canSubmit ? 'Complete all required fields' : `Submit ${activeLevel} for Review`}
            </Button>
          </div>
        )}

        {currentProfile?.status === 'approved' && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
            <p className="text-sm font-medium text-success text-center">
              ✓ {activeLevel} verification approved
            </p>
          </div>
        )}
      </div>
    </div>
  );
}