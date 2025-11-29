import { useState, useCallback } from 'react';
import { Upload, Camera, X, RotateCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EnhancedDocumentUploaderProps {
  label: string;
  description: string;
  onUpload: (file: File) => Promise<void>;
  currentUrl?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function EnhancedDocumentUploader({
  label,
  description,
  onUpload,
  currentUrl,
  accept = 'image/*',
  maxSizeMB = 5,
}: EnhancedDocumentUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return false;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      await onUpload(file);
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <p className="text-xs text-muted-foreground">{description}</p>

      {preview ? (
        <div className="relative rounded-lg border-2 border-dashed border-primary/50 overflow-hidden bg-muted">
          <img src={preview} alt={label} className="w-full h-48 object-contain" />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-background/90 backdrop-blur"
              onClick={clearPreview}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute bottom-2 left-2 bg-primary/90 backdrop-blur text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1">
            <Check className="h-3 w-3" />
            Uploaded
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'relative rounded-lg border-2 border-dashed transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            'hover:border-primary/50'
          )}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={uploading}
          />
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="mb-3 p-3 rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">
              {uploading ? 'Uploading...' : 'Drop file here or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground">
              Max size: {maxSizeMB}MB • Formats: JPG, PNG, PDF
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
