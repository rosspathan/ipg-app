import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Award, Plus, Edit, Trash2, Users, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface BadgeThreshold {
  id: string;
  badge_name: string;
  bsk_threshold: number;
  unlock_levels: number;
  bonus_bsk_holding: number;
  description: string | null;
  is_active: boolean;
}

export default function AdminBadgeSystem() {
  const queryClient = useQueryClient();
  const [editingBadge, setEditingBadge] = useState<BadgeThreshold | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    badge_name: '',
    bsk_threshold: '',
    unlock_levels: '',
    bonus_bsk_holding: '',
    description: '',
    is_active: true,
  });

  // Fetch badge thresholds
  const { data: badges, isLoading } = useQuery({
    queryKey: ['admin-badge-thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_thresholds')
        .select('*')
        .order('bsk_threshold', { ascending: true });
      if (error) throw error;
      return data as BadgeThreshold[];
    },
  });

  // Fetch badge statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-badge-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badge_holdings')
        .select('current_badge');
      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((holding: any) => {
        const badge = holding.current_badge || 'NONE';
        counts[badge] = (counts[badge] || 0) + 1;
      });

      return counts;
    },
  });

  // Create/Update badge mutation
  const saveBadgeMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        badge_name: data.badge_name.toUpperCase(),
        bsk_threshold: parseFloat(data.bsk_threshold),
        unlock_levels: parseInt(data.unlock_levels),
        bonus_bsk_holding: parseFloat(data.bonus_bsk_holding),
        description: data.description || null,
        is_active: data.is_active,
      };

      if (data.id) {
        const { error } = await supabase
          .from('badge_thresholds')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('badge_thresholds')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-badge-thresholds'] });
      toast.success(editingBadge ? 'Badge updated' : 'Badge created');
      setShowCreateDialog(false);
      setEditingBadge(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save badge');
    },
  });

  // Delete badge mutation
  const deleteBadgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('badge_thresholds')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-badge-thresholds'] });
      toast.success('Badge deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete badge');
    },
  });

  const resetForm = () => {
    setFormData({
      badge_name: '',
      bsk_threshold: '',
      unlock_levels: '',
      bonus_bsk_holding: '',
      description: '',
      is_active: true,
    });
  };

  const handleEdit = (badge: BadgeThreshold) => {
    setEditingBadge(badge);
    setFormData({
      badge_name: badge.badge_name,
      bsk_threshold: badge.bsk_threshold.toString(),
      unlock_levels: badge.unlock_levels.toString(),
      bonus_bsk_holding: badge.bonus_bsk_holding.toString(),
      description: badge.description || '',
      is_active: badge.is_active,
    });
    setShowCreateDialog(true);
  };

  const handleSave = () => {
    if (editingBadge) {
      saveBadgeMutation.mutate({ ...formData, id: editingBadge.id });
    } else {
      saveBadgeMutation.mutate(formData);
    }
  };

  const totalUsers = stats ? Object.values(stats).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Badge System Management</h1>
        <p className="text-muted-foreground">
          Configure badge tiers, thresholds, and rewards
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalUsers}</span>
            </div>
          </CardContent>
        </Card>
        {badges?.slice(0, 3).map((badge) => (
          <Card key={badge.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {badge.badge_name} Holders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {stats?.[badge.badge_name] || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Badge Thresholds */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Badge Tiers</CardTitle>
              <CardDescription>
                Manage badge requirements and benefits
              </CardDescription>
            </div>
            <Button onClick={() => {
              resetForm();
              setEditingBadge(null);
              setShowCreateDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Badge
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Badge Name</TableHead>
                  <TableHead>BSK Threshold</TableHead>
                  <TableHead>Unlock Levels</TableHead>
                  <TableHead>Bonus BSK</TableHead>
                  <TableHead>Holders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {badges?.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        {badge.badge_name}
                      </div>
                    </TableCell>
                    <TableCell>{badge.bsk_threshold} BSK</TableCell>
                    <TableCell>{badge.unlock_levels} levels</TableCell>
                    <TableCell>{badge.bonus_bsk_holding} BSK</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {stats?.[badge.badge_name] || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.is_active ? 'default' : 'secondary'}>
                        {badge.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(badge)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this badge?')) {
                              deleteBadgeMutation.mutate(badge.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBadge ? 'Edit Badge' : 'Create New Badge'}
            </DialogTitle>
            <DialogDescription>
              Configure the badge tier settings and requirements
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Badge Name</Label>
                <Input
                  placeholder="e.g., PLATINUM"
                  value={formData.badge_name}
                  onChange={(e) =>
                    setFormData({ ...formData, badge_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>BSK Threshold</Label>
                <Input
                  type="number"
                  placeholder="e.g., 10000"
                  value={formData.bsk_threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, bsk_threshold: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unlock Levels</Label>
                <Input
                  type="number"
                  placeholder="e.g., 15"
                  value={formData.unlock_levels}
                  onChange={(e) =>
                    setFormData({ ...formData, unlock_levels: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Bonus BSK (Holding)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={formData.bonus_bsk_holding}
                  onChange={(e) =>
                    setFormData({ ...formData, bonus_bsk_holding: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Badge description and benefits..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.badge_name ||
                !formData.bsk_threshold ||
                !formData.unlock_levels ||
                saveBadgeMutation.isPending
              }
            >
              {saveBadgeMutation.isPending
                ? 'Saving...'
                : editingBadge
                ? 'Update Badge'
                : 'Create Badge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
