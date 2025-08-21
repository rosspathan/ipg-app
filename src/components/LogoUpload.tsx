import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { useAssetLogos } from '@/hooks/useAssetLogos';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface LogoUploadProps {
  assetSymbol: string;
  currentLogo?: string | null;
  onLogoUpdate: (filePath: string | null) => void;
  className?: string;
}

const LogoUpload: React.FC<LogoUploadProps> = ({
  assetSymbol,
  currentLogo,
  onLogoUpdate,
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { uploadLogo, deleteLogo, getLogoUrl, uploading } = useAssetLogos();

  const handleFileSelect = async (file: File) => {
    const filePath = await uploadLogo(file, assetSymbol);
    if (filePath) {
      onLogoUpdate(filePath);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (currentLogo) {
      const success = await deleteLogo(currentLogo);
      if (success) {
        onLogoUpdate(null);
      }
    }
  };

  const logoUrl = getLogoUrl(currentLogo);

  return (
    <div className={className}>
      <Label className="text-sm font-medium">Logo</Label>
      
      <div className="space-y-3 mt-2">
        {/* Current Logo Preview */}
        {currentLogo && (
          <Card className="relative">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt={`${assetSymbol} logo`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<ImageIcon className="w-6 h-6 text-muted-foreground" />';
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Current Logo</p>
                    <p className="text-xs text-muted-foreground truncate max-w-40">
                      {currentLogo}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Area */}
        <Card
          className={`border-dashed border-2 transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag & drop or click to browse<br />
              Supports: JPEG, PNG, GIF, WebP, SVG (max 5MB)
            </p>
          </CardContent>
        </Card>

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploading}
        />
      </div>
    </div>
  );
};

export default LogoUpload;