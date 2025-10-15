import { useState } from "react";
import { Image, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgramAssets } from "@/hooks/useProgramAssets";
import { useToast } from "@/hooks/use-toast";

interface MediaGalleryProps {
  moduleId?: string;
  images?: string[];
  onChange: (images: string[]) => void;
}

export function MediaGallery({ moduleId, images = [], onChange }: MediaGalleryProps) {
  const { uploadAsset, deleteAsset, uploading } = useProgramAssets(moduleId);
  const { toast } = useToast();
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadAsset(file, 'screenshot');
    if (result) {
      onChange([...images, result.url]);
    }
    e.target.value = '';
  };

  const handleDelete = async (index: number, url: string) => {
    setDeletingIndex(index);
    
    // Extract path from URL
    const path = url.split('/').slice(-2).join('/');
    const success = await deleteAsset(path);
    
    if (success) {
      onChange(images.filter((_, i) => i !== index));
    }
    
    setDeletingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Media Gallery</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => document.getElementById('media-upload')?.click()}
          disabled={uploading || !moduleId}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Media
            </>
          )}
        </Button>
        <input
          id="media-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading || !moduleId}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Upload Zone */}
        <button
          onClick={() => document.getElementById('media-upload')?.click()}
          disabled={uploading || !moduleId}
          className="aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Image className="w-6 h-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {!moduleId ? 'Save first' : 'Upload image'}
          </p>
        </button>

        {/* Existing Images */}
        {images.map((url, index) => (
          <div
            key={index}
            className="aspect-video relative group rounded-lg overflow-hidden border"
          >
            <img
              src={url}
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(index, url)}
                disabled={deletingIndex === index}
              >
                {deletingIndex === index ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No media added yet. Click "Add Media" to upload images.
        </p>
      )}
    </div>
  );
}
