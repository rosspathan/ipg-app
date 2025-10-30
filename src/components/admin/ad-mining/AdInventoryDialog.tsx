import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ad } from "@/hooks/useAdInventory";

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

  const handleSubmit = () => {
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

          <div>
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/banner.jpg"
            />
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