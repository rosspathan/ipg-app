import { useState } from 'react';
import { Download, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageViewerProps {
  imageUrl: string;
  alt: string;
  className?: string;
}

export function ImageViewer({ imageUrl, alt, className }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kyc-document-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  return (
    <>
      <div className={cn('relative bg-muted rounded-lg overflow-hidden', className)}>
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button size="icon" variant="secondary" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" onClick={() => setFullscreen(true)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="overflow-auto h-full flex items-center justify-center p-4">
          <img
            src={imageUrl}
            alt={alt}
            style={{ transform: `scale(${zoom})` }}
            className="transition-transform duration-200 max-w-full max-h-full object-contain"
          />
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4"
            onClick={() => setFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}
