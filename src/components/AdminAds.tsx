import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Megaphone, Eye, Target, Image as ImageIcon, ExternalLink } from "lucide-react";

interface AdBanner {
  id: string;
  title: string;
  image_url: string;
  square_image_url?: string;
  target_url: string;
  reward_bsk: number;
  required_view_time: number;
  placement: string;
  start_at: string | null;
  end_at: string | null;
  max_impressions_per_user_per_day: number;
  status: string;
  created_at: string | null;
}

export const AdminAds = () => {
  const [ads, setAds] = useState<AdBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdBanner | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    square_image_url: "",
    target_url: "",
    reward_bsk: 0,
    required_view_time: 5,
    placement: "home_top",
    start_at: "",
    end_at: "",
    max_impressions_per_user_per_day: 3,
    status: "active",
  });
  const { toast } = useToast();

  const loadAds = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAds(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading ads",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      image_url: "",
      square_image_url: "",
      target_url: "",
      reward_bsk: 0,
      required_view_time: 5,
      placement: "home_top",
      start_at: "",
      end_at: "",
      max_impressions_per_user_per_day: 3,
      status: "active",
    });
    setEditingAd(null);
  };

  const handleEdit = (ad: AdBanner) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      image_url: ad.image_url,
      square_image_url: ad.square_image_url || "",
      target_url: ad.target_url,
      reward_bsk: ad.reward_bsk,
      required_view_time: ad.required_view_time,
      placement: ad.placement,
      start_at: ad.start_at ? new Date(ad.start_at).toISOString().slice(0, 16) : "",
      end_at: ad.end_at ? new Date(ad.end_at).toISOString().slice(0, 16) : "",
      max_impressions_per_user_per_day: ad.max_impressions_per_user_per_day,
      status: ad.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const adData = {
        title: formData.title,
        image_url: formData.image_url,
        square_image_url: formData.square_image_url || null,
        target_url: formData.target_url,
        reward_bsk: formData.reward_bsk,
        required_view_time: formData.required_view_time,
        placement: formData.placement,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        max_impressions_per_user_per_day: formData.max_impressions_per_user_per_day,
        status: formData.status,
      };

      let response;
      if (editingAd) {
        response = await supabase
          .from("ads")
          .update(adData)
          .eq("id", editingAd.id);
      } else {
        response = await supabase.from("ads").insert([adData]);
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Ad ${editingAd ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      loadAds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (ad: AdBanner) => {
    try {
      const newStatus = ad.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from("ads")
        .update({ status: newStatus })
        .eq("id", ad.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Ad ${newStatus === 'active' ? "activated" : "deactivated"} successfully`,
      });

      loadAds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (ad: AdBanner) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;

    try {
      const { error } = await supabase.from("ads").delete().eq("id", ad.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ad deleted successfully",
      });

      loadAds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? "default" : "secondary";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const isAdActive = (ad: AdBanner) => {
    if (ad.status !== 'active') return false;
    const now = new Date();
    const startDate = ad.start_at ? new Date(ad.start_at) : null;
    const endDate = ad.end_at ? new Date(ad.end_at) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return true;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading ads...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Ad Mining Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage ad campaigns and BSK reward settings
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Ad
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAd ? "Edit Ad" : "Create New Ad"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[600px] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="title">Ad Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Watch and Earn BSK"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Banner Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/banner.jpg"
                  />
                  {formData.image_url && (
                    <div className="mt-2 border rounded-lg p-2">
                      <img 
                        src={formData.image_url} 
                        alt="Banner preview" 
                        className="max-h-32 w-auto mx-auto rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="square_image_url">Square Image URL (optional)</Label>
                  <Input
                    id="square_image_url"
                    value={formData.square_image_url}
                    onChange={(e) => setFormData({ ...formData, square_image_url: e.target.value })}
                    placeholder="https://example.com/square.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_url">Target URL</Label>
                  <Input
                    id="target_url"
                    value={formData.target_url}
                    onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                    placeholder="https://example.com/landing"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reward_bsk">BSK Reward</Label>
                    <Input
                      id="reward_bsk"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.reward_bsk}
                      onChange={(e) => setFormData({ ...formData, reward_bsk: parseFloat(e.target.value) || 0 })}
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="required_view_time">View Time (seconds)</Label>
                    <Input
                      id="required_view_time"
                      type="number"
                      min="1"
                      max="60"
                      value={formData.required_view_time}
                      onChange={(e) => setFormData({ ...formData, required_view_time: parseInt(e.target.value) || 5 })}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="placement">Placement</Label>
                    <Select
                      value={formData.placement}
                      onValueChange={(value) => setFormData({ ...formData, placement: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select placement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home_top">Home Top</SelectItem>
                        <SelectItem value="programs">Programs Section</SelectItem>
                        <SelectItem value="trading">Trading Page</SelectItem>
                        <SelectItem value="wallet">Wallet Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_impressions">Max Views per User/Day</Label>
                    <Input
                      id="max_impressions"
                      type="number"
                      min="1"
                      max="20"
                      value={formData.max_impressions_per_user_per_day}
                      onChange={(e) => setFormData({ ...formData, max_impressions_per_user_per_day: parseInt(e.target.value) || 3 })}
                      placeholder="3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_at">Start Date (optional)</Label>
                    <Input
                      id="start_at"
                      type="datetime-local"
                      value={formData.start_at}
                      onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_at">End Date (optional)</Label>
                    <Input
                      id="end_at"
                      type="datetime-local"
                      value={formData.end_at}
                      onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingAd ? "Update" : "Create"} Ad
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {ads.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No ads found. Create your first ad to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => (
              <div key={ad.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-16 border rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                      {ad.image_url ? (
                        <img 
                          src={ad.image_url} 
                          alt={ad.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{ad.title}</h3>
                        <Badge variant={getStatusColor(ad.status)}>
                          {ad.status}
                        </Badge>
                        {isAdActive(ad) && (
                          <Badge variant="default" className="bg-green-500">
                            Live
                          </Badge>
                        )}
                        <Badge variant="outline">{ad.placement}</Badge>
                        <Badge variant="secondary">{ad.reward_bsk} BSK</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>View time: {ad.required_view_time}s</span>
                        <span>Max per user: {ad.max_impressions_per_user_per_day}/day</span>
                        <span>Created: {formatDate(ad.created_at)}</span>
                      </div>
                      {ad.target_url && (
                        <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate max-w-64">{ad.target_url}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ad.status === 'active'}
                      onCheckedChange={() => handleToggleActive(ad)}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ad)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(ad)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                  <div>
                    <span className="text-muted-foreground">Start: </span>
                    {formatDate(ad.start_at)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">End: </span>
                    {formatDate(ad.end_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};