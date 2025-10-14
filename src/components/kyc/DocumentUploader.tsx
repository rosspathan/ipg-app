import { useRef, useState } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentUploaderProps {
  label: string;
  value?: string;
  onChange: (file: File) => Promise<void>;
  uploading?: boolean;
  required?: boolean;
  error?: string;
  accept?: string;
}

export function DocumentUploader({
  label,
  value,
  onChange,
  uploading,
  required,
  error,
  accept = 'image/*,.pdf'
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload JPG, PNG, or PDF files only');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview('PDF Document');
    }

    await onChange(file);
  };

  const handleRemove = () => {
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1 text-sm font-medium">
        {label}
        {required && <span className="text-danger">*</span>}
      </label>

      {preview ? (
        <div className="relative">
          {preview === 'PDF Document' ? (
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
              <span className="text-sm">PDF Document Uploaded</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt={label}
                className="w-full h-48 object-cover rounded-lg border border-border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            error ? "border-danger bg-danger/5" : "border-border hover:border-primary/50 bg-card/50",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
          />
          
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="flex items-center gap-4 mb-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center px-4">
                Click to upload or take a photo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, or PDF (max 5MB)
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-danger animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}
