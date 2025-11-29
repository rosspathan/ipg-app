import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Shield, ChevronLeft } from "lucide-react";
import { EnhancedDocumentUploader } from './EnhancedDocumentUploader';
import { useState } from "react";

const documentsSchema = z.object({
  id_type: z.enum(["passport", "national_id", "drivers_license", "aadhaar"]),
  id_number: z.string().min(5, "ID number is required"),
  id_front_url: z.string().url("Please upload ID front"),
  id_back_url: z.string().url("Please upload ID back"),
  selfie_url: z.string().url("Please upload selfie"),
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
  const [uploadStatus, setUploadStatus] = useState<Record<string, boolean>>({});
  
  const form = useForm<DocumentsData>({
    resolver: zodResolver(documentsSchema),
    defaultValues: initialData,
  });

  const handleFileUpload = async (file: File, type: 'id_front' | 'id_back' | 'selfie', field: any) => {
    const url = await onUpload(file, type);
    if (url) {
      field.onChange(url);
      setUploadStatus(prev => ({ ...prev, [type]: true }));
    }
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
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField
            control={form.control}
            name="id_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="national_id">National ID Card</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
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
                <FormLabel>Document Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your ID number" 
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
                    description="Upload clear photo of the front side of your ID"
                    onUpload={async (file) => handleFileUpload(file, 'id_front', field)}
                    currentUrl={field.value}
                    maxSizeMB={5}
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
                    description="Upload clear photo of the back side of your ID"
                    onUpload={async (file) => handleFileUpload(file, 'id_back', field)}
                    currentUrl={field.value}
                    maxSizeMB={5}
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
                    onUpload={async (file) => handleFileUpload(file, 'selfie', field)}
                    currentUrl={field.value}
                    maxSizeMB={5}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              📸 <strong>Tips for clear photos:</strong>
              <br />• Ensure all corners are visible
              <br />• Good lighting, no glare
              <br />• Text must be readable
              <br />• Face fully visible in selfie
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
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Review & Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
