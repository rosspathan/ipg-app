import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Maximize2, 
  FileImage, 
  User, 
  CreditCard,
  CheckCircle,
  XCircle,
  RotateCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KYCDocumentViewerProps {
  dataJson: Record<string, any>;
  className?: string;
}

interface DocumentPreviewProps {
  url: string | null;
  alt: string;
  label: string;
  icon: React.ReactNode;
}

function DocumentPreview({ url, alt, label, icon }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleDownload = async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${alt.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-muted/50 rounded-lg border border-dashed border-border">
        <div className="rounded-full bg-muted p-4 mb-3">
          {icon}
        </div>
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <Badge variant="outline" className="mt-2 text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          Not Uploaded
        </Badge>
      </div>
    );
  }

  const ImageComponent = () => (
    <div className="relative overflow-hidden bg-black/5 dark:bg-white/5 rounded-lg">
      <div 
        className="overflow-auto max-h-[500px] flex items-center justify-center p-4"
        style={{ minHeight: '400px' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        {error ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <XCircle className="h-12 w-12 mb-2" />
            <p>Failed to load image</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(false)}>
              Retry
            </Button>
          </div>
        ) : (
          <img
            src={url}
            alt={alt}
            className={cn(
              "max-w-full object-contain transition-transform duration-200",
              loading ? "opacity-0" : "opacity-100"
            )}
            style={{ 
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              maxHeight: fullscreen ? '80vh' : '450px'
            }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          disabled={zoom <= 0.5}
          className="h-8 w-8"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setZoom(z => Math.min(3, z + 0.25))}
          disabled={zoom >= 3}
          className="h-8 w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setRotation(r => r + 90)}
          className="h-8 w-8"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetView}
          className="h-8 w-8"
        >
          <span className="text-xs font-medium">Reset</span>
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          className="h-8 w-8"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setFullscreen(true)}
          className="h-8 w-8"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Status indicator */}
      <Badge className="absolute top-4 right-4 bg-emerald-500/90">
        <CheckCircle className="h-3 w-3 mr-1" />
        Uploaded
      </Badge>
    </div>
  );

  return (
    <>
      <ImageComponent />
      
      {/* Fullscreen modal */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <ImageComponent />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function KYCDocumentViewer({ dataJson, className }: KYCDocumentViewerProps) {
  // Extract document URLs from various possible locations in data_json
  const idFrontUrl = dataJson?.id_front_url || dataJson?.documents?.id_front || null;
  const idBackUrl = dataJson?.id_back_url || dataJson?.documents?.id_back || null;
  const selfieUrl = dataJson?.selfie_url || dataJson?.documents?.selfie || null;
  const addressProofUrl = dataJson?.address_proof_url || dataJson?.documents?.address_proof || null;

  // Count uploaded documents
  const uploadedCount = [idFrontUrl, idBackUrl, selfieUrl, addressProofUrl].filter(Boolean).length;
  const totalDocs = 4;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Uploaded Documents
          </CardTitle>
          <Badge variant="outline">
            {uploadedCount} / {totalDocs} uploaded
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="id_front" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="id_front" className="text-xs sm:text-sm">
              <CreditCard className="h-3 w-3 mr-1 hidden sm:inline" />
              ID Front
            </TabsTrigger>
            <TabsTrigger value="id_back" className="text-xs sm:text-sm">
              <CreditCard className="h-3 w-3 mr-1 hidden sm:inline" />
              ID Back
            </TabsTrigger>
            <TabsTrigger value="selfie" className="text-xs sm:text-sm">
              <User className="h-3 w-3 mr-1 hidden sm:inline" />
              Selfie
            </TabsTrigger>
            <TabsTrigger value="address" className="text-xs sm:text-sm">
              <FileImage className="h-3 w-3 mr-1 hidden sm:inline" />
              Address
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="id_front">
            <DocumentPreview
              url={idFrontUrl}
              alt="ID Document Front"
              label="ID Front"
              icon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
            />
          </TabsContent>
          
          <TabsContent value="id_back">
            <DocumentPreview
              url={idBackUrl}
              alt="ID Document Back"
              label="ID Back"
              icon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
            />
          </TabsContent>
          
          <TabsContent value="selfie">
            <DocumentPreview
              url={selfieUrl}
              alt="Selfie Photo"
              label="Selfie"
              icon={<User className="h-8 w-8 text-muted-foreground" />}
            />
          </TabsContent>
          
          <TabsContent value="address">
            <DocumentPreview
              url={addressProofUrl}
              alt="Address Proof"
              label="Address Proof"
              icon={<FileImage className="h-8 w-8 text-muted-foreground" />}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
