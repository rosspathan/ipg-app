import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploaderProps {
  label: string;
  required?: boolean;
  accept?: string;
  maxSize?: number; // in bytes
  aspectRatio?: '16:9' | '1:1' | 'any';
  preview?: string;
  mediaType?: 'image' | 'video';
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  onDurationDetected?: (duration: number) => void;
  uploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  label,
  required = false,
  accept = 'image/*,video/*',
  maxSize = 52428800, // 50MB default
  aspectRatio = 'any',
  preview,
  mediaType = 'image',
  onFileSelect,
  onRemove,
  onDurationDetected,
  uploading = false,
  uploadProgress = 0,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    type: string;
    duration?: number;
    dimensions?: { width: number; height: number };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const validTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ];

  const validateFile = (file: File): string | null => {
    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Supported: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV';
    }
    if (file.size > maxSize) {
      return `File too large. Maximum size: ${formatFileSize(maxSize)}`;
    }
    return null;
  };

  const processFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const isVideo = file.type.startsWith('video/');
    
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Get video duration
    if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = video.duration;
        setFileInfo(prev => prev ? { ...prev, duration, dimensions: { width: video.videoWidth, height: video.videoHeight } } : null);
        onDurationDetected?.(duration);
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    } else {
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setFileInfo(prev => prev ? { ...prev, dimensions: { width: img.width, height: img.height } } : null);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    }

    onFileSelect(file);
  }, [maxSize, onFileSelect, onDurationDetected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleRemove = useCallback(() => {
    setFileInfo(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemove();
  }, [onRemove]);

  // Reset fileInfo when preview is cleared externally
  useEffect(() => {
    if (!preview) {
      setFileInfo(null);
    }
  }, [preview]);

  const isVideo = mediaType === 'video' || fileInfo?.type?.startsWith('video/');

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        {fileInfo && (
          <Badge variant="outline" className="gap-1 text-xs">
            {isVideo ? <VideoIcon className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
            {isVideo ? 'Video' : 'Image'}
          </Badge>
        )}
      </div>

      {/* Upload Zone */}
      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer",
            "bg-muted/20 hover:bg-muted/40",
            isDragOver && "border-primary bg-primary/10",
            error && "border-destructive bg-destructive/10",
            "transition-colors duration-200"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              isDragOver ? "bg-primary/20" : "bg-muted/50"
            )}>
              <Upload className={cn(
                "w-6 h-6",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDragOver ? 'Drop file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP, GIF, MP4, WEBM, MOV • Max {formatFileSize(maxSize)}
              </p>
              {aspectRatio !== 'any' && (
                <p className="text-xs text-muted-foreground">
                  Recommended: {aspectRatio} aspect ratio
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Preview Zone */
        <div className="relative border border-border rounded-xl overflow-hidden bg-muted/20">
          {/* Media Preview */}
          <div className="relative h-48">
            {isVideo ? (
              <video
                ref={videoRef}
                src={preview}
                className="w-full h-full object-cover"
                controls
                preload="metadata"
              />
            ) : (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Overlay gradient */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
            
            {/* Remove button */}
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* File info overlay */}
            {fileInfo && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    {formatFileSize(fileInfo.size)}
                  </span>
                  {fileInfo.dimensions && (
                    <span>
                      {fileInfo.dimensions.width}×{fileInfo.dimensions.height}
                    </span>
                  )}
                  {fileInfo.duration !== undefined && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(fileInfo.duration)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="p-3 bg-muted/50 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Uploading {fileInfo?.name ? `"${fileInfo.name.slice(0, 20)}${fileInfo.name.length > 20 ? '...' : ''}"` : '...'}
                </span>
                <span className="text-xs font-medium text-primary">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Success state after upload */}
          {!uploading && uploadProgress === 100 && (
            <div className="p-2 bg-green-500/10 border-t border-green-500/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-500">Upload complete</span>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* File name display when preview exists */}
      {preview && fileInfo && !uploading && (
        <p className="text-xs text-muted-foreground truncate">
          {fileInfo.name}
        </p>
      )}
    </div>
  );
};
