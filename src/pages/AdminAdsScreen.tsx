import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaUploader } from '@/components/admin/MediaUploader';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Eye, 
  MousePointer, 
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  Settings,
  Upload,
  X,
  Image as ImageIcon,
  Video as VideoIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface AdData {
  id?: string;
  title: string;
  image_url: string;
  square_image_url?: string;
  target_url: string | null;
  reward_bsk: number;
  required_view_time: number;
  placement: string;
  status: string;
  start_at?: string;
  end_at?: string;
  max_impressions_per_user_per_day: number;
  media_type?: string;
}

interface AdStats {
  impressions: number;
  clicks: number;
  rewarded_clicks: number;
  total_bsk_paid: number;
}

export const AdminAdsScreen: React.FC = () => {
  const [ads, setAds] = useState<(AdData & { id: string; stats?: AdStats })[]>([]);
  const [subscriptionTiers, setSubscriptionTiers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdData | null>(null);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ads');
  const { toast } = useToast();

  const [formData, setFormData] = useState<AdData>({
    title: '',
    image_url: '',
    square_image_url: '',
    target_url: null,
    reward_bsk: 1,
    required_view_time: 10,
    placement: 'home_top',
    status: 'draft',
    max_impressions_per_user_per_day: 0,
    media_type: 'image'
  });

  // File upload states
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [squareFile, setSquareFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [squarePreview, setSquarePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);

  useEffect(() => {
    loadAds();
    loadSubscriptionTiers();
    loadSettings();
  }, []);

  const loadAds = async () => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load stats for each ad
      const adsWithStats = await Promise.all(
        (data || []).map(async (ad) => {
          const stats = await loadAdStats(ad.id);
          return { ...ad, stats };
        })
      );

      setAds(adsWithStats);
    } catch (error) {
      console.error('Error loading ads:', error);
      toast({
        title: "Error",
        description: "Failed to load ads",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const loadAdStats = async (adId: string): Promise<AdStats> => {
    try {
      const [impressionsRes, clicksRes, rewardedClicksRes, totalBskRes] = await Promise.all([
        supabase.from('ad_impressions').select('id').eq('ad_id', adId),
        supabase.from('ad_clicks').select('id').eq('ad_id', adId),
        supabase.from('ad_clicks').select('id').eq('ad_id', adId).eq('rewarded', true),
        supabase.from('ad_clicks').select('reward_bsk').eq('ad_id', adId).eq('rewarded', true)
      ]);

      const totalBsk = totalBskRes.data?.reduce((sum, click) => sum + Number(click.reward_bsk), 0) || 0;

      return {
        impressions: impressionsRes.data?.length || 0,
        clicks: clicksRes.data?.length || 0,
        rewarded_clicks: rewardedClicksRes.data?.length || 0,
        total_bsk_paid: totalBsk
      };
    } catch (error) {
      console.error('Error loading ad stats:', error);
      return { impressions: 0, clicks: 0, rewarded_clicks: 0, total_bsk_paid: 0 };
    }
  };

  const loadSubscriptionTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_subscription_tiers')
        .select('*')
        .order('tier_bsk', { ascending: true });

      if (error) throw error;
      setSubscriptionTiers(data || []);
    } catch (error) {
      console.error('Error loading subscription tiers:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_mining_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        // Create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('ad_mining_settings')
          .insert({
            free_daily_enabled: true,
            free_daily_reward_bsk: 1,
            bsk_inr_rate: 1.0,
            allow_multiple_subscriptions: false,
            max_free_per_day: 1
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image_url: '',
      square_image_url: '',
      target_url: null,
      reward_bsk: 1,
      required_view_time: 10,
      placement: 'home_top',
      status: 'draft',
      max_impressions_per_user_per_day: 0,
      media_type: 'image'
    });
    setEditingAd(null);
    setBannerFile(null);
    setSquareFile(null);
    setBannerPreview('');
    setSquarePreview('');
    setUploadProgress(0);
    setDetectedDuration(null);
  };

  const handleEdit = (ad: AdData & { id: string }) => {
    setFormData(ad);
    setEditingAd(ad);
    // Set preview URLs for existing media
    if (ad.image_url) {
      if (ad.image_url.startsWith('http')) {
        setBannerPreview(ad.image_url);
      } else {
        supabase.storage.from('ad-media').createSignedUrl(ad.image_url, 3600)
          .then(({ data }) => { if (data?.signedUrl) setBannerPreview(data.signedUrl); });
      }
    }
    if (ad.square_image_url) {
      if (ad.square_image_url.startsWith('http')) {
        setSquarePreview(ad.square_image_url);
      } else {
        supabase.storage.from('ad-media').createSignedUrl(ad.square_image_url, 3600)
          .then(({ data }) => { if (data?.signedUrl) setSquarePreview(data.signedUrl); });
      }
    }
    setDialogOpen(true);
  };

  const uploadFile = async (file: File, path: string, onProgress?: (progress: number) => void): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      // Standard upload (bucket is now private)
      supabase.storage
      
      // Fall back to standard upload (Supabase SDK doesn't support progress)
      supabase.storage
        .from('ad-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
        .then(({ error }) => {
          if (error) reject(error);
          else {
            onProgress?.(100);
            resolve(filePath);
          }
        });
      
      // Simulate progress for UX (Supabase SDK limitation)
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress < 90) {
          onProgress?.(Math.min(progress, 90));
        }
      }, 200);
      
      // Clear interval after upload completes
      setTimeout(() => clearInterval(interval), 10000);
    });
  };

  const handleBannerFileChange = (file: File) => {
    setBannerFile(file);
    setFormData({
      ...formData,
      media_type: file.type.startsWith('video/') ? 'video' : 'image'
    });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSquareFileChange = (file: File) => {
    setSquareFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setSquarePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDurationDetected = (duration: number) => {
    setDetectedDuration(duration);
    // Auto-suggest required view time based on video duration (rounded up)
    if (!formData.required_view_time || formData.required_view_time === 10) {
      setFormData(prev => ({
        ...prev,
        required_view_time: Math.min(Math.ceil(duration), 120) // Cap at 120 seconds
      }));
    }
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      setUploadProgress(0);
      
      let bannerPath = formData.image_url;
      let squarePath = formData.square_image_url;

      // Upload banner file if new file selected
      if (bannerFile) {
        bannerPath = await uploadFile(bannerFile, 'banners', (progress) => setUploadProgress(progress));
      }

      // Upload square file if new file selected
      if (squareFile) {
        squarePath = await uploadFile(squareFile, 'squares', (progress) => setUploadProgress(progress));
      }

      const adData = {
        ...formData,
        image_url: bannerPath,
        square_image_url: squarePath
      };

      if (editingAd) {
        const { error } = await supabase
          .from('ads')
          .update(adData)
          .eq('id', editingAd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ads')
          .insert(adData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Ad ${editingAd ? 'updated' : 'created'} successfully`
      });

      setDialogOpen(false);
      resetForm();
      loadAds();
    } catch (error) {
      console.error('Error saving ad:', error);
      toast({
        title: "Error",
        description: "Failed to save ad",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const toggleAdStatus = async (ad: AdData & { id: string }) => {
    const newStatus = ad.status === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await supabase
        .from('ads')
        .update({ status: newStatus })
        .eq('id', ad.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Ad ${newStatus === 'active' ? 'activated' : 'paused'}`
      });

      loadAds();
    } catch (error) {
      console.error('Error toggling ad status:', error);
      toast({
        title: "Error",
        description: "Failed to update ad status",
        variant: "destructive"
      });
    }
  };

  const deleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;

    try {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', adId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ad deleted successfully"
      });

      loadAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast({
        title: "Error",
        description: "Failed to delete ad",
        variant: "destructive"
      });
    }
  };

  const updateSettings = async (updates: any) => {
    try {
      if (!settings?.id) return;
      
      const { error } = await supabase
        .from('ad_mining_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings updated successfully"
      });

      loadSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    }
  };

  const saveTier = async (tierData: any) => {
    try {
      if (editingTier) {
        const { error } = await supabase
          .from('ad_subscription_tiers')
          .update(tierData)
          .eq('id', editingTier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ad_subscription_tiers')
          .insert(tierData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Tier ${editingTier ? 'updated' : 'created'} successfully`
      });

      setTierDialogOpen(false);
      setEditingTier(null);
      loadSubscriptionTiers();
    } catch (error) {
      console.error('Error saving tier:', error);
      toast({
        title: "Error",
        description: "Failed to save tier",
        variant: "destructive"
      });
    }
  };

  const deleteTier = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;

    try {
      const { error } = await supabase
        .from('ad_subscription_tiers')
        .delete()
        .eq('id', tierId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tier deleted successfully"
      });

      loadSubscriptionTiers();
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast({
        title: "Error",
        description: "Failed to delete tier",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getCTR = (stats?: AdStats) => {
    if (!stats || stats.impressions === 0) return '0%';
    return `${((stats.clicks / stats.impressions) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ad Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Ad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAd ? 'Edit Ad' : 'Create New Ad'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ad title"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MediaUploader
                  label="Banner Media (16:9)"
                  required
                  aspectRatio="16:9"
                  preview={bannerPreview}
                  mediaType={formData.media_type as 'image' | 'video'}
                  onFileSelect={handleBannerFileChange}
                  onRemove={() => {
                    setBannerFile(null);
                    setBannerPreview('');
                    setFormData({...formData, image_url: ''});
                    setDetectedDuration(null);
                  }}
                  onDurationDetected={handleDurationDetected}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                />
                <MediaUploader
                  label="Square Media (1:1)"
                  aspectRatio="1:1"
                  preview={squarePreview}
                  mediaType={formData.media_type as 'image' | 'video'}
                  onFileSelect={handleSquareFileChange}
                  onRemove={() => {
                    setSquareFile(null);
                    setSquarePreview('');
                    setFormData({...formData, square_image_url: ''});
                  }}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                />
              </div>

              {/* Duration hint for videos */}
              {detectedDuration && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Video duration: {Math.floor(detectedDuration / 60)}:{Math.floor(detectedDuration % 60).toString().padStart(2, '0')}
                  {formData.required_view_time && formData.required_view_time > detectedDuration && (
                    <span className="text-warning ml-2">⚠️ Required view time exceeds video duration</span>
                  )}
                </div>
              )}

              <div>
                <Label>Target URL (Optional)</Label>
                <Input
                  value={formData.target_url || ''}
                  onChange={(e) => setFormData({...formData, target_url: e.target.value || null})}
                  placeholder="https://... (leave empty for view-only ads)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for view-only ads where users watch to earn rewards without navigation
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Reward (BSK)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.reward_bsk}
                    onChange={(e) => setFormData({...formData, reward_bsk: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>View Time (seconds)</Label>
                  <Input
                    type="number"
                    value={formData.required_view_time}
                    onChange={(e) => setFormData({...formData, required_view_time: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Daily Impressions Limit</Label>
                  <Input
                    type="number"
                    value={formData.max_impressions_per_user_per_day}
                    onChange={(e) => setFormData({...formData, max_impressions_per_user_per_day: parseInt(e.target.value)})}
                    placeholder="0 = unlimited"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Placement</Label>
                  <Select value={formData.placement} onValueChange={(value) => setFormData({...formData, placement: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home_top">Home Top</SelectItem>
                      <SelectItem value="home_mid">Home Mid</SelectItem>
                      <SelectItem value="markets_top">Markets Top</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_at || ''}
                    onChange={(e) => setFormData({...formData, start_at: e.target.value})}
                  />
                </div>
                <div>
                  <Label>End Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_at || ''}
                    onChange={(e) => setFormData({...formData, end_at: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={uploading || !formData.title || !bannerPreview}>
                  {uploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading {uploadProgress > 0 ? `${uploadProgress}%` : '...'}
                    </>
                  ) : (
                    <>{editingAd ? 'Update' : 'Create'} Ad</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-4">
          <TabsTrigger value="ads" className="text-xs md:text-sm">Ads</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs md:text-sm">Settings</TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs md:text-sm">Tiers</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs md:text-sm">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-4">
          {ads.map((ad) => (
            <Card key={ad.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(ad.status)}`} />
                  <div>
                    <h3 className="font-semibold text-lg">{ad.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>Placement: {ad.placement}</span>
                      <span>Reward: {ad.reward_bsk} BSK</span>
                      <span>View Time: {ad.required_view_time}s</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>
                    {ad.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAdStatus(ad)}
                  >
                    {ad.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(ad)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAd(ad.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {ad.stats && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Impressions</span>
                    </div>
                    <div className="text-lg font-semibold">{ad.stats.impressions}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <MousePointer className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clicks</span>
                    </div>
                    <div className="text-lg font-semibold">{ad.stats.clicks}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">CTR</span>
                    </div>
                    <div className="text-lg font-semibold">{getCTR(ad.stats)}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">BSK Paid</span>
                    </div>
                    <div className="text-lg font-semibold">{ad.stats.total_bsk_paid}</div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Subscription Tiers</h3>
              <p className="text-sm text-muted-foreground">Configure BSK subscription packages (100-10000 BSK)</p>
            </div>
            <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTier(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTier ? 'Edit' : 'Create'} Subscription Tier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Subscription Amount (BSK)</Label>
                    <Input
                      type="number"
                      min="100"
                      max="10000"
                      step="100"
                      defaultValue={editingTier?.tier_bsk || 100}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        const daily = value / 100; // Linear: amount / 100 days
                        setEditingTier({ ...editingTier, tier_bsk: value, daily_bsk: daily, duration_days: 100 });
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Min: 100 BSK, Max: 10,000 BSK</p>
                  </div>
                  <div>
                    <Label>Duration (Days)</Label>
                    <Input
                      type="number"
                      defaultValue={editingTier?.duration_days || 100}
                      onChange={(e) => setEditingTier({ ...editingTier, duration_days: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Daily BSK Reward (Withdrawable)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingTier?.daily_bsk || (editingTier?.tier_bsk / 100 || 1)}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Auto-calculated: Amount ÷ Duration</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch
                      checked={editingTier?.is_active ?? true}
                      onCheckedChange={(checked) => setEditingTier({ ...editingTier, is_active: checked })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setTierDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => saveTier(editingTier)}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {subscriptionTiers.map((tier) => (
              <Card key={tier.id} className="p-4">
                  <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{tier.tier_bsk} BSK Subscription</h4>
                      <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Daily Reward:</span>
                        <span className="ml-1 font-medium">{tier.daily_bsk} BSK</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="ml-1 font-medium">{tier.duration_days} days</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <span className="ml-1 font-medium">{tier.daily_bsk * tier.duration_days} BSK</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTier(tier);
                        setTierDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTier(tier.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Analytics Dashboard</h3>
            <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};