import { useState, useCallback, useRef } from 'react';
import { Upload, X, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EnhancedDocumentUploaderProps {
  label: string;
  description: string;
  onUpload: (file: File) => Promise<void>;
  currentUrl?: string;
  accept?: string;
  maxSizeMB?: number;
  required?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_RETRIES = 2;

export function EnhancedDocumentUploader({
  label,
  description,
  onUpload,
  currentUrl,
  accept = 'image/*,.pdf',
  maxSizeMB = 10,
  required = false,
}: EnhancedDocumentUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload JPG, PNG, WEBP, or PDF files only';
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File size must be less than ${maxSizeMB}MB (yours: ${sizeMB.toFixed(1)}MB)`;
    }
    return null;
  };

  const handleFile = async (file: File, retryCount = 0) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(10);

    try {
      // Create preview immediately
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview('pdf');
      }

      setUploadProgress(30);

      // Upload with simulated progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 85));
      }, 300);

      await onUpload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success(`${label} uploaded successfully`);
    } catch (err: any) {
      console.error('Upload error:', err);
      
      if (retryCount < MAX_RETRIES) {
        toast.info(`Upload failed, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setUploadProgress(10);
        setTimeout(() => handleFile(file, retryCount + 1), 1000);
        return;
      }

      setPreview(null);
      const errorMsg = err?.message?.includes('Payload too large')
        ? 'File is too large. Please compress and try again.'
        : err?.message?.includes('authenticated')
        ? 'Please log in to upload documents.'
        : 'Upload failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      if (retryCount >= MAX_RETRIES || !error) {
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
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
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isUploaded = preview && !uploading && !error;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <p className="text-xs text-muted-foreground">{description}</p>

      {/* Upload Progress */}
      {uploading && uploadProgress > 0 && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Complete!'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <span>{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto text-destructive hover:text-destructive"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {isUploaded ? (
        <div className="relative rounded-lg border-2 border-primary/50 overflow-hidden bg-muted">
          {preview === 'pdf' ? (
            <div className="flex items-center justify-center h-48 bg-muted">
              <div className="text-center">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-sm text-muted-foreground">PDF Document</p>
              </div>
            </div>
          ) : (
            <img src={preview} alt={label} className="w-full h-48 object-contain" />
          )}
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
      ) : !uploading ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'relative rounded-lg border-2 border-dashed transition-colors cursor-pointer',
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            error ? 'border-destructive/50' : 'hover:border-primary/50'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="mb-3 p-3 rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">
              Tap to upload or drag & drop
            </p>
            <p className="text-xs text-muted-foreground">
              Max {maxSizeMB}MB • JPG, PNG, WEBP, PDF
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 py-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Uploading document...</p>
        </div>
      )}
    </div>
  );
}
