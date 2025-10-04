import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, CheckCircle, XCircle, Clock } from "lucide-react";
import { useKYCNew } from "@/hooks/useKYCNew";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const KYC_LEVELS = [
  { id: 'L0', name: 'Basic', description: 'Personal info & address' },
  { id: 'L1', name: 'Identity', description: 'Government ID & selfie' },
  { id: 'L2', name: 'Enhanced', description: 'Source of funds' }
];

export function KYCPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profiles, config, uploadDocument, updateKYCLevel, submitKYCLevel, loading, uploading } = useKYCNew();
  const [activeLevel, setActiveLevel] = useState<'L0' | 'L1' | 'L2'>('L0');
  const [formData, setFormData] = useState<Record<string, any>>({});

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

  const handleSubmit = async () => {
    try {
      await updateKYCLevel(activeLevel, formData, 'draft');
      await submitKYCLevel(activeLevel);
      toast({ title: "Success", description: `KYC Level ${activeLevel} submitted for review` });
    } catch (error) {
      // Error handled in hook
    }
  };

  const currentProfile = profiles[activeLevel];
  const isReadOnly = ['submitted', 'in_review', 'approved'].includes(currentProfile?.status || '');

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
            
            {currentProfile.rejection_reason && (
              <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="text-sm font-medium text-danger mb-1">Rejection Reason</p>
                <p className="text-xs text-foreground">{currentProfile.rejection_reason}</p>
              </div>
            )}
          </Card>
        )}

        {/* Form */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <div className="space-y-4">
            {activeLevel === 'L0' && (
              <>
                <div>
                  <Label htmlFor="legal_name">Legal Name *</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                    disabled={isReadOnly}
                    placeholder="Full legal name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Select
                    value={formData.nationality || ''}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, nationality: val }))}
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
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={isReadOnly}
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="postal_code">Postal Code *</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>
              </>
            )}

            {activeLevel === 'L1' && (
              <>
                <div>
                  <Label htmlFor="id_type">ID Type *</Label>
                  <Select
                    value={formData.id_type || ''}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, id_type: val }))}
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
                </div>

                <div>
                  <Label htmlFor="id_number">ID Number *</Label>
                  <Input
                    id="id_number"
                    value={formData.id_number || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_number: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>

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
                <div>
                  <Label htmlFor="source_of_funds">Source of Funds *</Label>
                  <Select
                    value={formData.source_of_funds || ''}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, source_of_funds: val }))}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employment">Employment</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="occupation">Occupation *</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                    disabled={isReadOnly}
                  />
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
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : `Submit ${activeLevel} for Review`}
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