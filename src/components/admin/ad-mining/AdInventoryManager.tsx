import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Image, Trash2, Edit } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdInventory } from "@/hooks/useAdInventory";
import { AdInventoryDialog } from "./AdInventoryDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AdInventoryManager() {
  const isMobile = useIsMobile();
  const { ads, isLoading, createAd, updateAd, deleteAd, toggleAdStatus } = useAdInventory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading ads...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ad Inventory</CardTitle>
              <Button size={isMobile ? "sm" : "default"} onClick={() => {
                setSelectedAd(null);
                setDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Ad
              </Button>
            </div>
          </CardHeader>
        <CardContent className="space-y-4">
          {/* Ad List */}
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="flex items-center gap-4 p-4 border border-border rounded-lg"
            >
              {/* Ad Image */}
              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center shrink-0">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>

              {/* Ad Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">{ad.title}</h4>
                  <Badge
                    variant={ad.status === "active" ? "default" : "secondary"}
                  >
                    {ad.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {ad.target_url}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{ad.impressions.toLocaleString()} views</span>
                  <span>{ad.clicks.toLocaleString()} clicks</span>
                  <span>
                    {((ad.clicks / ad.impressions) * 100).toFixed(1)}% CTR
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => {
                  setSelectedAd(ad);
                  setDialogOpen(true);
                }}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setAdToDelete(ad.id);
                  setDeleteDialogOpen(true);
                }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {ads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No ads in inventory</p>
              <p className="text-xs mt-1">Click "Add Ad" to create your first ad</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    <AdInventoryDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      ad={selectedAd}
      onSave={(data) => {
        if (selectedAd) {
          updateAd({ ...data, id: selectedAd.id });
        } else {
          createAd(data);
        }
      }}
    />

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this ad and all its data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            if (adToDelete) deleteAd(adToDelete);
            setDeleteDialogOpen(false);
          }}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
