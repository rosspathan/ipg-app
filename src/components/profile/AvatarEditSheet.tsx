import { FC, useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Camera, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAvatar } from '@/hooks/useAvatar';
import { useDisplayName } from '@/hooks/useDisplayName';

interface AvatarEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AvatarEditSheet: FC<AvatarEditSheetProps> = ({ open, onOpenChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { avatar, uploading, uploadAvatar, getAvatarUrl } = useAvatar();
  const displayName = useDisplayName();
  const avatarUrl = getAvatarUrl('3x');

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      await uploadAvatar(file);
      // Keep sheet open to show success
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRemove = () => {
    // TODO: Implement avatar removal
    console.log('Remove avatar');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className={cn(
          "h-[85vh] max-w-md mx-auto left-0 right-0",
          "rounded-t-3xl border-t-2 border-border/20",
          "bg-gradient-to-b from-background/95 to-background"
        )}
      >
        {/* Drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/30 rounded-full" />
        
        <SheetHeader className="pb-6 pt-8">
          <SheetTitle className="text-2xl font-bold">Profile Picture</SheetTitle>
          <SheetDescription className="text-sm">
            Upload a professional photo to personalize your account
          </SheetDescription>
        </SheetHeader>
        
        <div className="overflow-y-auto pb-8 space-y-6">
          {/* Large Avatar Preview */}
          <div className="flex flex-col items-center py-4">
            <Avatar className="h-40 w-40 border-4 border-primary/20 ring-4 ring-primary/10">
              <AvatarImage src={avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-5xl font-bold">
                {displayName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full border-2 border-dashed rounded-2xl p-8 transition-all duration-200",
              "cursor-pointer hover:border-primary/40 hover:bg-primary/5",
              isDragging ? "border-primary/60 bg-primary/10" : "border-border/40"
            )}
          >
            <div className="text-center space-y-3">
              {uploading ? (
                <>
                  <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
                  <div>
                    <p className="text-sm font-medium">Uploading...</p>
                    <p className="text-xs text-muted-foreground">Please wait</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-sm font-medium">Drop your photo here</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Recommended:</span> 1024×1024px
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max 5MB • JPG, PNG, WEBP
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Action Buttons */}
          <div className="flex gap-3 w-full pt-4">
            {avatarUrl && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleRemove}
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
            <Button 
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              {avatarUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>
          </div>
          
          {/* Tips Section */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground">Tips for a great photo:</p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Use a clear, well-lit photo of your face</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Center yourself in the frame</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Avoid busy backgrounds or filters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Square images (1:1 ratio) work best</span>
              </li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
