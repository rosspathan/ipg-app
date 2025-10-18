import { useRef, useState } from 'react';
import { Camera, Upload, X, Loader2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface DocumentUploaderProps {
  label: string;
  value?: string;
  onChange: (file: File) => Promise<void>;
  uploading?: boolean;
  uploadProgress?: number;
  required?: boolean;
  error?: string;
  accept?: string;
  isSelfie?: boolean;
  onCameraStart?: () => void;
  onCameraEnd?: () => void;
}

export function DocumentUploader({
  label,
  value,
  onChange,
  uploading,
  uploadProgress = 0,
  required,
  error,
  accept = 'image/*',
  isSelfie = false,
  onCameraStart,
  onCameraEnd
}: DocumentUploaderProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    onCameraEnd?.(); // End critical operation when file is selected or cancelled
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload JPG, PNG, WEBP, or HEIC images only');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Create preview for images
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    await onChange(file);
  };

  const handleRemove = () => {
    setPreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleCameraClick = () => {
    onCameraStart?.(); // Start critical operation before opening camera
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    onCameraStart?.(); // Start critical operation before opening gallery
    galleryInputRef.current?.click();
  };

  const captureAttribute = isSelfie ? 'user' : 'environment';

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1 text-sm font-medium">
        {label}
        {required && <span className="text-danger">*</span>}
      </label>

      {/* Upload Instructions */}
      {!preview && !uploading && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            {isSelfie 
              ? '📸 Take a clear selfie with your face fully visible' 
              : '📄 Capture all corners of your ID - ensure text is readable and no glare'}
          </p>
        </div>
      )}

      {preview && !uploading ? (
        <div className="relative">
          <div className="relative group">
            <img
              src={preview}
              alt={label}
              className="w-full h-56 object-cover rounded-lg border-2 border-border"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-success">
            <span className="w-2 h-2 bg-success rounded-full"></span>
            Uploaded successfully
          </div>
        </div>
      ) : uploading ? (
        <div className="relative flex flex-col items-center justify-center h-56 border-2 border-primary/50 rounded-lg bg-primary/5">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium mb-2">Uploading...</p>
          <div className="w-3/4">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center mt-2">
              {uploadProgress}% complete
            </p>
          </div>
          <p className="text-xs text-warning mt-3 font-medium">
            ⚠️ Do not close or navigate away
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept={accept}
            capture={captureAttribute}
            onChange={handleFileChange}
            disabled={uploading}
          />
          <input
            ref={galleryInputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
          />

          {/* Camera Button */}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-20 text-base border-2",
              error && "border-danger"
            )}
            onClick={handleCameraClick}
            disabled={uploading}
          >
            <Camera className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Take Photo</div>
              <div className="text-xs text-muted-foreground">
                {isSelfie ? 'Use front camera' : 'Use back camera'}
              </div>
            </div>
          </Button>

          {/* Gallery Button */}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-20 text-base border-2",
              error && "border-danger"
            )}
            onClick={handleGalleryClick}
            disabled={uploading}
          >
            <ImagePlus className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Choose from Gallery</div>
              <div className="text-xs text-muted-foreground">
                Select existing photo
              </div>
            </div>
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            JPG, PNG, WEBP (max 10MB)
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
          <p className="text-xs text-danger font-medium">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
