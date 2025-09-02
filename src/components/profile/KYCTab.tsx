import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, User, Camera } from "lucide-react";
import { useKYC } from "@/hooks/useKYC";
import { useToast } from "@/hooks/use-toast";

interface KYCFormData {
  first_name: string;
  last_name: string;
  id_type: string;
  id_number: string;
}

export const KYCTab = () => {
  const { kycProfile, loading, uploading, submitKYC, uploadFile } = useKYC();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState({
    id_front: null as File | null,
    id_back: null as File | null,
    selfie: null as File | null
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<KYCFormData>({
    defaultValues: {
      first_name: kycProfile?.first_name || '',
      last_name: kycProfile?.last_name || '',
      id_type: kycProfile?.id_type || '',
      id_number: kycProfile?.id_number || '',
    }
  });

  const idType = watch('id_type');

  const handleFileChange = (type: 'id_front' | 'id_back' | 'selfie', file: File | null) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const onSubmit = async (data: KYCFormData) => {
    if (kycProfile?.status === 'pending') {
      toast({
        title: "Information",
        description: "Your KYC is already under review",
      });
      return;
    }

    if (!files.id_front || !files.id_back || !files.selfie) {
      toast({
        title: "Error",
        description: "Please upload all required documents",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload files
      const [idFrontUrl, idBackUrl, selfieUrl] = await Promise.all([
        uploadFile(files.id_front, 'id_front'),
        uploadFile(files.id_back, 'id_back'),
        uploadFile(files.selfie, 'selfie')
      ]);

      // Submit KYC
      await submitKYC({
        ...data,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
        selfie_url: selfieUrl
      });

    } catch (error) {
      // Error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const isFormDisabled = kycProfile?.status === 'pending' || kycProfile?.status === 'verified';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>KYC Verification</span>
            {kycProfile && getStatusBadge(kycProfile.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kycProfile?.status === 'verified' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800">
                Your identity has been verified successfully on {' '}
                {kycProfile.reviewed_at && new Date(kycProfile.reviewed_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {kycProfile?.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">
                Your KYC submission was rejected: {kycProfile.notes}
              </p>
              <p className="text-sm text-red-600 mt-1">Please resubmit with correct information</p>
            </div>
          )}

          {kycProfile?.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800">
                Your KYC documents are under review. This usually takes 1-3 business days.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  {...register("first_name", { required: "First name is required" })}
                  disabled={isFormDisabled}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  {...register("last_name", { required: "Last name is required" })}
                  disabled={isFormDisabled}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>ID Type</Label>
                <Select 
                  value={idType} 
                  onValueChange={(value) => setValue('id_type', value)}
                  disabled={isFormDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers">Driver's License</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_number">ID Number</Label>
                <Input
                  id="id_number"
                  {...register("id_number", { required: "ID number is required" })}
                  disabled={isFormDisabled}
                />
                {errors.id_number && (
                  <p className="text-sm text-destructive">{errors.id_number.message}</p>
                )}
              </div>
            </div>

            {!isFormDisabled && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Document Uploads</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>ID Front</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange('id_front', e.target.files?.[0] || null)}
                        className="hidden"
                        id="id_front"
                      />
                      <Label htmlFor="id_front" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Front
                          </span>
                        </Button>
                      </Label>
                      {files.id_front && (
                        <p className="text-sm text-green-600 mt-2">{files.id_front.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>ID Back</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange('id_back', e.target.files?.[0] || null)}
                        className="hidden"
                        id="id_back"
                      />
                      <Label htmlFor="id_back" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Back
                          </span>
                        </Button>
                      </Label>
                      {files.id_back && (
                        <p className="text-sm text-green-600 mt-2">{files.id_back.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Selfie</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange('selfie', e.target.files?.[0] || null)}
                        className="hidden"
                        id="selfie"
                      />
                      <Label htmlFor="selfie" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Camera className="h-4 w-4 mr-2" />
                            Upload Selfie
                          </span>
                        </Button>
                      </Label>
                      {files.selfie && (
                        <p className="text-sm text-green-600 mt-2">{files.selfie.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={submitting || uploading} className="w-full">
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
};