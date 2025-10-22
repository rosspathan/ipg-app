import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKYCSimple } from '@/hooks/useKYCSimple';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia'];
const ID_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers_license', label: 'Drivers License' },
];

export default function KYCSubmissionSimple() {
  const navigate = useNavigate();
  const { submission, loading, uploading, saveForm, uploadDocument, submitForReview } = useKYCSimple();
  
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    nationality: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    id_type: 'aadhaar' as 'aadhaar' | 'passport' | 'national_id' | 'drivers_license',
    id_number: '',
    id_front_url: '',
    id_back_url: '',
    selfie_url: '',
  });

  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  // Load existing data
  useState(() => {
    if (submission) {
      setFormData({
        full_name: submission.full_name || '',
        date_of_birth: submission.date_of_birth || '',
        nationality: submission.nationality || '',
        phone: submission.phone || '',
        address_line1: submission.address_line1 || '',
        address_line2: submission.address_line2 || '',
        city: submission.city || '',
        state: submission.state || '',
        postal_code: submission.postal_code || '',
        country: submission.country || '',
        id_type: submission.id_type || 'aadhaar',
        id_number: submission.id_number || '',
        id_front_url: submission.id_front_url || '',
        id_back_url: submission.id_back_url || '',
        selfie_url: submission.selfie_url || '',
      });
    }
  });

  const handleFileUpload = async (file: File, type: 'id_front' | 'id_back' | 'selfie') => {
    const url = await uploadDocument(file, type);
    if (url) {
      setFormData(prev => ({ ...prev, [`${type}_url`]: url }));
    }
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!formData.full_name || formData.full_name.length < 2) errors.push('Valid full name required');
    if (!formData.date_of_birth) errors.push('Date of birth required');
    if (!formData.phone || formData.phone.length < 10) errors.push('Valid phone number required');
    if (!formData.address_line1 || formData.address_line1.length < 5) errors.push('Valid address required');
    if (!formData.city || formData.city.length < 2) errors.push('Valid city required');
    if (!formData.postal_code || formData.postal_code.length < 4) errors.push('Valid postal code required');
    if (!formData.country) errors.push('Country required');
    if (!formData.nationality) errors.push('Nationality required');
    if (!formData.id_number || formData.id_number.length < 5) errors.push('Valid ID number required');
    if (!formData.id_front_url) errors.push('ID front photo required');
    if (!formData.id_back_url) errors.push('ID back photo required');
    if (!formData.selfie_url) errors.push('Selfie photo required');

    // Age validation (18+)
    if (formData.date_of_birth) {
      const age = new Date().getFullYear() - new Date(formData.date_of_birth).getFullYear();
      if (age < 18) errors.push('You must be at least 18 years old');
    }

    return errors;
  };

  const handleSaveDraft = async () => {
    const success = await saveForm({ ...formData, status: 'draft' });
    if (success) toast.success('Draft saved');
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    const saved = await saveForm({ ...formData, status: 'draft' });
    if (saved) {
      const submitted = await submitForReview();
      if (submitted) {
        toast.success('KYC submitted successfully!');
        navigate('/profile');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isDisabled = submission?.status === 'submitted' || submission?.status === 'approved';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {submission?.status && (
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              submission.status === 'approved' ? 'bg-green-500/20 text-green-500' :
              submission.status === 'submitted' ? 'bg-blue-500/20 text-blue-500' :
              submission.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
              'bg-muted text-muted-foreground'
            }`}>
              {submission.status.toUpperCase()}
            </div>
          )}
        </div>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-2">KYC Verification</h1>
          <p className="text-sm text-muted-foreground mb-6">Complete all fields to verify your identity</p>

          {submission?.rejection_reason && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">Rejected</p>
                <p className="text-sm text-muted-foreground">{submission.rejection_reason}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Personal Information</h2>
              
              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="As per ID document"
                  disabled={isDisabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    disabled={isDisabled}
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="10 digits"
                    disabled={isDisabled}
                  />
                </div>
              </div>

              <div>
                <Label>Nationality</Label>
                <Select
                  value={formData.nationality}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, nationality: value }))}
                  disabled={isDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Address</h2>
              
              <div>
                <Label>Address Line 1</Label>
                <Input
                  value={formData.address_line1}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                  placeholder="Street address"
                  disabled={isDisabled}
                />
              </div>

              <div>
                <Label>Address Line 2 (Optional)</Label>
                <Input
                  value={formData.address_line2}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                  placeholder="Apartment, suite, etc."
                  disabled={isDisabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    disabled={isDisabled}
                  />
                </div>
                <div>
                  <Label>State/Province</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    disabled={isDisabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Postal Code</Label>
                  <Input
                    value={formData.postal_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                    disabled={isDisabled}
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                    disabled={isDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ID Document */}
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">ID Document</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID Type</Label>
                  <Select
                    value={formData.id_type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, id_type: value }))}
                    disabled={isDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ID Number</Label>
                  <Input
                    value={formData.id_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_number: e.target.value }))}
                    disabled={isDisabled}
                  />
                </div>
              </div>

              {/* Document Uploads */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>ID Front</Label>
                  <input
                    ref={idFrontRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'id_front')}
                    disabled={isDisabled}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-24"
                    onClick={() => idFrontRef.current?.click()}
                    disabled={isDisabled || uploading}
                  >
                    {formData.id_front_url ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                  </Button>
                </div>

                <div>
                  <Label>ID Back</Label>
                  <input
                    ref={idBackRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'id_back')}
                    disabled={isDisabled}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-24"
                    onClick={() => idBackRef.current?.click()}
                    disabled={isDisabled || uploading}
                  >
                    {formData.id_back_url ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                  </Button>
                </div>

                <div>
                  <Label>Selfie</Label>
                  <input
                    ref={selfieRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'selfie')}
                    disabled={isDisabled}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-24"
                    onClick={() => selfieRef.current?.click()}
                    disabled={isDisabled || uploading}
                  >
                    {formData.selfie_url ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isDisabled && (
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleSaveDraft} className="flex-1">
                  Save Draft
                </Button>
                <Button onClick={handleSubmit} className="flex-1">
                  Submit for Review
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
