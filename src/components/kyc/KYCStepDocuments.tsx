import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Shield, ChevronLeft, AlertCircle } from "lucide-react";
import { EnhancedDocumentUploader } from './EnhancedDocumentUploader';
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const documentsSchema = z.object({
  id_type: z.enum(["passport", "national_id", "drivers_license", "aadhaar", "pan_card"]),
  id_number: z.string().min(5, "ID number must be at least 5 characters"),
  id_front_url: z.string().min(1, "Please upload ID front photo"),
  id_back_url: z.string().min(1, "Please upload ID back photo"),
  selfie_url: z.string().min(1, "Please upload a selfie"),
});

type DocumentsData = z.infer<typeof documentsSchema>;

interface KYCStepDocumentsProps {
  initialData: Partial<DocumentsData>;
  onNext: (data: DocumentsData) => void;
  onBack: () => void;
  onUpload: (file: File, type: 'id_front' | 'id_back' | 'selfie') => Promise<string | null>;
  uploading: boolean;
}

export const KYCStepDocuments = ({ initialData, onNext, onBack, onUpload, uploading }: KYCStepDocumentsProps) => {
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  
  const form = useForm<DocumentsData>({
    resolver: zodResolver(documentsSchema),
    defaultValues: {
      id_type: initialData.id_type || undefined,
      id_number: initialData.id_number || '',
      id_front_url: initialData.id_front_url || '',
      id_back_url: initialData.id_back_url || '',
      selfie_url: initialData.selfie_url || '',
    },
  });

  const idFrontUrl = form.watch('id_front_url');
  const idBackUrl = form.watch('id_back_url');
  const selfieUrl = form.watch('selfie_url');

  const allDocsUploaded = !!idFrontUrl && !!idBackUrl && !!selfieUrl;

  const handleFileUpload = async (file: File, type: 'id_front' | 'id_back' | 'selfie', fieldName: keyof DocumentsData) => {
    try {
      setUploadErrors(prev => ({ ...prev, [type]: '' }));
      const url = await onUpload(file, type);
      if (url) {
        form.setValue(fieldName, url, { shouldValidate: true });
        form.clearErrors(fieldName);
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Upload failed';
      setUploadErrors(prev => ({ ...prev, [type]: errorMsg }));
      form.setValue(fieldName, '', { shouldValidate: false });
    }
  };

  const handleSubmit = (data: DocumentsData) => {
    // Final check that all docs are uploaded
    if (!data.id_front_url || !data.id_back_url || !data.selfie_url) {
      if (!data.id_front_url) form.setError('id_front_url', { message: 'Please upload ID front photo' });
      if (!data.id_back_url) form.setError('id_back_url', { message: 'Please upload ID back photo' });
      if (!data.selfie_url) form.setError('selfie_url', { message: 'Please upload a selfie' });
      return;
    }
    onNext(data);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Identity Verification</h2>
        <p className="text-muted-foreground">Upload clear, high-quality photos of your documents</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="id_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Type <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                    <SelectItem value="pan_card">PAN Card</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="national_id">National ID Card</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="id_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Number <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your document number" 
                    className="h-12 text-base"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-5">
            <FormField
              control={form.control}
              name="id_front_url"
              render={({ field }) => (
                <FormItem>
                  <EnhancedDocumentUploader
                    label="ID Front Photo"
                    description="Upload a clear photo of the front side of your ID"
                    onUpload={async (file) => handleFileUpload(file, 'id_front', 'id_front_url')}
                    currentUrl={field.value || undefined}
                    maxSizeMB={10}
                    required
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="id_back_url"
              render={({ field }) => (
                <FormItem>
                  <EnhancedDocumentUploader
                    label="ID Back Photo"
                    description="Upload a clear photo of the back side of your ID"
                    onUpload={async (file) => handleFileUpload(file, 'id_back', 'id_back_url')}
                    currentUrl={field.value || undefined}
                    maxSizeMB={10}
                    required
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selfie_url"
              render={({ field }) => (
                <FormItem>
                  <EnhancedDocumentUploader
                    label="Selfie Photo"
                    description="Take a clear selfie holding your ID next to your face"
                    onUpload={async (file) => handleFileUpload(file, 'selfie', 'selfie_url')}
                    currentUrl={field.value || undefined}
                    maxSizeMB={10}
                    required
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {!allDocsUploaded && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                All three documents (ID Front, ID Back, and Selfie) must be uploaded before you can proceed.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              📸 <strong>Tips for clear photos:</strong>
              <br />• Ensure all corners of your ID are visible
              <br />• Good lighting, no glare or shadows
              <br />• Text must be readable
              <br />• Face fully visible in selfie
              <br />• Max file size: 10MB per document
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              size="lg" 
              onClick={onBack}
              className="h-12"
              disabled={uploading}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              type="submit" 
              size="lg" 
              className="flex-1 h-12 text-base"
              disabled={uploading || !allDocsUploaded}
            >
              {uploading ? "Uploading..." : !allDocsUploaded ? "Upload all documents first" : "Review & Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
