import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Megaphone, Eye, MousePointer, Calendar, Target, Image as ImageIcon, ExternalLink } from "lucide-react";

interface AdBanner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  target_audience: string | null;
  placement: string;
  start_date: string | null;
  end_date: string | null;
  impressions: number | null;
  clicks: number | null;
  active: boolean | null;
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
    link_url: "",
    target_audience: "all",
    placement: "",
    start_date: "",
    end_date: "",
    active: true,
  });
  const { toast } = useToast();

  const loadAds = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("ads_banners")
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
      link_url: "",
      target_audience: "all",
      placement: "",
      start_date: "",
      end_date: "",
      active: true,
    });
    setEditingAd(null);
  };

  const handleEdit = (ad: AdBanner) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      image_url: ad.image_url,
      link_url: ad.link_url || "",
      target_audience: ad.target_audience || "all",
      placement: ad.placement,
      start_date: ad.start_date ? new Date(ad.start_date).toISOString().slice(0, 16) : "",
      end_date: ad.end_date ? new Date(ad.end_date).toISOString().slice(0, 16) : "",
      active: ad.active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const adData = {
        title: formData.title,
        image_url: formData.image_url,
        link_url: formData.link_url || null,
        target_audience: formData.target_audience,
        placement: formData.placement,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        active: formData.active,
      };

      let response;
      if (editingAd) {
        response = await supabase
          .from("ads_banners")
          .update(adData)
          .eq("id", editingAd.id);

        // Log the admin action
        await supabase.rpc("log_admin_action", {
          p_action: "update_ad_banner",
          p_resource_type: "ads_banners",
          p_resource_id: editingAd.id,
          p_old_values: JSON.parse(JSON.stringify(editingAd)),
          p_new_values: JSON.parse(JSON.stringify({ ...editingAd, ...adData })),
        });
      } else {
        response = await supabase.from("ads_banners").insert([adData]);

        // Log the admin action
        await supabase.rpc("log_admin_action", {
          p_action: "create_ad_banner",
          p_resource_type: "ads_banners",
          p_new_values: JSON.parse(JSON.stringify(adData)),
        });
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Ad banner ${editingAd ? "updated" : "created"} successfully`,
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
      const { error } = await supabase
        .from("ads_banners")
        .update({ active: !ad.active })
        .eq("id", ad.id);

      if (error) throw error;

      // Log the admin action
      await supabase.rpc("log_admin_action", {
        p_action: ad.active ? "deactivate_ad_banner" : "activate_ad_banner",
        p_resource_type: "ads_banners",
        p_resource_id: ad.id,
        p_old_values: JSON.parse(JSON.stringify(ad)),
        p_new_values: JSON.parse(JSON.stringify({ ...ad, active: !ad.active })),
      });

      toast({
        title: "Success",
        description: `Ad banner ${ad.active ? "deactivated" : "activated"} successfully`,
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
    if (!confirm("Are you sure you want to delete this ad banner?")) return;

    try {
      const { error } = await supabase.from("ads_banners").delete().eq("id", ad.id);

      if (error) throw error;

      // Log the admin action
      await supabase.rpc("log_admin_action", {
        p_action: "delete_ad_banner",
        p_resource_type: "ads_banners",
        p_resource_id: ad.id,
        p_old_values: JSON.parse(JSON.stringify(ad)),
      });

      toast({
        title: "Success",
        description: "Ad banner deleted successfully",
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

  const getStatusColor = (active: boolean | null) => {
    return active ? "default" : "secondary";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const isAdActive = (ad: AdBanner) => {
    if (!ad.active) return false;
    const now = new Date();
    const startDate = ad.start_date ? new Date(ad.start_date) : null;
    const endDate = ad.end_date ? new Date(ad.end_date) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return true;
  };

  const getCTR = (impressions: number | null, clicks: number | null) => {
    if (!impressions || impressions === 0) return "0%";
    const ctr = ((clicks || 0) / impressions) * 100;
    return `${ctr.toFixed(2)}%`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading ad banners...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Ads & CMS Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage banners, carousels, and promotional content across the platform
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
                  {editingAd ? "Edit Ad Banner" : "Create New Ad Banner"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Banner Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Summer Trading Promotion"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL</Label>
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
                  <Label htmlFor="link_url">Click-through URL (optional)</Label>
                  <Input
                    id="link_url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://example.com/promotion"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_audience">Target Audience</Label>
                    <Select
                      value={formData.target_audience}
                      onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="new">New Users</SelectItem>
                        <SelectItem value="premium">Premium Users</SelectItem>
                        <SelectItem value="traders">Active Traders</SelectItem>
                        <SelectItem value="stakers">Stakers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                        <SelectItem value="hero">Hero Banner</SelectItem>
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                        <SelectItem value="footer">Footer</SelectItem>
                        <SelectItem value="popup">Popup Modal</SelectItem>
                        <SelectItem value="carousel">Carousel</SelectItem>
                        <SelectItem value="inline">Inline Content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date (optional)</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date (optional)</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Active</Label>
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
            <p className="text-muted-foreground">No ad banners found. Create your first banner to get started.</p>
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
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<ImageIcon class="h-6 w-6 text-gray-400" />';
                            }
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{ad.title}</h3>
                        <Badge variant={getStatusColor(ad.active)}>
                          {ad.active ? "Active" : "Inactive"}
                        </Badge>
                        {isAdActive(ad) && (
                          <Badge variant="default" className="bg-green-500">
                            Live
                          </Badge>
                        )}
                        <Badge variant="outline">{ad.placement}</Badge>
                        <Badge variant="outline">{ad.target_audience}</Badge>
                      </div>
                      {ad.link_url && (
                        <div className="flex items-center gap-1 text-sm text-blue-600">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate max-w-64">{ad.link_url}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ad.active ?? false}
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-muted-foreground">Impressions</p>
                      <p className="font-semibold">{(ad.impressions || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-muted-foreground">Clicks</p>
                      <p className="font-semibold">{(ad.clicks || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-muted-foreground">CTR</p>
                      <p className="font-semibold">{getCTR(ad.impressions, ad.clicks)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-muted-foreground">Schedule</p>
                      <p className="font-semibold text-xs">
                        {formatDate(ad.start_date)} - {formatDate(ad.end_date)}
                      </p>
                    </div>
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