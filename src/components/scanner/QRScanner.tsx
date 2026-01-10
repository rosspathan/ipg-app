import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

export function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    startScanning();

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);

      // Initialize scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      // Start scanning with back camera
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText);
          stopScanning();
          onClose();
        },
        (errorMessage) => {
          // Error callback (usually means no QR code detected)
          // We don't show these errors as they're continuous
        }
      );
    } catch (err: any) {
      console.error('QR Scanner Error:', err);
      setError(err?.message || 'Failed to start camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setError('');

    try {
      // Create a temporary scanner instance for file scanning
      const tempScanner = new Html5Qrcode('qr-file-scanner');
      
      const decodedText = await tempScanner.scanFile(file, true);
      
      toast({
        title: "QR Code Detected",
        description: "Address extracted successfully",
      });
      
      onScan(decodedText);
      onClose();
    } catch (err: any) {
      console.error('File scan error:', err);
      toast({
        title: "No QR Code Found",
        description: "Could not detect a QR code in the selected image",
        variant: "destructive",
      });
    } finally {
      setIsProcessingFile(false);
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm">
      <div className="min-h-screen flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Scan QR Code</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 p-0 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Card className="w-full max-w-md border-2 border-primary/20 overflow-hidden">
            <CardContent className="p-0">
              <div id="qr-reader" className="w-full" />
              {/* Hidden element for file scanning */}
              <div id="qr-file-scanner" className="hidden" />
            </CardContent>
          </Card>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md w-full">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          <div className="text-center space-y-2 max-w-md">
            <p className="text-sm text-muted-foreground">
              Position the QR code within the frame
            </p>
            <p className="text-xs text-muted-foreground">
              The scanner will automatically detect the wallet address
            </p>
          </div>

          {/* Gallery Upload Option */}
          <div className="w-full max-w-md space-y-3 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            
            <Button
              variant="outline"
              onClick={handleGalleryClick}
              disabled={isProcessingFile}
              className="w-full gap-2"
            >
              <ImagePlus className="h-4 w-4" />
              {isProcessingFile ? 'Processing...' : 'Select from Gallery'}
            </Button>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Cancel Button */}
        <div className="pt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
            size="lg"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
