import { useState } from "react";
import { useProgramMedia } from "@/hooks/useProgramMedia";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Image as ImageIcon, Film, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VisualTabProps {
  moduleId: string;
}

export function VisualTab({ moduleId }: VisualTabProps) {
  const { media, createMedia, deleteMedia } = useProgramMedia(moduleId);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState<string>("icon");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, mediaType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${moduleId}/${mediaType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('program-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('program-assets')
        .getPublicUrl(fileName);

      // Create media record
      createMedia({
        module_id: moduleId,
        media_type: mediaType as any,
        file_path: fileName,
        file_url: publicUrl,
        alt_text: file.name,
        display_order: media?.length || 0
      });

      toast({ title: "Media uploaded successfully" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const mediaByType = media?.reduce((acc, item) => {
    if (!acc[item.media_type]) acc[item.media_type] = [];
    acc[item.media_type].push(item);
    return acc;
  }, {} as Record<string, typeof media>);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Upload Media</h3>
        <div className="space-y-4">
          <div>
            <Label>Media Type</Label>
            <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="icon">Icon</SelectItem>
                <SelectItem value="banner">Banner</SelectItem>
                <SelectItem value="thumbnail">Thumbnail</SelectItem>
                <SelectItem value="screenshot">Screenshot</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Click to upload {selectedMediaType}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP, MP4 (max 10MB)
                </p>
              </div>
              <Input
                id="file-upload"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(e, selectedMediaType)}
                disabled={uploading}
                className="hidden"
              />
            </Label>
          </div>
        </div>
      </Card>

      {/* Media Gallery by Type */}
      {Object.entries(mediaByType || {}).map(([type, items]) => (
        <Card key={type} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold capitalize">{type}s</h3>
            <Badge>{items.length}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  {item.media_type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="h-12 w-12 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={item.file_url || ''}
                      alt={item.alt_text || ''}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(item.file_url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMedia(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {item.alt_text}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {(!media || media.length === 0) && (
        <Card className="p-12 text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No media uploaded yet</p>
          <p className="text-sm text-muted-foreground">Upload icons, banners, and screenshots above</p>
        </Card>
      )}
    </div>
  );
}
