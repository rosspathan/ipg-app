import { FC, useRef, ChangeEvent } from 'react';
import { Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProfileAvatarUploaderProps {
  avatarUrl?: string;
  displayName: string;
  uploading?: boolean;
  onUpload: (file: File) => Promise<void>;
  className?: string;
}

export const ProfileAvatarUploader: FC<ProfileAvatarUploaderProps> = ({
  avatarUrl,
  displayName,
  uploading = false,
  onUpload,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    await onUpload(file);
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)} data-testid="avatar-uploader">
      <div className="relative">
        <Avatar className="h-32 w-32 border-4 border-primary/20">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary text-4xl font-bold">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "absolute bottom-0 right-0 p-2 rounded-full",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {uploading ? (
            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Best results: 1024×1024px, JPG/PNG
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Change Photo'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
