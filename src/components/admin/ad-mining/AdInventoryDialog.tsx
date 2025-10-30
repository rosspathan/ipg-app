import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ad } from "@/hooks/useAdInventory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Image as ImageIcon } from "lucide-react";

interface AdInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad?: Ad | null;
  onSave: (data: Partial<Ad>) => void;
}

export function AdInventoryDialog({ open, onOpenChange, ad, onSave }: AdInventoryDialogProps) {
  const [formData, setFormData] = useState({
    title: ad?.title || "",
    description: ad?.description || "",
    image_url: ad?.image_url || "",
    target_url: ad?.target_url || "",
    reward_per_view: ad?.reward_per_view || 0,
    reward_per_click: ad?.reward_per_click || 0,
    budget_total: ad?.budget_total || 0,
  });
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(ad?.image_url || "");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ad-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('ad-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: data.publicUrl });
      setImagePreview(data.publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.image_url) {
      toast.error('Title and image are required');
      return;
    }
    onSave(ad ? { id: ad.id, ...formData } : formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ad ? "Edit Ad" : "Create New Ad"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Summer Sale Campaign"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the ad"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Ad Image</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('ad-image-upload')?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
              <input
                id="ad-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {imagePreview && (
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">Image uploaded</span>
                </div>
              )}
            </div>
            {imagePreview && (
              <div className="mt-2 p-2 border border-border rounded-lg">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Max 5MB • JPG, PNG, WebP, GIF
            </p>
          </div>

          <div>
            <Label htmlFor="target_url">Target URL</Label>
            <Input
              id="target_url"
              value={formData.target_url}
              onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
              placeholder="https://example.com/landing"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reward_per_view">Reward per View (BSK)</Label>
              <Input
                id="reward_per_view"
                type="number"
                value={formData.reward_per_view}
                onChange={(e) => setFormData({ ...formData, reward_per_view: parseFloat(e.target.value) || 0 })}
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="reward_per_click">Reward per Click (BSK)</Label>
              <Input
                id="reward_per_click"
                type="number"
                value={formData.reward_per_click}
                onChange={(e) => setFormData({ ...formData, reward_per_click: parseFloat(e.target.value) || 0 })}
                step="0.1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="budget_total">Total Budget (BSK)</Label>
            <Input
              id="budget_total"
              type="number"
              value={formData.budget_total}
              onChange={(e) => setFormData({ ...formData, budget_total: parseFloat(e.target.value) || 0 })}
              step="100"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {ad ? "Update Ad" : "Create Ad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}