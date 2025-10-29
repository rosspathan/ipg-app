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
      <div className={cn('relative bg-muted rounded-lg overflow-hidden touch-pan-x touch-pan-y', className)}>
        <div className="absolute top-2 right-2 z-10 flex gap-1 sm:gap-2">
          <Button size="icon" variant="secondary" onClick={zoomOut} className="h-8 w-8 sm:h-10 sm:w-10">
            <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button size="icon" variant="secondary" onClick={zoomIn} className="h-8 w-8 sm:h-10 sm:w-10">
            <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button size="icon" variant="secondary" onClick={() => setFullscreen(true)} className="h-8 w-8 sm:h-10 sm:w-10">
            <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button size="icon" variant="secondary" onClick={handleDownload} className="h-8 w-8 sm:h-10 sm:w-10">
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
        
        <div className="overflow-auto h-full flex items-center justify-center p-2 sm:p-4">
          <img
            src={imageUrl}
            alt={alt}
            style={{ transform: `scale(${zoom})` }}
            className="transition-transform duration-200 max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background/98 flex items-center justify-center p-2 sm:p-4">
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 sm:top-4 sm:right-4 h-10 w-10"
            onClick={() => setFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-[90vh] object-contain select-none"
            draggable={false}
          />
        </div>
      )}
    </>
  );
}
