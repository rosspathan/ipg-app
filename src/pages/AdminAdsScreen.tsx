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
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface AdData {
  id?: string;
  title: string;
  image_url: string;
  square_image_url?: string;
  target_url: string;
  reward_bsk: number;
  required_view_time: number;
  placement: string;
  status: string;
  start_at?: string;
  end_at?: string;
  max_impressions_per_user_per_day: number;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ads');
  const { toast } = useToast();

  const [formData, setFormData] = useState<AdData>({
    title: '',
    image_url: '',
    square_image_url: '',
    target_url: '',
    reward_bsk: 1,
    required_view_time: 10,
    placement: 'home_top',
    status: 'draft',
    max_impressions_per_user_per_day: 0
  });

  useEffect(() => {
    loadAds();
    loadSubscriptionTiers();
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
        .from('subscription_tiers')
        .select('*')
        .order('daily_rewarded_clicks');

      if (error) throw error;
      setSubscriptionTiers(data || []);
    } catch (error) {
      console.error('Error loading subscription tiers:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image_url: '',
      square_image_url: '',
      target_url: '',
      reward_bsk: 1,
      required_view_time: 10,
      placement: 'home_top',
      status: 'draft',
      max_impressions_per_user_per_day: 0
    });
    setEditingAd(null);
  };

  const handleEdit = (ad: AdData & { id: string }) => {
    setFormData(ad);
    setEditingAd(ad);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingAd) {
        const { error } = await supabase
          .from('ads')
          .update(formData)
          .eq('id', editingAd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ads')
          .insert(formData);
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

  const updateTier = async (tierId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('subscription_tiers')
        .update(updates)
        .eq('id', tierId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription tier updated"
      });

      loadSubscriptionTiers();
    } catch (error) {
      console.error('Error updating tier:', error);
      toast({
        title: "Error",
        description: "Failed to update tier",
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Banner Image URL (16:9)</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Square Image URL (1:1)</Label>
                  <Input
                    value={formData.square_image_url || ''}
                    onChange={(e) => setFormData({...formData, square_image_url: e.target.value})}
                    placeholder="https://... (optional)"
                  />
                </div>
              </div>

              <div>
                <Label>Target URL</Label>
                <Input
                  value={formData.target_url}
                  onChange={(e) => setFormData({...formData, target_url: e.target.value})}
                  placeholder="https://..."
                />
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
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingAd ? 'Update' : 'Create'} Ad
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ads">Ads Management</TabsTrigger>
          <TabsTrigger value="tiers">Subscription Tiers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Subscription Tier Controls</h3>
            <div className="space-y-4">
              {subscriptionTiers.map((tier) => (
                <div key={tier.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium capitalize">{tier.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Daily rewarded clicks: {tier.daily_rewarded_clicks}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Daily Clicks:</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={tier.daily_rewarded_clicks}
                        onChange={(e) => updateTier(tier.id, { 
                          daily_rewarded_clicks: parseInt(e.target.value) 
                        })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Cooldown (s):</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={tier.cooldown_seconds}
                        onChange={(e) => updateTier(tier.id, { 
                          cooldown_seconds: parseInt(e.target.value) 
                        })}
                      />
                    </div>
                    <Switch
                      checked={tier.is_active}
                      onCheckedChange={(checked) => updateTier(tier.id, { is_active: checked })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
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